import Konva from "konva"
import { interpolateStamps, snapTo45, stampSpacing } from "@/editor/Canvas/engine/brush"
import { hexToRgb, rgbaToHex } from "@/editor/Canvas/engine/color"
import { drawImageContain } from "@/editor/Canvas/engine/draw"
import { floodFill } from "@/editor/Canvas/engine/fill"
import { flattenLayers } from "@/editor/Canvas/engine/flatten"
import { clearRegion, copyRegion, flipRegion } from "@/editor/Canvas/engine/selection"
import { drawEllipse, drawRect, normalizeRect } from "@/editor/Canvas/engine/shape"
import { compositeStroke, stampInto } from "@/editor/Canvas/engine/stroke"
import { caretIndexAt, drawText, textContentBox } from "@/editor/Canvas/engine/text"
import { type Bounds, contentBounds } from "@/editor/Canvas/engine/thumbnail"
import {
  apply,
  type Box,
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

/** One text layer = a live Konva.Text node; content/style come from the Layer model. */
interface TextNode {
  text: Konva.Text
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
  private readonly textNodes = new Map<string, TextNode>()

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
  private onLayerAutoSelected?: (layerId: string) => void
  // Latest Shift state for the shape constraint — updated by pointer moves *and* by
  // raw Shift key events, so the preview tracks Shift even while the pointer is still.
  private shiftDown = false
  // Marquee selection: doc-space axis-aligned rect, drag origin, clipboard canvas.
  private selectionRect: Box | null = null
  private marqueeStart: Point | null = null
  private clipboard: HTMLCanvasElement | null = null
  // Float-drag: extract selected pixels to a temp Konva.Image, move it with the pointer,
  // commit as a new layer on pointer-up. Keeps undo to two steps (cut + paste).
  private floatClip: HTMLCanvasElement | null = null
  private floatImage: Konva.Image | null = null
  private floatStart: Point | null = null
  // Fires when a valid selection is established or dismissed (drives flip-button enable state).
  private onSelectionChanged?: (hasSelection: boolean) => void
  // Fires on float-drag end: the caller creates the permanent pasted layer.
  private onFloatEnd?: (clip: HTMLCanvasElement, transform: Transform) => void
  // Dedicated screen-space layer for the marching-ants marquee (separate from the Move overlay
  // so renderOverlay() can rebuild Move handles without destroying the marquee shapes).
  private marqueeLayer: Konva.Layer | null = null
  // Stored refs to the dashed Konva.Lines so the animation can update dashOffset in-place.
  private marqueeLines: Konva.Line[] = []
  private marqueeDashOffset = 0
  private marqueeAnimFrame: number | null = null

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
    // Marquee layer: separate from the Move overlay so the two don't stomp each other.
    this.marqueeLayer = new Konva.Layer({ listening: false })
    this.stage.add(this.marqueeLayer)

    this.applyView()

    this.resizeObserver = new ResizeObserver(() => this.applyView())
    this.resizeObserver.observe(container)
  }

  unmount() {
    this.stopMarqueeAnim()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.stage?.destroy()
    this.stage = null
    this.layer = null
    this.page = null
    this.overlay = null
    this.marqueeLayer = null
    this.marqueeLines = []
    this.container = null
    this.nodes.clear()
    this.textNodes.clear()
    this.strokeCanvas = null
    this.strokeCtx = null
    this.snapshotCanvas = null
    this.snapshotCtx = null
    this.target = null
    this.lastPoint = null
  }

  setBrush(brush: BrushParams) {
    const prevTool = this.brush.tool
    this.brush = brush
    if (prevTool === "marquee" && brush.tool !== "marquee") this.clearSelection()
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

      if (layer.type === "text") {
        let tn = this.textNodes.get(layer.id)
        if (!tn) {
          const konvaText = new Konva.Text({
            text: layer.textContent ?? "",
            fontSize: layer.fontSize ?? 40,
            fill: layer.textColor ?? "#000000",
            fontFamily: "sans-serif",
            x: 0,
            y: 0,
            listening: false,
          })
          tn = { text: konvaText }
          this.textNodes.set(layer.id, tn)
          this.layer.add(konvaText)
        } else {
          tn.text.text(layer.textContent ?? "")
          tn.text.fontSize(layer.fontSize ?? 40)
          tn.text.fill(layer.textColor ?? "#000000")
        }
        tn.text.visible(layer.visible)
        tn.text.opacity(layer.opacity / 100)
        this.applyTransformToTextNode(tn.text, this.getLayerTransform(layer.id))
        continue
      }

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
          // Trigger thumbnail so the Layers panel shows the white fill immediately.
          this.notifyPixels(layer.id)
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
      }
    }
    for (const [id, tn] of this.textNodes) {
      if (!seen.has(id)) {
        tn.text.destroy()
        this.textNodes.delete(id)
      }
    }

    // Restack: bottom-of-stack (end of array) up to top-of-stack (index 0), page beneath.
    for (const layer of [...layers].reverse()) {
      this.nodes.get(layer.id)?.image.moveToTop()
      this.textNodes.get(layer.id)?.text.moveToTop()
    }
    this.page?.moveToBottom()
    // The page rect is the structural white paper. Mirror the background layer's visibility
    // so hiding it reveals transparency (checkerboard) like any other layer.
    const bgLayer = layers.find((l) => l.background)
    if (bgLayer && this.page) this.page.visible(bgLayer.visible)
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
    const isTextLayer = this.textNodes.has(this.activeLayerId)
    // Select tool works on text layers (no raster node); paint tools need a visible raster node.
    if (this.brush.tool === "select") {
      if (!target?.image.visible() && !isTextLayer) return
    } else {
      if (!target?.image.visible()) return
    }
    if (!this.ensureBuffers() || !this.strokeCtx || !this.snapshotCtx) return

    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    this.target = target ?? null
    this.strokeLayerId = this.activeLayerId

    if (this.brush.tool === "select") {
      // Free transform: a handle picks scale/rotate, inside the box moves.
      // Before committing to any gesture, check whether a layer *above* the current one
      // has a non-transparent pixel at the click point — if so, auto-select it instead.
      // This handles the common case of clicking a layer that sits on top of the active
      // one (e.g. clicking Layer 1 while Background is active).
      const activeIndex = this.layers.findIndex((l) => l.id === this.activeLayerId)
      const topHit = this.pixelHitLayer(point, 0, activeIndex)
      if (topHit) {
        this.target = null
        this.onLayerAutoSelected?.(topHit)
        return
      }

      // No layer above is hit — apply the normal gesture (handles or box interior).
      const gesture = this.hitTest(point)
      if (!gesture) {
        this.target = null
        // Miss on the current layer too: walk layers below for a hit.
        const belowHit = this.pixelHitLayer(point, activeIndex + 1)
        if (belowHit) this.onLayerAutoSelected?.(belowHit)
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
    this.snapshotCtx.drawImage(target!.canvas, 0, 0)
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
    if (!this.target && !(this.brush.tool === "select" && this.textNodes.has(this.strokeLayerId)))
      return
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

  /** Set a layer's transform: store it, apply it to the Konva node, refresh the overlay. Public so
   *  the timeline (transform undo/redo), duplicate and document-open can replay it. */
  setLayerTransform(layerId: string, transform: Transform) {
    this.transforms.set(layerId, transform)
    const node = this.nodes.get(layerId)
    if (node) this.applyTransformToNode(node, transform)
    const tn = this.textNodes.get(layerId)
    if (tn) this.applyTransformToTextNode(tn.text, transform)
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
    const tn = this.textNodes.get(this.activeLayerId)
    if (!node?.image.visible() && !tn?.text.visible()) return
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
    const box = this.activeContentBox()
    if (!box) return
    const before = this.getLayerTransform(this.activeLayerId)
    const after = axis === "h" ? flipHorizontal(before, box) : flipVertical(before, box)
    this.setLayerTransform(this.activeLayerId, after)
    this.onMoveCommitted?.({ layerId: this.activeLayerId, before, after })
  }

  // ── marquee selection ──────────────────────────────────────────────────────

  /** Start a marquee drag. If the pointer lands inside an existing selection, begin a
   *  float-drag instead: cut the region's pixels to a temporary overlay and track the drag. */
  beginSelection(clientX: number, clientY: number) {
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return

    const r = this.selectionRect
    if (r && !this.marqueeStart && !this.floatStart) {
      if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
        this.startFloat(point, r)
        return
      }
    }

    this.marqueeStart = point
    this.selectionRect = null
    this.renderMarquee()
    this.onSelectionChanged?.(false)
  }

  /** Cut the selection region and begin a float-drag, showing a temporary overlay image. */
  private startFloat(origin: Point, rect: Box) {
    const node = this.nodes.get(this.activeLayerId)
    if (!node) return

    const clip = document.createElement("canvas")
    clip.width = DOC_WIDTH
    clip.height = DOC_HEIGHT
    const transform = this.getLayerTransform(this.activeLayerId)
    copyRegion(node.canvas, transform, rect, clip)

    const before = this.cloneCanvas(node.canvas)
    clearRegion(node.ctx, transform, rect, DOC_WIDTH, DOC_HEIGHT)
    this.layer?.batchDraw()
    this.onStrokeCommitted?.({
      layerId: this.activeLayerId,
      before,
      after: this.cloneCanvas(node.canvas),
    })
    this.notifyPixels(this.activeLayerId)

    const floatImage = new Konva.Image({
      image: clip,
      x: 0,
      y: 0,
      width: DOC_WIDTH,
      height: DOC_HEIGHT,
      listening: false,
    })
    this.layer?.add(floatImage)
    this.layer?.batchDraw()

    this.floatClip = clip
    this.floatImage = floatImage
    this.floatStart = origin
    this.selectionRect = null
    this.renderMarquee()
    this.onSelectionChanged?.(false)
  }

  /** Update the in-progress selection rect or float-drag position as the pointer moves. */
  updateSelection(clientX: number, clientY: number, shiftKey = false) {
    if (this.floatStart && this.floatImage) {
      const cur = this.screenToDoc(clientX, clientY)
      if (!cur) return
      this.floatImage.x(cur.x - this.floatStart.x)
      this.floatImage.y(cur.y - this.floatStart.y)
      this.layer?.batchDraw()
      return
    }

    if (!this.marqueeStart) return
    const cur = this.screenToDoc(clientX, clientY)
    if (!cur) return
    const dx = Math.abs(cur.x - this.marqueeStart.x)
    const dy = Math.abs(cur.y - this.marqueeStart.y)
    const size = shiftKey ? Math.min(dx, dy) : null
    const w = size ?? dx
    const h = size ?? dy
    const x = size
      ? cur.x < this.marqueeStart.x
        ? this.marqueeStart.x - size
        : this.marqueeStart.x
      : Math.min(this.marqueeStart.x, cur.x)
    const y = size
      ? cur.y < this.marqueeStart.y
        ? this.marqueeStart.y - size
        : this.marqueeStart.y
      : Math.min(this.marqueeStart.y, cur.y)
    // Snap to integer pixel boundaries so downstream pixel ops (copy/clear/flip) are exact.
    const ix = Math.round(x)
    const iy = Math.round(y)
    this.selectionRect = { x: ix, y: iy, w: Math.round(x + w) - ix, h: Math.round(y + h) - iy }
    this.renderMarquee()
  }

  /** Finish the drag. Float-drag commits the layer; sub-2px marquee drag clears selection. */
  endSelection() {
    if (this.floatStart && this.floatImage) {
      const dx = this.floatImage.x()
      const dy = this.floatImage.y()
      this.floatImage.destroy()
      this.floatImage = null
      this.layer?.batchDraw()
      const clip = this.floatClip
      this.floatClip = null
      this.floatStart = null
      if (clip) {
        this.onFloatEnd?.(clip, { x: dx, y: dy, scaleX: 1, scaleY: 1, rotation: 0 })
      }
      return
    }

    this.marqueeStart = null
    const r = this.selectionRect
    if (!r || r.w < 2 || r.h < 2) {
      this.selectionRect = null
      this.renderMarquee()
      this.onSelectionChanged?.(false)
    } else {
      this.onSelectionChanged?.(true)
    }
  }

  /** Dismiss the selection (tool switch / Escape / empty click). */
  clearSelection() {
    if (this.floatImage) {
      this.floatImage.destroy()
      this.floatImage = null
      this.layer?.batchDraw()
    }
    this.floatClip = null
    this.floatStart = null
    this.selectionRect = null
    this.marqueeStart = null
    this.renderMarquee()
    this.onSelectionChanged?.(false)
  }

  /** Copy the active layer's pixels inside the selection into the internal clipboard.
   *  Returns true when a non-empty selection existed and was copied. */
  copySelection(): boolean {
    if (!this.selectionRect) return false
    const node = this.nodes.get(this.activeLayerId)
    if (!node) return false
    const out = document.createElement("canvas")
    out.width = DOC_WIDTH
    out.height = DOC_HEIGHT
    copyRegion(node.canvas, this.getLayerTransform(this.activeLayerId), this.selectionRect, out)
    this.clipboard = out
    return true
  }

  /** Cut = copy then delete the selected pixels. No-op without a selection. */
  cutSelection() {
    if (!this.copySelection()) return
    this.deleteSelection()
  }

  /** Clear the selected region on the active layer, committed to the undo timeline. */
  deleteSelection() {
    if (!this.selectionRect) return
    const target = this.nodes.get(this.activeLayerId)
    if (!target?.image.visible()) return
    const before = this.cloneCanvas(target.canvas)
    clearRegion(
      target.ctx,
      this.getLayerTransform(this.activeLayerId),
      this.selectionRect,
      DOC_WIDTH,
      DOC_HEIGHT,
    )
    this.layer?.batchDraw()
    this.onStrokeCommitted?.({
      layerId: this.activeLayerId,
      before,
      after: this.cloneCanvas(target.canvas),
    })
    this.notifyPixels(this.activeLayerId)
  }

  /** The internal clipboard canvas (a full doc-space buffer with the copied region), or null. */
  getClipboard(): HTMLCanvasElement | null {
    return this.clipboard
  }

  endStroke() {
    const target = this.target
    if (!target && !(this.brush.tool === "select" && this.textNodes.has(this.strokeLayerId))) return

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
        after: this.cloneCanvas(target!.canvas),
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

  /** Subscribe to auto-select: fires when a Move-tool click misses the current layer and
   *  hits a different one (top-most visible layer with a non-transparent pixel wins). */
  setOnLayerAutoSelected(cb: (layerId: string) => void) {
    this.onLayerAutoSelected = cb
  }

  /** Subscribe to marquee selection changes (fires when a valid selection is established or cleared). */
  setOnSelectionChanged(cb: (hasSelection: boolean) => void) {
    this.onSelectionChanged = cb
  }

  /** Subscribe to float-drag end: caller creates the permanent layer from the clip at the given transform. */
  setOnFloatEnd(cb: (clip: HTMLCanvasElement, transform: Transform) => void) {
    this.onFloatEnd = cb
  }

  /** Flip the pixels inside the active marquee selection along the given axis (undoable). */
  flipSelection(axis: "h" | "v") {
    if (!this.selectionRect) return
    const node = this.nodes.get(this.activeLayerId)
    if (!node?.image.visible()) return
    const before = this.cloneCanvas(node.canvas)
    const scratch = document.createElement("canvas")
    scratch.width = DOC_WIDTH
    scratch.height = DOC_HEIGHT
    flipRegion(
      node.canvas,
      node.ctx,
      this.getLayerTransform(this.activeLayerId),
      this.selectionRect,
      axis,
      scratch,
      DOC_WIDTH,
      DOC_HEIGHT,
    )
    this.layer?.batchDraw()
    this.onStrokeCommitted?.({
      layerId: this.activeLayerId,
      before,
      after: this.cloneCanvas(node.canvas),
    })
    this.notifyPixels(this.activeLayerId)
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

  /** Update a text layer's Konva.Text node content live (before the store is committed).
   *  Call this on every keystroke; record undo separately on blur. */
  setTextContent(layerId: string, content: string) {
    const tn = this.textNodes.get(layerId)
    if (!tn) return
    tn.text.text(content)
    this.layer?.batchDraw()
    this.invalidateContentBox()
    this.onLayerPixelsChanged?.(layerId)
    if (layerId === this.activeLayerId) this.renderOverlay()
  }

  /** Map a screen (clientX, clientY) coordinate to document space. Public for CanvasStage. */
  screenToDocPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    return this.screenToDoc(clientX, clientY)
  }

  /** Map a document-space point to page-absolute pixels (for `position:fixed` overlays). */
  docToPagePos(docX: number, docY: number): { x: number; y: number } | null {
    if (!this.container) return null
    const rect = this.container.getBoundingClientRect()
    const s = this.docToScreen({ x: docX, y: docY })
    return { x: rect.left + s.x, y: rect.top + s.y }
  }

  /** Return the topmost visible text layer whose bounding box contains the given screen point,
   *  or null. Used by CanvasStage for both T-tool single-click re-edit and dbl-click-to-edit. */
  hitTestTextLayer(clientX: number, clientY: number): string | null {
    const point = this.screenToDoc(clientX, clientY)
    if (!point) return null
    const ctx = this.scratchCtx()
    for (const layer of this.layers) {
      if (!layer.visible) continue
      const tn = this.textNodes.get(layer.id)
      if (!tn) continue
      const text = tn.text.text()
      if (!text) continue
      const local = invert(this.getLayerTransform(layer.id), point)
      const box = textContentBox(ctx, text, tn.text.fontSize())
      if (local.x >= 0 && local.x <= box.w && local.y >= 0 && local.y <= box.h) return layer.id
    }
    return null
  }

  /** Given a screen X coordinate over a text layer, return the character index where the
   *  caret should be placed (for positioning the textarea selection after re-edit). */
  measureTextCaretIndex(layerId: string, clientX: number): number {
    const tn = this.textNodes.get(layerId)
    if (!tn) return 0
    const text = tn.text.text()
    if (!text) return 0
    const t = this.getLayerTransform(layerId)
    // localX: distance from the text origin in doc space (single-line, no rotation for now).
    const docPt = this.screenToDoc(clientX, 0)
    const localX = docPt ? docPt.x - t.x : 0
    return caretIndexAt(this.scratchCtx(), text, tn.text.fontSize(), localX)
  }

  /** A PNG data URL preview for the Layers panel. For text layers renders the text string; for
   *  raster layers crops to the non-transparent bounding box. */
  getLayerThumbnail(layerId: string, w: number, h: number): string | null {
    const tn = this.textNodes.get(layerId)
    if (tn) {
      const text = tn.text.text()
      if (!text) return null
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
      const fs = Math.min(tn.text.fontSize(), Math.round(h * 0.65))
      ctx.font = `${fs}px sans-serif`
      ctx.fillStyle = tn.text.fill() as string
      ctx.textBaseline = "middle"
      ctx.fillText(text.slice(0, 14), 4, h / 2)
      return thumb.toDataURL("image/png")
    }

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
      (id) => this.nodes.get(id)?.canvas ?? this.renderTextToCanvas(id) ?? undefined,
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
      (id) => this.nodes.get(id)?.canvas ?? this.renderTextToCanvas(id) ?? undefined,
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

  /** A throwaway 2D context for text measuring. Null under jsdom (no canvas backend). */
  private scratchCtx(): CanvasRenderingContext2D | null {
    try {
      return document.createElement("canvas").getContext("2d")
    } catch {
      return null
    }
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
    if (!this.strokeCtx) return
    stampInto(this.strokeCtx, point, this.brush)
  }

  /** Redraw the target buffer = snapshot + (stroke composited once at stroke opacity). */
  private render() {
    const target = this.target
    if (!target || !this.snapshotCanvas || !this.strokeCanvas) return
    const tool = this.brush.tool === "eraser" ? "eraser" : "brush"
    compositeStroke(target.ctx, this.snapshotCanvas, this.strokeCanvas, this.brush.opacity, tool)
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
    this.renderMarquee() // marquee is screen-space too — reposition on zoom/pan
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

  /** Apply a transform to a Konva.Image: position + scale + rotation (radians→degrees). */
  private applyTransformToNode(node: RasterNode, t: Transform) {
    node.image.position({ x: t.x, y: t.y })
    node.image.scale({ x: t.scaleX, y: t.scaleY })
    node.image.rotation((t.rotation * 180) / Math.PI)
  }

  /** Apply a transform to a Konva.Text node (same contract as raster). */
  private applyTransformToTextNode(node: Konva.Text, t: Transform) {
    node.position({ x: t.x, y: t.y })
    node.scale({ x: t.scaleX, y: t.scaleY })
    node.rotation((t.rotation * 180) / Math.PI)
  }

  /** Render a text layer's content to a full doc-space canvas at (0,0) so flattenLayers can
   *  position it correctly via the stored transform. Returns null when no text node exists. */
  private renderTextToCanvas(layerId: string): HTMLCanvasElement | null {
    const tn = this.textNodes.get(layerId)
    if (!tn) return null
    const text = tn.text.text()
    if (!text) return null
    const canvas = document.createElement("canvas")
    canvas.width = DOC_WIDTH
    canvas.height = DOC_HEIGHT
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext("2d")
    } catch {
      ctx = null
    }
    if (!ctx) return null
    drawText(ctx, text, tn.text.fontSize(), tn.text.fill() as string)
    return canvas
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

  /** Content bounds of the active layer (cached). For text layers measures the rendered text;
   *  for raster layers scans the pixel buffer. */
  private activeContentBox(): Bounds | null {
    const id = this.activeLayerId
    if (this.contentBoxCache?.layerId === id) return this.contentBoxCache.box

    const tn = this.textNodes.get(id)
    if (tn) {
      const text = tn.text.text()
      if (!text) {
        this.contentBoxCache = { layerId: id, box: null }
        return null
      }
      const box = textContentBox(this.scratchCtx(), text, tn.text.fontSize())
      this.contentBoxCache = { layerId: id, box }
      return box
    }

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
    // Re-render the select overlay so handles appear immediately when the active layer's
    // pixels arrive (e.g. after a float-drag paste, where restorePixels fires after syncLayers).
    if (layerId === this.activeLayerId) this.renderOverlay()
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
  /** Walk `this.layers[from..to)` top→bottom and return the first visible layer id that has
   *  a non-transparent pixel at `point` (doc-space, transform-aware). `to` defaults to end. */
  private pixelHitLayer(point: Point, from = 0, to = this.layers.length): string | null {
    for (let i = from; i < to; i++) {
      const layer = this.layers[i]
      if (!layer?.visible) continue

      // Text layer: hit-test against the approximate rendered bounding box.
      const tn = this.textNodes.get(layer.id)
      if (tn) {
        const text = tn.text.text()
        if (!text) continue
        const local = invert(this.getLayerTransform(layer.id), point)
        const fontSize = tn.text.fontSize()
        const approxW = fontSize * text.length * 0.6
        const approxH = fontSize * 1.3
        if (local.x >= 0 && local.x <= approxW && local.y >= 0 && local.y <= approxH)
          return layer.id
        continue
      }

      const node = this.nodes.get(layer.id)
      if (!node) continue
      const local = invert(this.getLayerTransform(layer.id), point)
      const px = Math.round(local.x)
      const py = Math.round(local.y)
      if (px < 0 || py < 0 || px >= DOC_WIDTH || py >= DOC_HEIGHT) continue
      const [, , , a] = node.ctx.getImageData(px, py, 1, 1).data
      if ((a ?? 0) > 0) return layer.id
    }
    return null
  }

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

  /** The CSS cursor for a gesture under the cursor — rotation- and flip-aware for resize handles. */
  private cursorFor(g: Gesture | null): string {
    if (!g) return "default"
    if (g.kind === "rotate") return "grab"
    if (g.kind === "move") return "move"
    const t = this.getLayerTransform(this.activeLayerId)
    const deg = (t.rotation * 180) / Math.PI
    const flipped = t.scaleX < 0 !== t.scaleY < 0
    return resizeCursor(g.index, deg, flipped)
  }

  /** Update the container cursor on hover — only while Move is active and not mid-drag. */
  pointerHover(clientX: number, clientY: number) {
    if (!this.container) return
    if (this.brush.tool === "select") {
      if (this.moveStart) return
      const point = this.screenToDoc(clientX, clientY)
      this.container.style.cursor = this.cursorFor(point ? this.hitTest(point) : null)
    } else if (this.brush.tool === "marquee") {
      if (this.marqueeStart || this.floatStart) return
      const point = this.screenToDoc(clientX, clientY)
      const r = this.selectionRect
      const inside =
        point && r
          ? point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h
          : false
      this.container.style.cursor = inside ? "move" : "crosshair"
    }
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
    const hasActiveNode = node?.image.visible() || this.textNodes.has(this.activeLayerId)
    const box = this.brush.tool === "select" && hasActiveNode ? this.activeContentBox() : null
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

  /** Render the marching-ants marquee rect. Rebuilds the two dashed Konva.Lines on the
   *  dedicated marqueeLayer, then starts the animation loop to march the dashes. */
  private renderMarquee() {
    this.stopMarqueeAnim()
    const ml = this.marqueeLayer
    if (!ml) return
    ml.destroyChildren()
    this.marqueeLines = []

    if (!this.selectionRect) {
      ml.batchDraw()
      return
    }

    const { x, y, w, h } = this.selectionRect
    const pts = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
      .map((c) => this.docToScreen(c))
      .flatMap((c) => [c.x, c.y])

    // Two stacked lines: white underlay + black overlay with offset dashes = "marching ants".
    const white = new Konva.Line({
      points: pts,
      closed: true,
      stroke: "#ffffff",
      strokeWidth: 1,
      dash: [4, 4],
      dashOffset: this.marqueeDashOffset,
      listening: false,
    })
    const dark = new Konva.Line({
      points: pts,
      closed: true,
      stroke: "#000000",
      strokeWidth: 1,
      dash: [4, 4],
      dashOffset: this.marqueeDashOffset + 4,
      listening: false,
    })
    ml.add(white)
    ml.add(dark)
    this.marqueeLines = [white, dark]
    ml.batchDraw()

    this.startMarqueeAnim()
  }

  /** Increment dashOffset each frame — shapes are updated in-place, no Konva rebuild. */
  private startMarqueeAnim() {
    const tick = () => {
      this.marqueeDashOffset = (this.marqueeDashOffset + 0.4) % 8
      for (const line of this.marqueeLines) line.dashOffset(this.marqueeDashOffset)
      this.marqueeLayer?.batchDraw()
      if (this.selectionRect && this.marqueeLines.length > 0) {
        this.marqueeAnimFrame = requestAnimationFrame(tick)
      } else {
        this.marqueeAnimFrame = null
      }
    }
    this.marqueeAnimFrame = requestAnimationFrame(tick)
  }

  private stopMarqueeAnim() {
    if (this.marqueeAnimFrame !== null) {
      cancelAnimationFrame(this.marqueeAnimFrame)
      this.marqueeAnimFrame = null
    }
  }
}
