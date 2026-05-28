import { create } from "zustand"
import { INITIAL_ACTIVE_LAYER_ID, INITIAL_LAYERS, INITIAL_NEXT_LAYER_NUM } from "@/editor/mock-data"
import { newLayerId } from "@/editor/state/ids"
import type { Layer, LayerType } from "@/editor/types"

/**
 * The document model — the layer stack and which layer is active. Graduated out
 * of the shell reducer (`useEditorState`) into its own Zustand store as the first
 * step toward a real document/undo split. Layer *metadata* lives here; layer
 * *pixels* stay in the engine behind the CanvasStage seam.
 *
 * Logic here is a verbatim move of the reducer's layer cases — no behaviour
 * change. The unified undo timeline (Stage 2) will wrap these actions in commands;
 * for now they mutate directly and the engine re-syncs from `layers` as before.
 */
export interface DocumentState {
  layers: Layer[]
  activeLayerId: string
  /** Monotonic counter for default "Layer N" names. */
  nextLayerNum: number

  selectLayer: (id: string) => void
  toggleLayer: (id: string) => void
  addLayer: (name?: string, layerType?: LayerType) => void
  deleteActiveLayer: () => void
  moveLayer: (id: string, toIndex: number) => void
  renameLayer: (id: string, name: string) => void
  duplicateLayer: (id: string, newId: string) => void
  /** Insert a pasted raster layer at the top of the stack and make it active. Uses a
   *  caller-supplied id so the chrome can pre-stash pixels against it before the sync. */
  pasteLayer: (newId: string, name: string) => void
  setLayerOpacity: (id: string, opacity: number) => void
  /** Insert a new live text layer. Caller supplies the id so the engine can pre-set the
   *  transform (position) before the store update triggers syncLayers. */
  addTextLayer: (id: string, name?: string) => void
  setLayerText: (id: string, content: string) => void
  setLayerFontSize: (id: string, size: number) => void
  setLayerTextColor: (id: string, color: string) => void
}

/** The serialisable document slice — what persistence saves and what undo's mementos
 *  snapshot. Excludes the action functions. */
export type DocumentSnapshot = Pick<DocumentState, "layers" | "activeLayerId" | "nextLayerNum">

/** Fresh initial document state (cloned so resets never alias the mock arrays). */
export function initialDocumentState(): DocumentSnapshot {
  return {
    layers: INITIAL_LAYERS.map((l) => ({ ...l })),
    activeLayerId: INITIAL_ACTIVE_LAYER_ID,
    nextLayerNum: INITIAL_NEXT_LAYER_NUM,
  }
}

/** The pinned background layer's index, or -1 if the document has none (legacy docs). */
function backgroundIndex(layers: Layer[]): number {
  return layers.findIndex((l) => l.background)
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return arr
  next.splice(to, 0, moved)
  return next
}

export const useDocumentStore = create<DocumentState>()((set) => ({
  ...initialDocumentState(),

  selectLayer: (id) => set({ activeLayerId: id }),

  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),

  addLayer: (name, layerType) =>
    set((s) => {
      const layer: Layer = {
        id: newLayerId(),
        name: name ?? `Layer ${s.nextLayerNum}`,
        type: layerType ?? "raster",
        visible: true,
        opacity: 100,
      }
      return {
        layers: [layer, ...s.layers],
        activeLayerId: layer.id,
        nextLayerNum: s.nextLayerNum + 1,
      }
    }),

  deleteActiveLayer: () =>
    set((s) => {
      if (s.layers.length <= 1) return s
      // The background layer is locked — it can't be deleted.
      if (s.layers.find((l) => l.id === s.activeLayerId)?.background) return s
      const remaining = s.layers.filter((l) => l.id !== s.activeLayerId)
      return { layers: remaining, activeLayerId: remaining[0]?.id ?? "" }
    }),

  moveLayer: (id, toIndex) =>
    set((s) => {
      const from = s.layers.findIndex((l) => l.id === id)
      if (from === -1) return s
      // The background stays pinned at the bottom: it can't move, and nothing lands at/below it.
      if (s.layers[from]?.background) return s
      const bg = backgroundIndex(s.layers)
      const maxIndex = bg === -1 ? s.layers.length - 1 : bg - 1
      const to = Math.min(maxIndex, Math.max(0, toIndex))
      if (from === to) return s
      return { layers: arrayMove(s.layers, from, to) }
    }),

  renameLayer: (id, name) =>
    set((s) => {
      const trimmed = name.trim()
      if (!trimmed) return s
      return { layers: s.layers.map((l) => (l.id === id ? { ...l, name: trimmed } : l)) }
    }),

  duplicateLayer: (id, newId) =>
    set((s) => {
      const i = s.layers.findIndex((l) => l.id === id)
      const src = s.layers[i]
      // The background can't be duplicated (converting it to a normal layer is deferred).
      if (!src || src.background) return s
      // Insert the copy at the source's index → directly above it (index 0 = top).
      const copy: Layer = { ...src, id: newId, name: `${src.name} copy` }
      const layers = [...s.layers.slice(0, i), copy, ...s.layers.slice(i)]
      return { layers, activeLayerId: copy.id }
    }),

  pasteLayer: (newId, name) =>
    set((s) => {
      const layer: Layer = { id: newId, name, type: "raster", visible: true, opacity: 100 }
      return { layers: [layer, ...s.layers], activeLayerId: layer.id }
    }),

  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, opacity: Math.round(opacity) } : l)),
    })),

  addTextLayer: (id, name) =>
    set((s) => {
      const layer: Layer = {
        id,
        name: name ?? `Text ${s.nextLayerNum}`,
        type: "text",
        visible: true,
        opacity: 100,
        textContent: "",
        fontSize: 40,
        textColor: "#000000",
      }
      return {
        layers: [layer, ...s.layers],
        activeLayerId: layer.id,
        nextLayerNum: s.nextLayerNum + 1,
      }
    }),

  setLayerText: (id, content) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, textContent: content } : l)),
    })),

  setLayerFontSize: (id, size) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, fontSize: size } : l)),
    })),

  setLayerTextColor: (id, color) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, textColor: color } : l)),
    })),
}))
