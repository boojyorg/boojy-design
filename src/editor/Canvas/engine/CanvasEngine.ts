import Konva from "konva"
import {
  compositeOp,
  hardnessStops,
  interpolateStamps,
  snapTo45,
  stampSpacing,
  strokeAlpha,
} from "@/editor/Canvas/engine/brush"
import { hexToRgb, rgbaToHex } from "@/editor/Canvas/engine/color"
import { drawImageContain } from "@/editor/Canvas/engine/draw"
import { floodFill } from "@/editor/Canvas/engine/fill"
import { flattenLayers } from "@/editor/Canvas/engine/flatten"
import { drawEllipse, drawRect, normalizeRect } from "@/editor/Canvas/engine/shape"
import { type Bounds, contentBounds } from "@/editor/Canvas/engine/thumbnail"
import {
  apply,
  boxCorners,
  flipHorizontal,
  flipVertical,
  HANDLES,
  IDENTITY,
  invert,
  resize,
  resizeCursor,
  rotateAbout,
  type Transform,
  translateBy,
} from "@/editor/Canvas/engine/transform"
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

/** A committed stroke handed up to the unified timeline: the affected layer's full
 *  pixels before and after the stroke. The engine no longer owns undo ordering. */
export interface StrokeCommit {
  layerId: string
  before: HTMLCanvasElement
  after: HTMLCanvasElement
}

/** A committed transform handed up to the timeline: a layer's transform before and after.
 *  Cheap (no pixel clone) — move/scale/rotate are non-destructive, so only the transform changes. */
export interface MoveCommit {
  layerId: string
  before: Transform
  after: Transform
}

/** Which free-transform gesture a Move drag is performing. `scale` carries the handle index
 *  (0–7, clockwise from Top); `rotate` carries the fixed centre in doc space. */
type Gesture =
  | { kind: "move" }
  | { kind: "scale"; index: number }
  | { kind: "rotate"; centre: Point }

const DEFAULT_BRUSH: BrushParams = {
  tool: "brush",
  color: "#000000",
  size: 30,
  opacity: 100,
  hardness: 80,
}

// Selection-overlay constants, in *screen* pixels. The accent is hardcoded because Konva draws
// to canvas and can't use the Tailwind `--color-accent` token; keep it in sync with the theme.
const SELECT_ACCENT = "#E89940"
const HANDLE_SIZE = 9
const HANDLE_HIT = 11
const ROTATE_GRIP_DIST = 22

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
  // Pan offset in screen-space pixels, added on top of the centred view (set via setView).
  private panX = 0
  private panY = 0
  // Last layer list handed to syncLayers — authoritative order/visibility/opacity for export.
  private layers: Layer[] = []
  // The engine captures full-layer before/after snapshots per stroke and emits them; the
  // unified undo timeline (undoStore) owns ordering. Dirty-rect capture would shrink each
  // snapshot but adds hot-path bounds-tracking — deferred.
  private onStrokeCommitted?: (commit: StrokeCommit) => void
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
  // The press point of a brush/eraser stroke in buffer-local space. Anchors the Shift
  // straight-line: while Shift is held the stroke is redrawn as a line from here to the cursor.
  private strokeOrigin: Point | null = null
  private carryOver = 0
  // Shape tool: the drag origin in buffer-local space. Non-null only mid shape-drag.
  private shapeStart: Point | null = null
  // Per-layer non-destructive transform (move + uniform scale + rotation, in doc space). Lives
  // here in the engine — NOT on the thin Layer model — so it never touches pixels. Entries persist
  // past a node's destruction so undo-delete restores the transform (syncLayers re-applies).
  private readonly transforms = new Map<string, Transform>()
  // Active Move drag: the gesture, the doc-space point where it began, and the layer's transform
  // at that moment (gestures are computed from this start so re-dragging never compounds).
  private gesture: Gesture | null = null
  private moveStart: Point | null = null
  private moveStartTransform: Transform = IDENTITY
  private onMoveCommitted?: (commit: MoveCommit) => void
  // Screen-space overlay (selection box + handles), drawn while the Move tool is active.
  private overlay: Konva.Layer | null = null
  // Cached content bounds for the active layer (the getImageData scan is too costly to redo per
  // pointer-move). Invalidated whenever the active layer's pixels change or the layer set changes.
  private contentBoxCache: { layerId: string; box: Bounds | null } | null = null
  // Fired after any op that changes a layer's *buffer* pixels (stroke/shape/fill/import/restore) so
  // React can refresh that layer's thumbnail. NOT fired on move — a move only shifts the display
  // offset, and thumbnails show buffer content, so the pixels are unchanged.
  private onLayerPixelsChanged?: (layerId: string) => void
  // Latest Shift state for the shape constraint — updated by pointer moves *and* by
  // raw Shift key events, so the preview tracks Shift even while the pointer is still.
  private shiftDown = false

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
    // Clip the content to the page bounds (doc space) so a layer dragged off the edge hides
    // at the page border rather than spilling over the work area — its pixels stay in the buffer.
    this.layer = new Konva.Layer({
      listening: false,
      clip: { x: 0, y: 0, width: DOC_WIDTH, height: DOC_HEIGHT },
    })
    this.stage.add(this.layer)

    this.page = new Konva.Rect({
      x: 0,
      y: 0,
      width: DOC_WIDTH,
      height: DOC_HEIGHT,
      fill: PAGE_BACKGROUND,
    })
    this.layer.add(this.page)

    // Selection overlay: a screen-space layer (NOT view-scaled) so handles stay a constant size
    // regardless of zoom. Visual only — pointer events still route through React → the engine.
    this.overlay = new Konva.Layer({ listening: false })
    this.stage.add(this.overlay)

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
    this.overlay = null
    this.container = null
    this.nodes.clear()
    this.strokeCanvas = null
    this.strokeCtx = null
    this.snapshotCanvas = null
    this.snapshotCtx = null
    this.target = null
    this.lastPoint = null
  }

  setBrush(brush: BrushParams) {
    this.brush = brush
    this.renderOverlay() // show/hide the selection overlay as the active tool changes
  }

  /** Set the full view (zoom % + pan offset). Pan is screen-space pixels over the centred view. */
  setView(zoom: number, panX: number, panY: number) {
    this.zoom = zoom
    this.panX = panX
    this.panY = panY
    this.applyView()
  }

  /** Mirror the reducer's layer list into Konva: create/destroy buffers, set z-order,
   *  visibility and opacity. Layers[0] is top of the stack. */
  syncLayers(layers: Layer[], activeLayerId: string) {
    this.activeLayerId = activeLayerId
    this.layers = layers
    this.invalidateContentBox() // active layer / pixels may have changed
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
        // Seed a fresh background layer with the opaque paper colour. On *open* the layers
        // effect runs restorePixels right after this sync, overwriting the seed with the
        // saved pixels; on a *new* document there's no restore, so the white persists. Only
        // fires on creation — re-syncs hit the `node` branch, so painting is never cleared.
        if (layer.background) {
          created.ctx.fillStyle = PAGE_BACKGROUND
          created.ctx.fillRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
        }
      }
      node.image.visible(layer.visible)
      node.image.opacity(layer.opacity / 100)
      // Re-apply the layer's transform (defaults to identity) — keeps a moved/scaled/rotated layer
      // in place across reorders and restores it when undo-delete resurrects the node.
      this.applyTransformToNode(node, this.getLayerTransform(layer.id))
    }

    for (const [id, node] of this.nodes) {
      if (!seen.has(id)) {
        node.image.destroy()
        this.nodes.delete(id)
        // No history pruning: the unified timeline is linear, so a deleted layer's
        // older stroke commands can only be reached after its delete is undone — which
        // resurrects the node first (delete-undo restores the layer + its pixels).
      }
    }

    // Restack: bottom-of-stack (end of array) up to top-of-stack (index 0), page beneath.
    for (const layer of [...layers].reverse()) {
      this.nodes.get(layer.id)?.image.moveToTop()
    }
    this.page?.moveToBottom()
    this.layer.batchDraw()
    this.renderOverlay()
  }

  beginStroke(clientX: number, clientY: number) {
    if (!this.stage) return
    if (
      this.brush.tool !== "brush" &&
      this.brush.tool !== "eraser" &&
      this.brush.tool !== "shape" &&
      this.brush.tool !== "select"
    )
      return

    const target = this.nodes.get(this.activeLayerId)
    if (!target?.image.visible()) return
    if (!this.ensureBuffers() || !this.strokeCtx || !this.snapshotCtx) return

    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    this.target = target
    this.strokeLayerId = this.activeLayerId

    if (this.brush.tool === "select") {
      // Free transform: a handle picks scale/rotate, inside the box moves, outside is a no-op.
      // All non-destructive — only the layer's transform changes, never its pixels.
      const gesture = this.hitTest(point)
      if (!gesture) {
        this.target = null
        return
      }
      this.moveStart = point
      this.moveStartTransform = this.getLayerTransform(this.activeLayerId)
      this.gesture = gesture
      this.setDragCursor(gesture)
      return
    }

    // Paint tools work in buffer-local space (the inverse of the layer's transform), so a stroke
    // lands under the cursor on a moved/scaled/rotated layer without changing the rest of the path.
    const local = invert(this.getLayerTransform(this.activeLayerId), point)
    this.snapshotCtx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    this.snapshotCtx.drawImage(target.canvas, 0, 0)
    this.strokeCtx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    this.carryOver = 0
    this.lastPoint = local
    this.strokeOrigin = local

    if (this.brush.tool === "shape") {
      // No preview until the first drag move — a zero-size shape draws nothing.
      this.shapeStart = local
      return
    }

    this.stampAt(local)
    this.render()
  }

  continueStroke(clientX: number, clientY: number, shiftKey = false) {
    if (!this.target) return
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    if (this.brush.tool === "select") {
      // Apply the active gesture from the drag-start transform — pixels untouched.
      if (!this.moveStart || !this.gesture) return
      const start = this.moveStartTransform
      let next: Transform
      if (this.gesture.kind === "scale") {
        const box = this.activeContentBox()
        if (!box) return
        // Corners are proportional unless Shift; edges are always single-axis (resize ignores it).
        next = resize(start, box, this.gesture.index, point, { proportional: !shiftKey })
      } else if (this.gesture.kind === "rotate") {
        next = rotateAbout(
          start,
          this.gesture.centre,
          this.moveStart,
          point,
          shiftKey ? 15 : undefined,
        )
      } else {
        next = translateBy(start, point.x - this.moveStart.x, point.y - this.moveStart.y)
      }
      this.setLayerTransform(this.strokeLayerId, next)
      return
    }

    if (!this.lastPoint) return
    const local = invert(this.getLayerTransform(this.strokeLayerId), point)

    if (this.brush.tool === "shape") {
      this.shiftDown = shiftKey
      this.lastPoint = local
      this.drawShapePreview()
      return
    }

    const spacing = stampSpacing(this.brush.size)

    if (shiftKey && this.strokeOrigin) {
      // Hold Shift: lock the stroke to a straight line from the press point to the cursor,
      // snapped to 45°. Redraw from scratch each move (like the shape preview) so the line
      // tracks the cursor; releasing Shift resumes freehand from here (lastPoint = cursor).
      const end = snapTo45(this.strokeOrigin, local)
      this.strokeCtx?.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
      this.stampAt(this.strokeOrigin)
      const line = interpolateStamps(this.strokeOrigin, end, spacing, 0)
      for (const stamp of line.points) this.stampAt(stamp)
      this.carryOver = 0
      this.lastPoint = local
      this.render()
      return
    }

    const run = interpolateStamps(this.lastPoint, local, spacing, this.carryOver)
    for (const stamp of run.points) this.stampAt(stamp)
    this.carryOver = run.carryOver
    this.lastPoint = local
    this.render()
  }

  /** Toggle the Shift (square/circle) constraint mid-drag and re-render — lets the preview
   *  follow Shift even when the pointer is stationary (no pointer event fires then). No-ops
   *  unless a shape drag is in progress. */
  setShapeConstraint(shiftDown: boolean) {
    if (this.brush.tool !== "shape" || !this.shapeStart || shiftDown === this.shiftDown) return
    this.shiftDown = shiftDown
    this.drawShapePreview()
  }

  // Redraw the live shape from scratch: clear the stroke buffer, fill the rect/ellipse
  // (from shapeStart → lastPoint under the current Shift constraint), then composite
  // (snapshot + stroke-at-opacity) via render(). Clearing first means a solid shape never
  // double-darkens, same guarantee as the brush path.
  private drawShapePreview() {
    if (!this.shapeStart || !this.lastPoint || !this.strokeCtx) return
    const rect = normalizeRect(this.shapeStart, this.lastPoint, this.shiftDown)
    this.strokeCtx.clearRect(0, 0, DOC_WIDTH, DOC_HEIGHT)
    if (this.brush.shapeKind === "ellipse") drawEllipse(this.strokeCtx, rect, this.brush.color)
    else drawRect(this.strokeCtx, rect, this.brush.color)
    this.render()
  }

  /** A layer's non-destructive transform (identity if it's never been transformed). */
  getLayerTransform(layerId: string): Transform {
    return this.transforms.get(layerId) ?? IDENTITY
  }

  /** Set a layer's transform: store it, apply it to the Konva image, refresh the overlay. Public so
   *  the timeline (transform undo/redo), duplicate and document-open can replay it. */
  setLayerTransform(layerId: string, transform: Transform) {
    this.transforms.set(layerId, transform)
    const node = this.nodes.get(layerId)
    if (node) this.applyTransformToNode(node, transform)
    this.layer?.batchDraw()
    this.renderOverlay()
  }

  /** Drop all stored transforms (on opening a new document). */
  clearTransforms() {
    this.transforms.clear()
  }

  /** Nudge the active layer by (dx, dy) doc px and commit one undoable step (arrow-key path).
   *  Non-destructive — translates the transform; no-op on a hidden/missing layer. */
  nudgeActiveLayer(dx: number, dy: number) {
    if (!this.stage || (dx === 0 && dy === 0)) return
    const node = this.nodes.get(this.activeLayerId)
    if (!node?.image.visible()) return
    const before = this.getLayerTransform(this.activeLayerId)
    const after = translateBy(before, dx, dy)
    this.setLayerTransform(this.activeLayerId, after)
    this.onMoveCommitted?.({ layerId: this.activeLayerId, before, after })
  }

  /** Flip the active layer along the given axis and commit as one undoable step. */
  flipActiveLayer(axis: "h" | "v") {
    if (!this.stage) return
    const node = this.nodes.get(this.activeLayerId)
    if (!node?.image.visible()) return
    const before = this.getLayerTransform(this.activeLayerId)
    const after = axis === "h" ? flipHorizontal(before) : flipVertical(before)
    this.setLayerTransform(this.activeLayerId, after)
    this.onMoveCommitted?.({ layerId: this.activeLayerId, before, after })
  }

  endStroke() {
    const target = this.target
    if (!target) return

    if (this.brush.tool === "select") {
      // The image is already at its new transform. Commit only a real change; a click with no
      // drag (or a drag returned to start) leaves nothing on the timeline.
      const before = this.moveStartTransform
      const after = this.getLayerTransform(this.strokeLayerId)
      const changed =
        after.x !== before.x ||
        after.y !== before.y ||
        after.scaleX !== before.scaleX ||
        after.scaleY !== before.scaleY ||
        after.rotation !== before.rotation
      if (this.moveStart && changed) {
        this.onMoveCommitted?.({ layerId: this.strokeLayerId, before, after })
      }
      this.target = null
      this.moveStart = null
      this.gesture = null
      if (this.container) this.container.style.cursor = "default" // next hover re-sets it
      return
    }

    this.render() // bake the final state into the layer buffer

    // A shape click with no drag (zero width/height) paints nothing — skip the commit
    // so no empty no-op lands on the undo timeline.
    let emptyShape = false
    if (this.brush.tool === "shape") {
      if (!this.shapeStart || !this.lastPoint) emptyShape = true
      else {
        const r = normalizeRect(this.shapeStart, this.lastPoint, false)
        emptyShape = r.w === 0 || r.h === 0
      }
    }

    // Emit the stroke for the unified timeline: before = pre-stroke snapshot,
    // after = the baked result. undoStore decides where it sits in history.
    if (this.snapshotCanvas && !emptyShape) {
      this.onStrokeCommitted?.({
        layerId: this.strokeLayerId,
        before: this.cloneCanvas(this.snapshotCanvas),
        after: this.cloneCanvas(target.canvas),
      })
      this.notifyPixels(this.strokeLayerId)
    }

    this.target = null
    this.lastPoint = null
    this.strokeOrigin = null
    this.carryOver = 0
    this.shapeStart = null
    this.shiftDown = false
  }

  /** Subscribe to committed strokes (the timeline records each as an undoable command). */
  setOnStrokeCommitted(cb: (commit: StrokeCommit) => void) {
    this.onStrokeCommitted = cb
  }

  /** Subscribe to committed moves (the timeline records each offset change as undoable). */
  setOnMoveCommitted(cb: (commit: MoveCommit) => void) {
    this.onMoveCommitted = cb
  }

  /** Subscribe to per-layer pixel changes (the chrome refreshes that layer's thumbnail). */
  setOnLayerPixelsChanged(cb: (layerId: string) => void) {
    this.onLayerPixelsChanged = cb
  }

  /** Overwrite a layer's pixels with a snapshot (undo/redo restore). Public so the
   *  timeline's stroke and delete commands can replay pixel state. No-op if the layer
   *  has no node (e.g. before its delete-undo has recreated it). */
  restorePixels(layerId: string, snapshot: HTMLCanvasElement) {
    this.restore(layerId, snapshot)
    this.notifyPixels(layerId)
  }

  /** Clone a layer's current pixels into a detached canvas, or null if it has no node.
   *  Used to snapshot a layer before a destructive op (delete/duplicate). */
  captureLayerPixels(layerId: string): HTMLCanvasElement | null {
    const node = this.nodes.get(layerId)
    if (!node) return null
    return this.cloneCanvas(node.canvas)
  }

  /** A PNG data URL preview for the Layers panel — the layer's **content** (its non-transparent
   *  bounding box) scaled to fill the thumbnail, aspect-preserved. Null if the layer has no node,
   *  no 2D context, or is blank (so a blank/erased layer shows an empty box). Ignores the layer's
   *  move-offset — the preview is about *what's* on the layer, not where it sits on the page. */
  getLayerThumbnail(layerId: string, w: number, h: number): string | null {
    const node = this.nodes.get(layerId)
    if (!node) return null
    const bounds = contentBounds(
      node.ctx.getImageData(0, 0, DOC_WIDTH, DOC_HEIGHT).data,
      DOC_WIDTH,
      DOC_HEIGHT,
    )
    if (!bounds) return null // blank layer → no thumbnail

    const thumb = document.createElement("canvas")
    thumb.width = w
    thumb.height = h
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = thumb.getContext("2d")
    } catch {
      ctx = null
    }
    if (!ctx) return null

    // Fit the content box into the thumbnail (upscaling allowed, so a small mark reads large).
    const scale = Math.min(w / bounds.w, h / bounds.h)
    const dw = bounds.w * scale
    const dh = bounds.h * scale
    ctx.drawImage(
      node.canvas,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      (w - dw) / 2,
      (h - dh) / 2,
      dw,
      dh,
    )
    return thumb.toDataURL("image/png")
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

    flattenLayers(
      ctx,
      this.layers,
      (id) => this.nodes.get(id)?.canvas,
      {
        background,
        backgroundColor: PAGE_BACKGROUND,
        width: DOC_WIDTH,
        height: DOC_HEIGHT,
      },
      (id) => this.getLayerTransform(id),
    )

    out.toBlob((blob) => {
      if (blob) downloadBlob(blob, toExportFilename("Untitled"))
    }, "image/png")
  }

  /** Sample the visible composited colour under a screen point → "#RRGGBB", or null if the
   *  point is outside the page (or there's no 2D context, e.g. jsdom). Flattens the layer
   *  stack onto the white page exactly like exportPNG, so "what you click is what you get". */
  sampleColorAt(clientX: number, clientY: number): string | null {
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return null
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    if (x < 0 || y < 0 || x >= DOC_WIDTH || y >= DOC_HEIGHT) return null

    const out = document.createElement("canvas")
    out.width = DOC_WIDTH
    out.height = DOC_HEIGHT
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = out.getContext("2d")
    } catch {
      ctx = null
    }
    if (!ctx) return null

    flattenLayers(
      ctx,
      this.layers,
      (id) => this.nodes.get(id)?.canvas,
      {
        background: "white",
        backgroundColor: PAGE_BACKGROUND,
        width: DOC_WIDTH,
        height: DOC_HEIGHT,
      },
      (id) => this.getLayerTransform(id),
    )

    const d = ctx.getImageData(x, y, 1, 1).data
    return rgbaToHex(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0)
  }

  /** Flood-fill the active layer from a screen point with the foreground colour. Contiguous,
   *  active-layer-only, undoable via the same commit path as a stroke. No-op off-page or on a
   *  hidden layer. */
  fillAt(clientX: number, clientY: number) {
    if (!this.stage) return
    const target = this.nodes.get(this.activeLayerId)
    if (!target?.image.visible()) return
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return
    // Fill in the layer's buffer-local space (inverse transform); a click where a transformed
    // layer no longer covers (buffer coord out of bounds) is a no-op.
    const buf = invert(this.getLayerTransform(this.activeLayerId), point)
    const x = Math.floor(buf.x)
    const y = Math.floor(buf.y)
    if (x < 0 || y < 0 || x >= DOC_WIDTH || y >= DOC_HEIGHT) return

    const before = this.cloneCanvas(target.canvas)
    const image = target.ctx.getImageData(0, 0, DOC_WIDTH, DOC_HEIGHT)
    const threshold = Math.round(((this.brush.tolerance ?? 0) / 100) * 255)
    // Blend the fill under the soft (anti-aliased) edge so fills don't leave a fringe ring;
    // the 0<alpha<255 gate halts at the stroke core/exterior, so this is just a safety cap.
    floodFill(image.data, DOC_WIDTH, DOC_HEIGHT, x, y, hexToRgb(this.brush.color), threshold, 16)
    target.ctx.putImageData(image, 0, 0)
    this.layer?.batchDraw()

    this.onStrokeCommitted?.({
      layerId: this.activeLayerId,
      before,
      after: this.cloneCanvas(target.canvas),
    })
    this.notifyPixels(this.activeLayerId)
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
    this.notifyPixels(this.activeLayerId)
  }

  // ── internals ──────────────────────────────────────────────────────────────

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
    const view = computeView(width, height, DOC_WIDTH, DOC_HEIGHT, this.zoom, this.panX, this.panY)
    this.layer.scale({ x: view.scale, y: view.scale })
    this.layer.position({ x: view.x, y: view.y })
    this.layer.batchDraw()
    this.renderOverlay() // handles are screen-space — reposition them on zoom/resize
  }

  /** Map a screen-space pointer to document space using the current view transform. */
  private screenToDoc(clientX: number, clientY: number): Point | null {
    if (!this.container) return null
    const rect = this.container.getBoundingClientRect()
    const view = computeView(
      rect.width,
      rect.height,
      DOC_WIDTH,
      DOC_HEIGHT,
      this.zoom,
      this.panX,
      this.panY,
    )
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    }
  }

  // ── free-transform overlay + hit-testing ────────────────────────────────────

  /** Apply a transform to a Konva.Image: position + uniform scale + rotation (radians→degrees),
   *  pivoting about the buffer origin so it matches `apply()` in transform.ts. */
  private applyTransformToNode(node: RasterNode, t: Transform) {
    node.image.position({ x: t.x, y: t.y })
    node.image.scale({ x: t.scaleX, y: t.scaleY })
    node.image.rotation((t.rotation * 180) / Math.PI)
  }

  /** The current view transform (doc→stage scale & offset). */
  private view() {
    const rect = this.container?.getBoundingClientRect()
    return computeView(
      rect?.width ?? 1,
      rect?.height ?? 1,
      DOC_WIDTH,
      DOC_HEIGHT,
      this.zoom,
      this.panX,
      this.panY,
    )
  }

  /** Map a document point to stage/overlay (container-relative) pixels. */
  private docToScreen(d: Point): Point {
    const v = this.view()
    return { x: v.x + d.x * v.scale, y: v.y + d.y * v.scale }
  }

  /** Content bounds of the active layer's buffer (cached — the scan is too costly per move). */
  private activeContentBox(): Bounds | null {
    const id = this.activeLayerId
    if (this.contentBoxCache?.layerId === id) return this.contentBoxCache.box
    const node = this.nodes.get(id)
    const box = node
      ? contentBounds(
          node.ctx.getImageData(0, 0, DOC_WIDTH, DOC_HEIGHT).data,
          DOC_WIDTH,
          DOC_HEIGHT,
        )
      : null
    this.contentBoxCache = { layerId: id, box }
    return box
  }

  private invalidateContentBox() {
    this.contentBoxCache = null
  }

  /** A layer's buffer pixels changed: drop the cached content box and notify the chrome (thumbnail). */
  private notifyPixels(layerId: string) {
    this.invalidateContentBox()
    this.onLayerPixelsChanged?.(layerId)
  }

  /** Doc-space position of the rotate grip: above the box's top-edge centre, ROTATE_GRIP_DIST
   *  screen px out along the box's (rotated) up axis. */
  private gripDoc(box: Bounds, t: Transform): Point {
    const topCentre = apply(t, { x: box.x + box.w / 2, y: box.y })
    const up = { x: Math.sin(t.rotation), y: -Math.cos(t.rotation) } // box local −Y, rotated
    const d = ROTATE_GRIP_DIST / this.view().scale
    return { x: topCentre.x + up.x * d, y: topCentre.y + up.y * d }
  }

  /** Which gesture a doc-space press starts: the rotate grip, a scale handle (0–7), a move (inside
   *  the box) or null (outside). Grip first (it sits outside the box), then handles, then interior. */
  private hitTest(pressDoc: Point): Gesture | null {
    const box = this.activeContentBox()
    if (!box) return null
    const t = this.getLayerTransform(this.activeLayerId)
    const r = HANDLE_HIT / this.view().scale
    const near = (p: Point) => Math.hypot(pressDoc.x - p.x, pressDoc.y - p.y) <= r
    if (near(this.gripDoc(box, t))) {
      return { kind: "rotate", centre: apply(t, { x: box.x + box.w / 2, y: box.y + box.h / 2 }) }
    }
    for (let i = 0; i < HANDLES.length; i++) {
      const h = HANDLES[i]
      if (h && near(apply(t, h.point(box)))) return { kind: "scale", index: i }
    }
    const buf = invert(t, pressDoc) // inside the content box → move
    if (buf.x >= box.x && buf.x <= box.x + box.w && buf.y >= box.y && buf.y <= box.y + box.h) {
      return { kind: "move" }
    }
    return null
  }

  /** The CSS cursor for a gesture under the cursor — rotation-aware for resize handles. */
  private cursorFor(g: Gesture | null): string {
    if (!g) return "default"
    if (g.kind === "rotate") return "grab"
    if (g.kind === "move") return "move"
    const deg = (this.getLayerTransform(this.activeLayerId).rotation * 180) / Math.PI
    return resizeCursor(g.index, deg)
  }

  /** Update the container cursor on hover — only while Move is active and not mid-drag. */
  pointerHover(clientX: number, clientY: number) {
    if (!this.container || this.brush.tool !== "select" || this.moveStart) return
    const point = this.screenToDoc(clientX, clientY)
    this.container.style.cursor = this.cursorFor(point ? this.hitTest(point) : null)
  }

  /** Set the active cursor when a drag begins (rotate uses `grabbing`). */
  private setDragCursor(g: Gesture) {
    if (!this.container) return
    this.container.style.cursor = g.kind === "rotate" ? "grabbing" : this.cursorFor(g)
  }

  /** Redraw the selection box + handles. Shown only while Move is active over a visible layer with
   *  content; otherwise the overlay is cleared. Drawn in screen space so handles stay constant. */
  private renderOverlay() {
    const ov = this.overlay
    if (!ov) return
    ov.destroyChildren()
    const node = this.nodes.get(this.activeLayerId)
    const box =
      this.brush.tool === "select" && node?.image.visible() ? this.activeContentBox() : null
    if (!box) {
      ov.batchDraw()
      return
    }
    const t = this.getLayerTransform(this.activeLayerId)
    const corners = boxCorners(box).map((c) => this.docToScreen(apply(t, c)))
    ov.add(
      new Konva.Line({
        points: corners.flatMap((p) => [p.x, p.y]),
        closed: true,
        stroke: SELECT_ACCENT,
        strokeWidth: 1,
        listening: false,
      }),
    )
    const stemTop = this.docToScreen(apply(t, { x: box.x + box.w / 2, y: box.y }))
    const grip = this.docToScreen(this.gripDoc(box, t))
    ov.add(
      new Konva.Line({
        points: [stemTop.x, stemTop.y, grip.x, grip.y],
        stroke: SELECT_ACCENT,
        strokeWidth: 1,
        listening: false,
      }),
    )
    ov.add(
      new Konva.Circle({
        x: grip.x,
        y: grip.y,
        radius: HANDLE_SIZE / 2,
        fill: "#fff",
        stroke: SELECT_ACCENT,
        strokeWidth: 1,
        listening: false,
      }),
    )
    for (const h of HANDLES) {
      const p = this.docToScreen(apply(t, h.point(box)))
      ov.add(
        new Konva.Circle({
          x: p.x,
          y: p.y,
          radius: HANDLE_SIZE / 2,
          fill: "#fff",
          stroke: SELECT_ACCENT,
          strokeWidth: 1,
          listening: false,
        }),
      )
    }
    ov.batchDraw()
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
