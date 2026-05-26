import Konva from "konva"
import {
  compositeOp,
  hardnessStops,
  interpolateStamps,
  stampSpacing,
  strokeAlpha,
} from "@/editor/Canvas/engine/brush"
import { drawImageContain } from "@/editor/Canvas/engine/draw"
import { flattenLayers } from "@/editor/Canvas/engine/flatten"
import { HistoryStack } from "@/editor/Canvas/engine/history"
import {
  type BrushParams,
  DOC_HEIGHT,
  DOC_WIDTH,
  PAGE_BACKGROUND,
  type Point,
} from "@/editor/Canvas/engine/types"
import { computeView } from "@/editor/Canvas/engine/viewport"
import type { Layer } from "@/editor/types"
import { downloadBlob } from "@/lib/download"
import { toExportFilename } from "@/lib/filename"

/** One raster layer = a document-space pixel buffer shown through a Konva.Image. */
interface RasterNode {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  image: Konva.Image
}

/** One undoable stroke: the affected layer's full pixels before and after the stroke. */
interface HistoryEntry {
  layerId: string
  before: HTMLCanvasElement
  after: HTMLCanvasElement
}

const DEFAULT_BRUSH: BrushParams = {
  tool: "brush",
  color: "#000000",
  size: 30,
  opacity: 100,
  hardness: 80,
}

/**
 * The imperative canvas engine — lives behind the CanvasStage seam. Owns the Konva
 * Stage, one shared content layer (the naive single-composite path the spike proved),
 * and a pixel buffer per layer. Brush strokes paint straight to the active buffer and
 * `batchDraw`; React state is read on stroke start and never touched per pointer-move.
 *
 * Under jsdom there is no 2D context, so `mount` capability-guards and no-ops — the
 * host div still renders, keeping the shell tests green without a canvas mock.
 */
export class CanvasEngine {
  private stage: Konva.Stage | null = null
  private layer: Konva.Layer | null = null
  private page: Konva.Rect | null = null
  private container: HTMLDivElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private readonly nodes = new Map<string, RasterNode>()

  private brush: BrushParams = DEFAULT_BRUSH
  private activeLayerId = ""
  private zoom = 100
  // Last layer list handed to syncLayers — authoritative order/visibility/opacity for export.
  private layers: Layer[] = []
  // Undo/redo: full-layer before/after snapshots per committed stroke (strokes only).
  // Dirty-rect capture would shrink each entry but adds hot-path bounds-tracking — deferred.
  private readonly history = new HistoryStack<HistoryEntry>()
  private onHistoryChange?: (s: { canUndo: boolean; canRedo: boolean }) => void
  private strokeLayerId = ""

  // In-progress stroke. `strokeCanvas` accumulates stamps at full alpha; `snapshot`
  // holds the target layer as it was at stroke start. Each frame redraws
  // snapshot + stroke-at-opacity, so re-painting within one stroke never darkens
  // past the chosen opacity (and the eraser erases at a uniform strength).
  private strokeCanvas: HTMLCanvasElement | null = null
  private strokeCtx: CanvasRenderingContext2D | null = null
  private snapshotCanvas: HTMLCanvasElement | null = null
  private snapshotCtx: CanvasRenderingContext2D | null = null
  private target: RasterNode | null = null
  private lastPoint: Point | null = null
  private carryOver = 0

  mount(container: HTMLDivElement) {
    // Capability guard: jsdom's getContext returns null (or throws). Bail before
    // touching Konva so the shell tests run without a real canvas.
    let probe: CanvasRenderingContext2D | null = null
    try {
      probe = document.createElement("canvas").getContext("2d")
    } catch {
      probe = null
    }
    if (!probe) return

    this.container = container
    const width = container.clientWidth || 1
    const height = container.clientHeight || 1

    this.stage = new Konva.Stage({ container, width, height })
    this.layer = new Konva.Layer({ listening: false })
    this.stage.add(this.layer)

    this.page = new Konva.Rect({
      x: 0,
      y: 0,
      width: DOC_WIDTH,
      height: DOC_HEIGHT,
      fill: PAGE_BACKGROUND,
    })
    this.layer.add(this.page)

    this.applyView()

    this.resizeObserver = new ResizeObserver(() => this.applyView())
    this.resizeObserver.observe(container)
  }

  unmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.stage?.destroy()
    this.stage = null
    this.layer = null
    this.page = null
    this.container = null
    this.nodes.clear()
    this.history.clear()
    this.strokeCanvas = null
    this.strokeCtx = null
    this.snapshotCanvas = null
    this.snapshotCtx = null
    this.target = null
    this.lastPoint = null
  }

  setBrush(brush: BrushParams) {
    this.brush = brush
  }

  setZoom(zoom: number) {
    this.zoom = zoom
    this.applyView()
  }

  /** Mirror the reducer's layer list into Konva: create/destroy buffers, set z-order,
   *  visibility and opacity. Layers[0] is top of the stack. */
  syncLayers(layers: Layer[], activeLayerId: string) {
    this.activeLayerId = activeLayerId
    this.layers = layers
    if (!this.layer) return

    const seen = new Set<string>()
    for (const layer of layers) {
      seen.add(layer.id)
      let node = this.nodes.get(layer.id)
      if (!node) {
        const created = this.createNode()
        if (!created) continue
        node = created
        this.nodes.set(layer.id, created)
        this.layer.add(created.image)
      }
      node.image.visible(layer.visible)
      node.image.opacity(layer.opacity / 100)
    }

    let pruned = false
    for (const [id, node] of this.nodes) {
      if (!seen.has(id)) {
        node.image.destroy()
        this.nodes.delete(id)
        // Strokes-only undo can't resurrect a deleted layer — drop its history.
        this.history.prune((e) => e.layerId === id)
        pruned = true
      }
    }
    if (pruned) this.notifyHistory()

    // Restack: bottom-of-stack (end of array) up to top-of-stack (index 0), page beneath.
    for (const layer of [...layers].reverse()) {
      this.nodes.get(layer.id)?.image.moveToTop()
    }
    this.page?.moveToBottom()
    this.layer.batchDraw()
  }

  beginStroke(clientX: number, clientY: number) {
    if (!this.stage) return
    if (this.brush.tool !== "brush" && this.brush.tool !== "eraser") return

    const target = this.nodes.get(this.activeLayerId)
    if (!target?.image.visible()) return
    if (!this.ensureBuffers() || !this.strokeCtx || !this.snapshotCtx) return

    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    this.target = target
    this.strokeLayerId = this.activeLayerId
    this.snapshotCtx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    this.snapshotCtx.drawImage(target.canvas, 0, 0)
    this.strokeCtx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    this.carryOver = 0
    this.lastPoint = point

    this.stampAt(point)
    this.render()
  }

  continueStroke(clientX: number, clientY: number) {
    if (!this.target || !this.lastPoint) return
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    const spacing = stampSpacing(this.brush.size)
    const run = interpolateStamps(this.lastPoint, point, spacing, this.carryOver)
    for (const stamp of run.points) this.stampAt(stamp)
    this.carryOver = run.carryOver
    this.lastPoint = point
    this.render()
  }

  endStroke() {
    const target = this.target
    if (!target) return
    this.render() // bake the final state into the layer buffer

    // Record the stroke: before = pre-stroke snapshot, after = the baked result.
    if (this.snapshotCanvas) {
      this.history.push({
        layerId: this.strokeLayerId,
        before: this.cloneCanvas(this.snapshotCanvas),
        after: this.cloneCanvas(target.canvas),
      })
      this.notifyHistory()
    }

    this.target = null
    this.lastPoint = null
    this.carryOver = 0
  }

  /** Restore the layer to the previous stroke's "before" pixels. */
  undo() {
    const entry = this.history.undo()
    if (!entry) return
    this.restore(entry.layerId, entry.before)
    this.notifyHistory()
  }

  /** Re-apply the undone stroke's "after" pixels. */
  redo() {
    const entry = this.history.redo()
    if (!entry) return
    this.restore(entry.layerId, entry.after)
    this.notifyHistory()
  }

  /** Subscribe to undo/redo availability; fires immediately with the current state. */
  setOnHistoryChange(cb: (s: { canUndo: boolean; canRedo: boolean }) => void) {
    this.onHistoryChange = cb
    this.notifyHistory()
  }

  /**
   * Flatten the layer buffers into a PNG and download it. Composites the source
   * canvases directly (NOT a stage screenshot) so the export is true document-space
   * 1280×800 regardless of zoom/pan, honouring each layer's visibility, opacity and
   * stack order. `background: "white"` fills the page first; "transparent" leaves alpha.
   */
  exportPNG(opts?: { background?: "white" | "transparent" }) {
    const background = opts?.background ?? "white"
    const out = document.createElement("canvas")
    out.width = DOC_WIDTH
    out.height = DOC_HEIGHT
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = out.getContext("2d")
    } catch {
      ctx = null
    }
    if (!ctx) return

    flattenLayers(ctx, this.layers, (id) => this.nodes.get(id)?.canvas, {
      background,
      backgroundColor: PAGE_BACKGROUND,
      width: DOC_WIDTH,
      height: DOC_HEIGHT,
    })

    out.toBlob((blob) => {
      if (blob) downloadBlob(blob, toExportFilename("Untitled"))
    }, "image/png")
  }

  /** Draw a decoded image into the active layer, fit-centered. Pixels only — no history
   *  entry (import is a layer op, not on the strokes-only undo timeline). */
  drawImageToActiveLayer(source: CanvasImageSource, srcW: number, srcH: number) {
    const node = this.nodes.get(this.activeLayerId)
    if (!node) return
    node.ctx.globalCompositeOperation = "source-over"
    node.ctx.globalAlpha = 1
    drawImageContain(node.ctx, source, srcW, srcH, DOC_WIDTH, DOC_HEIGHT)
    this.layer?.batchDraw()
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private notifyHistory() {
    this.onHistoryChange?.({ canUndo: this.history.canUndo(), canRedo: this.history.canRedo() })
  }

  /** Overwrite a layer's pixels with a snapshot (undo/redo restore). */
  private restore(layerId: string, snapshot: HTMLCanvasElement) {
    const node = this.nodes.get(layerId)
    if (!node) return
    node.ctx.globalCompositeOperation = "source-over"
    node.ctx.globalAlpha = 1
    node.ctx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    node.ctx.drawImage(snapshot, 0, 0)
    this.layer?.batchDraw()
  }

  /** Copy a document-space canvas into a fresh one (for history snapshots). */
  private cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
    const copy = document.createElement("canvas")
    copy.width = DOC_WIDTH
    copy.height = DOC_HEIGHT
    copy.getContext("2d")?.drawImage(source, 0, 0)
    return copy
  }

  private createNode(): RasterNode | null {
    const canvas = document.createElement("canvas")
    canvas.width = DOC_WIDTH
    canvas.height = DOC_HEIGHT
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const image = new Konva.Image({
      image: canvas,
      x: 0,
      y: 0,
      width: DOC_WIDTH,
      height: DOC_HEIGHT,
    })
    return { canvas, ctx, image }
  }

  private ensureBuffers(): boolean {
    if (!this.strokeCanvas) {
      this.strokeCanvas = document.createElement("canvas")
      this.strokeCanvas.width = DOC_WIDTH
      this.strokeCanvas.height = DOC_HEIGHT
      this.strokeCtx = this.strokeCanvas.getContext("2d")
    }
    if (!this.snapshotCanvas) {
      this.snapshotCanvas = document.createElement("canvas")
      this.snapshotCanvas.width = DOC_WIDTH
      this.snapshotCanvas.height = DOC_HEIGHT
      this.snapshotCtx = this.snapshotCanvas.getContext("2d")
    }
    return this.strokeCtx !== null && this.snapshotCtx !== null
  }

  /** Paint one stamp into the stroke buffer at full alpha (centre→edge gradient). */
  private stampAt(point: Point) {
    const ctx = this.strokeCtx
    if (!ctx) return
    const radius = Math.max(0.5, this.brush.size / 2)
    const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
    for (const stop of hardnessStops(this.brush.hardness)) {
      grad.addColorStop(stop.offset, hexToRgba(this.brush.color, stop.alpha))
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  /** Redraw the target buffer = snapshot + (stroke composited once at stroke opacity). */
  private render() {
    const target = this.target
    if (!target || !this.snapshotCanvas || !this.strokeCanvas) return
    const tool = this.brush.tool === "eraser" ? "eraser" : "brush"
    const ctx = target.ctx

    ctx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    ctx.drawImage(this.snapshotCanvas, 0, 0)

    ctx.globalAlpha = strokeAlpha(this.brush.opacity)
    ctx.globalCompositeOperation = compositeOp(tool)
    ctx.drawImage(this.strokeCanvas, 0, 0)

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    this.layer?.batchDraw()
  }

  private applyView() {
    if (!this.stage || !this.layer || !this.container) return
    const width = this.container.clientWidth || 1
    const height = this.container.clientHeight || 1
    this.stage.size({ width, height })
    const view = computeView(width, height, DOC_WIDTH, DOC_HEIGHT, this.zoom)
    this.layer.scale({ x: view.scale, y: view.scale })
    this.layer.position({ x: view.x, y: view.y })
    this.layer.batchDraw()
  }

  /** Map a screen-space pointer to document space using the current view transform. */
  private screenToDoc(clientX: number, clientY: number): Point | null {
    if (!this.container) return null
    const rect = this.container.getBoundingClientRect()
    const view = computeView(rect.width, rect.height, DOC_WIDTH, DOC_HEIGHT, this.zoom)
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    }
  }
}

/** Expand a `#rrggbb` (or `#rgb`) hex to an `rgba()` string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
