import { create } from "zustand"

/**
 * Per-layer preview thumbnails (layerId → data: URL PNG), derived from the engine's
 * pixel buffers. Kept out of the document model — these are ephemeral, pixel-derived
 * previews, not part of the document — and regenerated from pixels on document open.
 *
 * The engine notifies on every buffer mutation (`setOnLayerPixelsChanged`); CanvasStage
 * turns that into a downscaled dataURL and writes it here, and the Layers panel reads it.
 * A layer with no entry falls back to its static placeholder icon.
 */
interface ThumbnailState {
  cache: Map<string, string>
  /** Store/replace a layer's thumbnail. Copies the Map so subscribers re-render. */
  setThumbnail: (layerId: string, dataUrl: string) => void
  /** Drop every thumbnail (on opening a new document). */
  clearThumbnails: () => void
}

export const useThumbnailStore = create<ThumbnailState>()((set) => ({
  cache: new Map(),
  setThumbnail: (layerId, dataUrl) =>
    set((s) => ({ cache: new Map(s.cache).set(layerId, dataUrl) })),
  clearThumbnails: () => set({ cache: new Map() }),
}))
