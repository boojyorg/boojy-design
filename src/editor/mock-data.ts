import type { Layer } from "@/editor/types"

/**
 * The initial document: a single empty raster layer — a blank canvas, not a demo
 * scene. (This used to seed a four-layer mock stack from the shell prototype.)
 * Index 0 = top of the stack (matches how the Layers panel renders).
 */
export const INITIAL_LAYERS: Layer[] = [
  { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
]

export const INITIAL_ACTIVE_LAYER_ID = "l1"
