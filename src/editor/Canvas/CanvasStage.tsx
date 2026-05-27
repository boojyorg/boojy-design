import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { CanvasEngine } from "@/editor/Canvas/engine/CanvasEngine"
import { IDENTITY, type Transform } from "@/editor/Canvas/engine/transform"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import { useUndoStore } from "@/editor/state/undoStore"
import { useViewportStore } from "@/editor/state/viewportStore"
import type { Layer, ToolId, VectorKind } from "@/editor/types"
import { toLayerName } from "@/lib/filename"
import { decodeImageFile } from "@/lib/loadImage"

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CanvasStage — THE ENGINE SEAM (now live).
 *
 *  The imperative Konva engine (CanvasEngine) mounts into the host div here and
 *  owns all canvas/engine logic. The surrounding chrome (top bar, rail, sidebar)
 *  stays presentational and unchanged — it only feeds state down through props.
 *
 *  Painting is imperative: pointer events go straight to the engine, which reads
 *  the current brush/layer/zoom state and draws to a pixel buffer. React state is
 *  never touched per pointer-move. Under jsdom the engine no-ops (no 2D context),
 *  so this still renders its host div + testid and the shell tests stay green.
 * ─────────────────────────────────────────────────────────────────────────
 */
interface CanvasStageProps {
  tool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  shapeKind: VectorKind
  fillTolerance: number
  layers: Layer[]
  activeLayerId: string
  /** Ask the chrome to add an image-typed layer (the document store owns layer metadata). */
  onRequestImageLayer: (name: string) => void
  /** Eyedropper picked a colour (visible composite under the cursor). */
  onSampleColor: (hex: string) => void
}

