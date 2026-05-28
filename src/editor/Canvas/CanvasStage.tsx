import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CanvasEngine } from "@/editor/Canvas/engine/CanvasEngine"
import { IDENTITY, type Transform } from "@/editor/Canvas/engine/transform"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import { useUndoStore } from "@/editor/state/undoStore"
import { useViewportStore } from "@/editor/state/viewportStore"
import { DEFAULT_TEXT_COLOR, type Layer, type ToolId, type VectorKind } from "@/editor/types"
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
  hasMarqueeSelection?: boolean
  /** Ask the chrome to add an image-typed layer (the document store owns layer metadata). */
  onRequestImageLayer: (name: string) => void
  /** Eyedropper picked a colour (visible composite under the cursor). */
  onSampleColor: (hex: string) => void
  /** Move tool clicked a different layer — select it in the document store. */
  onSelectLayer: (id: string) => void
  /** Marquee selection established or cleared — drives flip-button enabled state. */
  onMarqueeSelectionChange?: (hasSelection: boolean) => void
  /** Float-drag ended: caller creates the permanent pasted layer and switches to Move. */
  onFloatEnd?: (clip: HTMLCanvasElement, transform: Transform) => void
  /** Text tool placed a new layer — caller adds it to the document store. */
  onTextLayerCreate?: (id: string, docX: number, docY: number) => void
  /** Text editing committed (blur, Escape, or tool-switch) — caller records the undo step. */
  onTextCommit?: (layerId: string, before: string, after: string) => void
  /** Double-click-to-edit requests a tool switch to Text from any other tool. */
  onRequestTextTool?: () => void
  /** A resize gesture on a text layer was committed — baked transform already applied to the engine.
   *  Caller updates fontSize and records the compound undo step. */
  onTextScaleCommit?: (
    layerId: string,
    beforeTransform: Transform,
    afterTransform: Transform,
    bakedTransform: Transform,
  ) => void
  /** Fires on every pointer-move while a text layer is active under the select tool.
   *  Reports the live effective font size (storedFontSize × |currentScaleY|) for panel display. */
  onLiveTextScale?: (layerId: string, liveSize: number) => void
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
  /** Flip the pixels inside the active marquee selection (undoable). No-op without a selection. */
  flipSelection: (axis: "h" | "v") => void
  /** Copy the selected region of the active layer into the internal clipboard. Returns true if there was a selection. */
  copySelection: () => boolean
  /** Cut the selected region (copy + delete). No-op without a selection. */
  cutSelection: () => void
  /** Delete the selected region from the active layer (undoable). No-op without a selection. */
  deleteSelection: () => void
  /** The internal clipboard canvas (full doc-space), or null if nothing has been copied. */
  getClipboard: () => HTMLCanvasElement | null
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
    // Brush radius preview circle: pointer position relative to the canvas container.
    const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
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
    // Text layer editing: null = not editing; before = snapshot for undo on commit.
    const [textEditing, setTextEditing] = useState<{ layerId: string; before: string } | null>(null)
    const [textValue, setTextValue] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    // Stable refs so commitText + the tool-switch effect don't capture stale closures.
    const textEditingRef = useRef(textEditing)
    textEditingRef.current = textEditing
    const textValueRef = useRef(textValue)
    textValueRef.current = textValue
    const onTextLayerCreateRef = useRef(props.onTextLayerCreate)
    onTextLayerCreateRef.current = props.onTextLayerCreate
    const onTextCommitRef = useRef(props.onTextCommit)
    onTextCommitRef.current = props.onTextCommit
    const onRequestTextToolRef = useRef(props.onRequestTextTool)
    onRequestTextToolRef.current = props.onRequestTextTool
    const onTextScaleCommitRef = useRef(props.onTextScaleCommit)
    onTextScaleCommitRef.current = props.onTextScaleCommit
    const onLiveTextScaleRef = useRef(props.onLiveTextScale)
    onLiveTextScaleRef.current = props.onLiveTextScale
    // Kept current so engine callbacks can safely read the latest layer list without deps churn.
    const layersRef = useRef(props.layers)
    layersRef.current = props.layers

    const importImage = useCallback(async (file: Blob, filename: string) => {
      const source = await decodeImageFile(file)
      const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width
      const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height
      // Stash the bitmap, then ask the reducer to add the layer; the layers effect draws it
      // once syncLayers has created (and activated) the new layer's node.
      pendingImageRef.current = { source, w, h }
      onRequestImageLayerRef.current(toLayerName(filename))
    }, [])

    // Commit in-progress text editing: fire the callback and clear local state.
    // Uses refs so it's stable and safe to call from blur / keydown / effects.
    const commitText = useCallback(() => {
      const editing = textEditingRef.current
      if (!editing) return
      onTextCommitRef.current?.(editing.layerId, editing.before, textValueRef.current)
      setTextEditing(null)
      setTextValue("")
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
        flipSelection: (axis) => engineRef.current?.flipSelection(axis),
        copySelection: () => engineRef.current?.copySelection() ?? false,
        cutSelection: () => engineRef.current?.cutSelection(),
        deleteSelection: () => engineRef.current?.deleteSelection(),
        getClipboard: () => engineRef.current?.getClipboard() ?? null,
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
      // A transform change (no pixels) — undo/redo replays before/after transform.
      // Exception: when a text layer's scale magnitude changes, bake the scale into fontSize
      // and reset scale to ±1 so the panel always shows the visual font size.
      engineRef.current?.setOnMoveCommitted((commit) => {
        const layer = layersRef.current.find((l) => l.id === commit.layerId)
        const scaleXChanged = Math.abs(commit.after.scaleX) !== Math.abs(commit.before.scaleX)
        const scaleYChanged = Math.abs(commit.after.scaleY) !== Math.abs(commit.before.scaleY)
        if (layer?.type === "text" && (scaleXChanged || scaleYChanged)) {
          // Bake vertical scale into fontSize; keep horizontal ratio as residual scaleX so
          // non-proportional stretches survive. scaleY resets to ±1 (direction preserved).
          const scaleYMag = Math.abs(commit.after.scaleY)
          const signY = Math.sign(commit.after.scaleY) || 1
          const bakedTransform: Transform = {
            ...commit.after,
            scaleX: commit.after.scaleX / scaleYMag,
            scaleY: signY,
          }
          engineRef.current?.setLayerTransform(commit.layerId, bakedTransform)
          onTextScaleCommitRef.current?.(
            commit.layerId,
            commit.before,
            commit.after,
            bakedTransform,
          )
          return
        }
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
      engineRef.current?.setOnLayerAutoSelected((layerId) => {
        props.onSelectLayer(layerId)
      })
      engineRef.current?.setOnSelectionChanged((hasSelection) => {
        props.onMarqueeSelectionChange?.(hasSelection)
      })
      engineRef.current?.setOnFloatEnd((clip, transform) => {
        props.onFloatEnd?.(clip, transform)
      })
    }, [
      record,
      setThumbnail,
      removeThumbnail,
      props.onSelectLayer,
      props.onMarqueeSelectionChange,
      props.onFloatEnd,
    ])

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

    // Marquee tool: Escape clears the active selection.
    // Text tool: Escape commits the in-progress edit.
    useEffect(() => {
      if (props.tool === "marquee") {
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") engineRef.current?.clearSelection()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
      }
      if (props.tool === "text") {
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") commitText()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
      }
    }, [props.tool, commitText])

    // Switching away from the text tool commits any in-progress edit.
    useEffect(() => {
      if (props.tool === "text") return
      const editing = textEditingRef.current
      if (!editing) return
      onTextCommitRef.current?.(editing.layerId, editing.before, textValueRef.current)
      setTextEditing(null)
      setTextValue("")
    }, [props.tool])

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

    const isBrushTool = props.tool === "brush" || props.tool === "eraser"
    const isPaintTool = isBrushTool || props.tool === "shape"
    const showCrosshair =
      isPaintTool ||
      props.tool === "eyedropper" ||
      props.tool === "fill" ||
      props.tool === "marquee"
    // Pan mode (Space held or Hand tool) wins over every tool cursor. Otherwise: for Move, and
    // for Marquee when a selection is active, the engine drives the container cursor on hover
    // (handle- or hit-test-aware). All other tools use a static cursor.
    const panMode = spaceDown || props.tool === "hand"
    const engineDrivesCursor =
      props.tool === "select" || (props.tool === "marquee" && !!props.hasMarqueeSelection)
    const cursor = grabbing
      ? "grabbing"
      : panMode
        ? "grab"
        : engineDrivesCursor
          ? undefined
          : isBrushTool
            ? "none"
            : props.tool === "text"
              ? "text"
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
            if (props.tool === "marquee") {
              e.currentTarget.setPointerCapture(e.pointerId)
              engineRef.current?.beginSelection(e.clientX, e.clientY)
              return
            }
            if (props.tool === "text") {
              const engine = engineRef.current
              if (!engine) return
              const docPt = engine.screenToDocPoint(e.clientX, e.clientY)
              if (!docPt) return
              // Hit-test all text layers (not just the active one) — Photoshop behaviour:
              // clicking any text with the T tool re-edits it at the caret position.
              const hitId = engine.hitTestTextLayer(e.clientX, e.clientY)
              if (hitId) {
                const hitLayer = props.layers.find((l) => l.id === hitId)
                const content = hitLayer?.textContent ?? ""
                const caretIdx = engine.measureTextCaretIndex(hitId, e.clientX)
                props.onSelectLayer(hitId)
                setTextEditing({ layerId: hitId, before: content })
                setTextValue(content)
                setTimeout(() => {
                  const ta = textareaRef.current
                  if (!ta) return
                  ta.focus()
                  ta.setSelectionRange(caretIdx, caretIdx)
                }, 0)
              } else {
                // No text layer hit — create a new one.
                const id = crypto.randomUUID()
                engine.setLayerTransform(id, {
                  x: docPt.x,
                  y: docPt.y,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                })
                onTextLayerCreateRef.current?.(id, docPt.x, docPt.y)
                setTextEditing({ layerId: id, before: "" })
                setTextValue("")
                setTimeout(() => textareaRef.current?.focus(), 0)
              }
              return
            }
            e.currentTarget.setPointerCapture(e.pointerId)
            engineRef.current?.beginStroke(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            setPointerPos({ x: e.clientX, y: e.clientY })
            if (panningRef.current) {
              const last = lastPanRef.current
              if (last) {
                panBy(e.clientX - last.x, e.clientY - last.y)
                lastPanRef.current = { x: e.clientX, y: e.clientY }
              }
              return
            }
            if (props.tool === "marquee") {
              engineRef.current?.updateSelection(e.clientX, e.clientY, e.shiftKey)
              engineRef.current?.pointerHover(e.clientX, e.clientY)
              return
            }
            engineRef.current?.continueStroke(e.clientX, e.clientY, e.shiftKey)
            if (props.tool === "select") {
              // Update the handle-aware cursor on hover (no-ops mid-drag).
              engineRef.current?.pointerHover(e.clientX, e.clientY)
              // Live font-size readout: read the engine's current scaleY after continueStroke
              // has applied the gesture. Fires on every move so the panel tracks the drag live.
              const layer = layersRef.current.find((l) => l.id === props.activeLayerId)
              if (layer?.type === "text") {
                const t = engineRef.current?.getLayerTransform(props.activeLayerId)
                if (t) {
                  const liveSize = Math.max(
                    1,
                    Math.round((layer.fontSize ?? 40) * Math.abs(t.scaleY)),
                  )
                  onLiveTextScaleRef.current?.(props.activeLayerId, liveSize)
                }
              }
            }
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
            if (props.tool === "marquee") {
              engineRef.current?.endSelection()
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
            if (props.tool === "marquee") {
              engineRef.current?.endSelection()
              return
            }
            engineRef.current?.endStroke()
          }}
          onPointerLeave={() => setPointerPos(null)}
          onDoubleClick={(e) => {
            const engine = engineRef.current
            if (!engine) return
            const hitId = engine.hitTestTextLayer(e.clientX, e.clientY)
            if (!hitId) return
            const hitLayer = props.layers.find((l) => l.id === hitId)
            const content = hitLayer?.textContent ?? ""
            const caretIdx = engine.measureTextCaretIndex(hitId, e.clientX)
            props.onSelectLayer(hitId)
            // If not already on the text tool, request the switch — the tool-switch effect
            // fires on leaving text, not entering, so it won't immediately commit.
            if (props.tool !== "text") onRequestTextToolRef.current?.()
            setTextEditing({ layerId: hitId, before: content })
            setTextValue(content)
            setTimeout(() => {
              const ta = textareaRef.current
              if (!ta) return
              ta.focus()
              ta.setSelectionRange(caretIdx, caretIdx)
            }, 0)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file?.type.startsWith("image/")) void importImage(file, file.name)
          }}
        />
        {isBrushTool &&
          !panMode &&
          pointerPos &&
          createPortal(
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                left: pointerPos.x,
                top: pointerPos.y,
                width: Math.max(4, props.brushSize * (zoom / 100)),
                height: Math.max(4, props.brushSize * (zoom / 100)),
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: "1px solid white",
                boxShadow: "0 0 0 1px black",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            />,
            document.body,
          )}
        {textEditing &&
          (() => {
            const engine = engineRef.current
            const layer = props.layers.find((l) => l.id === textEditing.layerId)
            const fontSize = layer?.fontSize ?? 40
            const color = layer?.textColor ?? DEFAULT_TEXT_COLOR
            const transform = engine?.getLayerTransform(textEditing.layerId)
            const screenPos =
              transform && engine ? engine.docToPagePos(transform.x, transform.y) : null
            if (!screenPos) return null
            return createPortal(
              <textarea
                ref={textareaRef}
                value={textValue}
                aria-label="Text layer content"
                onChange={(e) => {
                  const v = e.target.value
                  setTextValue(v)
                  engineRef.current?.setTextContent(textEditing.layerId, v)
                }}
                onBlur={commitText}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    commitText()
                  }
                }}
                style={{
                  position: "fixed",
                  left: screenPos.x,
                  top: screenPos.y,
                  minWidth: 4,
                  minHeight: fontSize * (zoom / 100) * 1.3,
                  font: `${fontSize * (zoom / 100)}px sans-serif`,
                  color: "transparent",
                  caretColor: color,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  overflow: "hidden",
                  padding: 0,
                  margin: 0,
                  lineHeight: 1.3,
                  zIndex: 9999,
                }}
              />,
              document.body,
            )
          })()}
      </div>
    )
  },
)
