import { CanvasArt } from "@/editor/Canvas/CanvasArt"

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CanvasStage — THE ENGINE SEAM.
 *
 *  In the shell this renders a static placeholder (<CanvasArt/>) on a dotted
 *  backdrop. When the real editor is built, the Konva (or Pixi / raw-canvas)
 *  stage replaces the inner surface here — and nothing in the surrounding
 *  chrome (top bar, rail, sidebar) should need to change.
 *
 *  Keep this component dumb: no editor state, no engine scaffolding.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function CanvasStage() {
  return (
    <div
      data-testid="canvas-stage"
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-editor"
    >
      <div className="canvas-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="canvas-surface relative">
        <CanvasArt width={820} height={540} />
      </div>
    </div>
  )
}
