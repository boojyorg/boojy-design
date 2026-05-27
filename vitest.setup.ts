import "@testing-library/jest-dom/vitest"
import { beforeEach } from "vitest"
import { initialDocumentState, useDocumentStore } from "@/editor/state/documentStore"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import { useUndoStore } from "@/editor/state/undoStore"

// The document, undo and thumbnail stores are module singletons, so their state would
// otherwise leak between tests (the old per-render useReducer reset for free). Restore
// fresh document state and clear the undo timeline + thumbnails before every dom test.
beforeEach(() => {
  useDocumentStore.setState(initialDocumentState())
  useUndoStore.getState().clear()
  useThumbnailStore.getState().clearThumbnails()
})

// jsdom lacks several browser APIs that Radix primitives depend on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => undefined
Element.prototype.releasePointerCapture ??= () => undefined
Element.prototype.scrollIntoView ??= () => undefined

// jsdom can't rasterize. The canvas engine capability-guards on a null 2D context
// and no-ops; stub getContext to return null *silently* so the guard fires without
// jsdom's noisy "not implemented" warnings. (Not a canvas mock — no rasterization.)
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext
