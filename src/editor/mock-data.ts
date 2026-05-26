import type { Layer } from "@/editor/types"

/**
 * THROWAWAY scene data — mirrors the prototype's brush-preset layer stack.
 * Index 0 = top of the stack (matches how the Layers panel renders).
 * Isolated here so the mock state never leaks into component code.
 */
export const INITIAL_LAYERS: Layer[] = [
  { id: "l4", name: "Layer 4", type: "raster", visible: true, opacity: 100 },
  { id: "l3", name: "Layer 3", type: "raster", visible: true, opacity: 100 },
  { id: "l2", name: "Rectangle 1", type: "vector", visible: false, opacity: 100, kind: "rect" },
  { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
]

export const INITIAL_ACTIVE_LAYER_ID = "l4"
