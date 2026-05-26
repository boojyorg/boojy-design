import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { CanvasEngine } from "@/editor/Canvas/engine/CanvasEngine"
import type { Layer, ToolId } from "@/editor/types"

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
  zoom: number
  layers: Layer[]
  activeLayerId: string
  onHistoryChange: (s: { canUndo: boolean; canRedo: boolean }) => void
}

/** The narrow imperative surface the engine exposes across the seam. */
export interface CanvasStageHandle {
  exportPNG: () => void
  undo: () => void
  redo: () => void
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(
  function CanvasStage(props, ref) {
    const hostRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<CanvasEngine | null>(null)

    // Expose only these commands — the engine itself stays sealed inside this component.
    useImperativeHandle(
      ref,
      () => ({
        exportPNG: () => engineRef.current?.exportPNG(),
        undo: () => engineRef.current?.undo(),
        redo: () => engineRef.current?.redo(),
      }),
      [],
    )

    useEffect(() => {
      const host = hostRef.current
      if (!host) return
      const engine = new CanvasEngine()
      engine.mount(host)
      engineRef.current = engine
      return () => {
        engine.unmount()
        engineRef.current = null
      }
    }, [])

    useEffect(() => {
      engineRef.current?.setBrush({
        tool: props.tool,
        color: props.foreground,
        size: props.brushSize,
        opacity: props.opacity,
        hardness: props.hardness,
      })
    }, [props.tool, props.foreground, props.brushSize, props.opacity, props.hardness])

    useEffect(() => {
      engineRef.current?.syncLayers(props.layers, props.activeLayerId)
    }, [props.layers, props.activeLayerId])

    useEffect(() => {
      engineRef.current?.setZoom(props.zoom)
    }, [props.zoom])

    useEffect(() => {
      engineRef.current?.setOnHistoryChange(props.onHistoryChange)
    }, [props.onHistoryChange])

    const isPaintTool = props.tool === "brush" || props.tool === "eraser"

    return (
      <div
        data-testid="canvas-stage"
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-editor"
      >
        <div className="canvas-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          ref={hostRef}
          className="absolute inset-0"
          style={{ cursor: isPaintTool ? "crosshair" : "default", touchAction: "none" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            engineRef.current?.beginStroke(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => engineRef.current?.continueStroke(e.clientX, e.clientY)}
          onPointerUp={(e) => {
            engineRef.current?.endStroke()
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
          }}
          onPointerCancel={() => engineRef.current?.endStroke()}
        />
      </div>
    )
  },
)