/** The narrow imperative surface the engine exposes across the seam. */
export interface CanvasStageHandle {
  exportPNG: () => void
  importImage: (file: Blob, filename: string) => void
  /** Clone a layer's current pixels (for an undoable delete/duplicate), or null if none. */
  captureLayerPixels: (layerId: string) => HTMLCanvasElement | null
  /** Queue a pixel snapshot to paint into a layer once its node next exists (after a sync). */
  stashPixelRestore: (layerId: string, canvas: HTMLCanvasElement) => void
  /** A layer's non-destructive transform (for save + duplicate). */
  getLayerTransform: (layerId: string) => Transform
  /** Set a layer's transform (for open + duplicate). */
  setLayerTransform: (layerId: string, transform: Transform) => void
  /** Drop all stored transforms (on opening a new document). */
  clearTransforms: () => void
  /** Flip the active layer horizontally or vertically (undoable). */
  flipActiveLayer: (axis: "h" | "v") => void
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(
  function CanvasStage(props, ref) {
    const hostRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<CanvasEngine | null>(null)
    const record = useUndoStore((s) => s.record)
    const setThumbnail = useThumbnailStore((s) => s.setThumbnail)
    const removeThumbnail = useThumbnailStore((s) => s.removeThumbnail)
    // Viewport (zoom + pan) — the engine seam owns navigation gestures, so subscribe directly.
    const zoom = useViewportStore((s) => s.zoom)
    const panX = useViewportStore((s) => s.panX)
    const panY = useViewportStore((s) => s.panY)
    const setContainerSize = useViewportStore((s) => s.setContainerSize)
    const zoomAtCursor = useViewportStore((s) => s.zoomAtCursor)
    const panBy = useViewportStore((s) => s.panBy)
    // Pan gesture (Space-drag or Hand tool): held button + last pointer position.
    const panningRef = useRef(false)
    const lastPanRef = useRef<{ x: number; y: number } | null>(null)
    // Space held? Drives a temporary pan mode + grab cursor from any tool. `grabbing` is the
    // active-drag state (so the cursor is declarative — no imperative style fight).
    const [spaceDown, setSpaceDown] = useState(false)
    const [grabbing, setGrabbing] = useState(false)
    // A decoded image waiting for its layer's node to exist (drawn in the layers effect).
    const pendingImageRef = useRef<{ source: CanvasImageSource; w: number; h: number } | null>(null)
    // Pixel snapshots waiting for their layer's node to exist, drained after the next sync.
    // Feeds undo-delete (resurrected node) and duplicate (the copy's pixels).
    const pendingPixelRestoresRef = useRef<{ layerId: string; canvas: HTMLCanvasElement }[]>([])
    // Latest onRequestImageLayer, read through a ref so the handle can stay stable.
    const onRequestImageLayerRef = useRef(props.onRequestImageLayer)
    onRequestImageLayerRef.current = props.onRequestImageLayer

    const importImage = useCallback(async (file: Blob, filename: string) => {
      const source = await decodeImageFile(file)
      const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width
      const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height
      // Stash the bitmap, then ask the reducer to add the layer; the layers effect draws it
      // once syncLayers has created (and activated) the new layer's node.
      pendingImageRef.current = { source, w, h }
      onRequestImageLayerRef.current(toLayerName(filename))
    }, [])

    // Expose only these commands — the engine itself stays sealed inside this component.
    useImperativeHandle(
      ref,
      () => ({
        exportPNG: () => engineRef.current?.exportPNG(),
        importImage: (file, filename) => {
          void importImage(file, filename)
        },
        captureLayerPixels: (layerId) => engineRef.current?.captureLayerPixels(layerId) ?? null,
        stashPixelRestore: (layerId, canvas) => {
          pendingPixelRestoresRef.current.push({ layerId, canvas })
        },
        getLayerTransform: (layerId) => engineRef.current?.getLayerTransform(layerId) ?? IDENTITY,
        setLayerTransform: (layerId, transform) =>
          engineRef.current?.setLayerTransform(layerId, transform),
        clearTransforms: () => engineRef.current?.clearTransforms(),
        flipActiveLayer: (axis) => engineRef.current?.flipActiveLayer(axis),
      }),
      [importImage],
    )

    useEffect(() => {
      const host = hostRef.current
      if (!host) return
      const engine = new CanvasEngine()
      engine.mount(host)
      engineRef.current = engine
      // Track Shift directly so the shape preview follows the square/circle constraint
      // even when the pointer is still (no pointer event fires then). No-ops off a drag.
      const onShift = (e: KeyboardEvent) => {
        if (e.key === "Shift") engine.setShapeConstraint(e.shiftKey)
      }
      window.addEventListener("keydown", onShift)
      window.addEventListener("keyup", onShift)
      return () => {
        window.removeEventListener("keydown", onShift)
        window.removeEventListener("keyup", onShift)
        engine.unmount()
        engineRef.current = null
      }
    }, [])

    // Record each committed stroke onto the unified timeline. restorePixels no-ops if the
    // layer has no node; timeline ordering guarantees a delete-undo resurrects it first.
    useEffect(() => {
      engineRef.current?.setOnStrokeCommitted((commit) => {
        record({
          label: "stroke",
          undo: () => engineRef.current?.restorePixels(commit.layerId, commit.before),
          redo: () => engineRef.current?.restorePixels(commit.layerId, commit.after),
        })
      })
      // A transform change (no pixels) — undo/redo just replays the before/after transform.
      engineRef.current?.setOnMoveCommitted((commit) => {
        record({
          label: "transform",
          undo: () => engineRef.current?.setLayerTransform(commit.layerId, commit.before),
          redo: () => engineRef.current?.setLayerTransform(commit.layerId, commit.after),
        })
      })
      // Refresh the changed layer's panel thumbnail (fires on stroke/shape/fill/import/restore).
      // A blank layer yields no thumbnail → drop the entry so the row shows an empty box.
      engineRef.current?.setOnLayerPixelsChanged((layerId) => {
        const url = engineRef.current?.getLayerThumbnail(layerId, 72, 56)
        if (url) setThumbnail(layerId, url)
        else removeThumbnail(layerId)
      })
    }, [record, setThumbnail, removeThumbnail])

    useEffect(() => {
      engineRef.current?.setBrush({
        tool: props.tool,
        color: props.foreground,
        size: props.brushSize,
        // Shapes fill solid — the Shape panel has no opacity control, so don't
        // inherit the brush's last opacity. Use layer opacity for translucency.
        opacity: props.tool === "shape" ? 100 : props.opacity,
        hardness: props.hardness,
        shapeKind: props.shapeKind,
        tolerance: props.fillTolerance,
      })
    }, [
      props.tool,
      props.foreground,
      props.brushSize,
      props.opacity,
      props.hardness,
      props.shapeKind,
      props.fillTolerance,
    ])

    useEffect(() => {
      const engine = engineRef.current
      if (!engine) return
      engine.syncLayers(props.layers, props.activeLayerId)
      // The new image layer's node now exists and is active — draw the pending bitmap.
      const pending = pendingImageRef.current
      if (pending) {
        engine.drawImageToActiveLayer(pending.source, pending.w, pending.h)
        pendingImageRef.current = null
      }
      // Layers whose nodes now exist get their stashed pixels painted in: the copy's
      // pixels (duplicate) or a deleted layer's pixels (undo-delete).
      const restores = pendingPixelRestoresRef.current
      if (restores.length) {
        for (const { layerId, canvas } of restores) engine.restorePixels(layerId, canvas)
        pendingPixelRestoresRef.current = []
      }
    }, [props.layers, props.activeLayerId])

    useEffect(() => {
      engineRef.current?.setView(zoom, panX, panY)
    }, [zoom, panX, panY])

    // Report the stage's measured size to the viewport store so zoom can anchor to the
    // viewport centre (and fit can size the page). Re-measure on resize.
    useEffect(() => {
      const host = hostRef.current
      if (!host) return
      const measure = () => {
        const r = host.getBoundingClientRect()
        setContainerSize(r.width || 1, r.height || 1)
      }
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(host)
      return () => ro.disconnect()
    }, [setContainerSize])

    // Wheel: plain scroll pans; pinch / ⌘-scroll (both arrive as ctrlKey) zooms toward the
    // cursor. A native non-passive listener — React's onWheel is passive and can't preventDefault.
    useEffect(() => {
      const host = hostRef.current
      if (!host) return
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey) {
          const r = host.getBoundingClientRect()
          zoomAtCursor(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
        } else {
          panBy(-e.deltaX, -e.deltaY)
        }
      }
      host.addEventListener("wheel", onWheel, { passive: false })
      return () => host.removeEventListener("wheel", onWheel)
    }, [zoomAtCursor, panBy])

    // Space held → temporary pan mode (grab cursor) from any tool, like every editor. Ignored
    // while typing or when a button is focused (so Space still activates the focused control).
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== " ") return
        const t = e.target as HTMLElement | null
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.tagName === "SELECT" ||
            t.tagName === "BUTTON" ||
            t.isContentEditable)
        ) {
          return
        }
        e.preventDefault() // stop the page from scrolling on Space
        setSpaceDown(e.type === "keydown")
      }
      window.addEventListener("keydown", onKey)
      window.addEventListener("keyup", onKey)
      return () => {
        window.removeEventListener("keydown", onKey)
        window.removeEventListener("keyup", onKey)
      }
    }, [])

    // Move tool: arrow keys nudge the active layer (1px; 10px with Shift), each press a
    // single undoable step. Only attached while Move is active, so other tools' arrow
    // behaviour is untouched; ignored while typing so the layer-rename field keeps caret keys.
    useEffect(() => {
      if (props.tool !== "select") return
      const onArrow = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
        const step = e.shiftKey ? 10 : 1
        let dx = 0
        let dy = 0
        switch (e.key) {
          case "ArrowLeft":
            dx = -step
            break
          case "ArrowRight":
            dx = step
            break
          case "ArrowUp":
            dy = -step
            break
          case "ArrowDown":
            dy = step
            break
          default:
            return
        }
        e.preventDefault()
        engineRef.current?.nudgeActiveLayer(dx, dy)
      }
      window.addEventListener("keydown", onArrow)
      return () => window.removeEventListener("keydown", onArrow)
    }, [props.tool])

    const isPaintTool = props.tool === "brush" || props.tool === "eraser" || props.tool === "shape"
    const showCrosshair = isPaintTool || props.tool === "eyedropper" || props.tool === "fill"
    // Pan mode (Space held or Hand tool) wins over every tool cursor. Otherwise: for Move the
    // engine drives the container cursor on hover (handle-aware), so leave it undefined; the rest
    // are static here.
    const panMode = spaceDown || props.tool === "hand"
    const cursor = grabbing
      ? "grabbing"
      : panMode
        ? "grab"
        : props.tool === "select"
          ? undefined
          : showCrosshair
            ? "crosshair"
            : "default"

    return (
      <div
        data-testid="canvas-stage"
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-editor"
      >
        <div className="canvas-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the Konva engine mounts into
            this div; it's a custom pointer-painting + image-drop surface, not a semantic control. */}
        <div
          ref={hostRef}
          className="absolute inset-0"
          style={{ cursor, touchAction: "none" }}
          onPointerDown={(e) => {
            // Pan (Space-drag or Hand tool) pre-empts every tool.
            if (panMode) {
              e.currentTarget.setPointerCapture(e.pointerId)
              panningRef.current = true
              lastPanRef.current = { x: e.clientX, y: e.clientY }
              setGrabbing(true)
              return
            }
            if (props.tool === "eyedropper") {
              const hex = engineRef.current?.sampleColorAt(e.clientX, e.clientY)
              if (hex) props.onSampleColor(hex)
              return
            }
            if (props.tool === "fill") {
              engineRef.current?.fillAt(e.clientX, e.clientY)
              return
            }
            e.currentTarget.setPointerCapture(e.pointerId)
            engineRef.current?.beginStroke(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (panningRef.current) {
              const last = lastPanRef.current
              if (last) {
                panBy(e.clientX - last.x, e.clientY - last.y)
                lastPanRef.current = { x: e.clientX, y: e.clientY }
              }
              return
            }
            engineRef.current?.continueStroke(e.clientX, e.clientY, e.shiftKey)
            // Move tool: update the handle-aware cursor on hover (no-ops mid-drag).
            if (props.tool === "select") engineRef.current?.pointerHover(e.clientX, e.clientY)
          }}
          onPointerUp={(e) => {
            if (panningRef.current) {
              panningRef.current = false
              lastPanRef.current = null
              setGrabbing(false)
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId)
              }
              return
            }
            engineRef.current?.endStroke()
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
          }}
          onPointerCancel={() => {
            if (panningRef.current) {
              panningRef.current = false
              lastPanRef.current = null
              setGrabbing(false)
              return
            }
            engineRef.current?.endStroke()
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file?.type.startsWith("image/")) void importImage(file, file.name)
          }}
        />
      </div>
    )
  },
)
