import { create } from "zustand"
import { DOC_HEIGHT, DOC_WIDTH } from "@/editor/Canvas/engine/types"
import { fitView, type ViewState, zoomAtPoint } from "@/editor/Canvas/engine/viewport"

/**
 * Canvas viewport — zoom (%) plus a pan offset (screen px), and the live container size
 * so zoom can anchor correctly (buttons → viewport centre, wheel → cursor). This is the
 * single source of truth for the view: CanvasStage applies it to the engine and routes
 * gestures (scroll / pinch / drag) back here.
 *
 * It is *view* state, not document state — per-session, and deliberately NOT saved in
 * `.design` (opening a file never carries someone else's scroll position). Module
 * singleton, so `reset()` is called in vitest.setup.
 */
const INITIAL_ZOOM = 75 // matches the shell's previous default
const FIT_PADDING = 48

interface ViewportState extends ViewState {
  /** Measured stage size, reported by CanvasStage; lets zoom anchor to the viewport centre. */
  containerW: number
  containerH: number
  setContainerSize: (w: number, h: number) => void
  /** Zoom by a percentage delta, anchored at the viewport centre (buttons / +/-). */
  nudgeZoom: (delta: number) => void
  /** Zoom by a multiplicative factor toward a screen point (wheel / pinch). */
  zoomAtCursor: (factor: number, screenX: number, screenY: number) => void
  /** Pan by a screen-space delta (scroll / drag). */
  panBy: (dx: number, dy: number) => void
  /** Fit the page in the viewport with a margin (⌘0). */
  fitToScreen: () => void
  /** Reset to 100%, centred (⌘1). */
  zoom100: () => void
  /** Restore defaults (test teardown). */
  reset: () => void
}

const INITIAL = { zoom: INITIAL_ZOOM, panX: 0, panY: 0, containerW: 1, containerH: 1 }

export const useViewportStore = create<ViewportState>()((set) => ({
  ...INITIAL,
  setContainerSize: (containerW, containerH) => set({ containerW, containerH }),
  nudgeZoom: (delta) =>
    set((s) =>
      zoomAtPoint(
        s,
        s.containerW,
        s.containerH,
        DOC_WIDTH,
        DOC_HEIGHT,
        s.zoom + delta,
        s.containerW / 2,
        s.containerH / 2,
      ),
    ),
  zoomAtCursor: (factor, screenX, screenY) =>
    set((s) =>
      zoomAtPoint(
        s,
        s.containerW,
        s.containerH,
        DOC_WIDTH,
        DOC_HEIGHT,
        s.zoom * factor,
        screenX,
        screenY,
      ),
    ),
  panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
  fitToScreen: () =>
    set((s) => fitView(s.containerW, s.containerH, DOC_WIDTH, DOC_HEIGHT, FIT_PADDING)),
  zoom100: () => set({ zoom: 100, panX: 0, panY: 0 }),
  reset: () => set(INITIAL),
}))
