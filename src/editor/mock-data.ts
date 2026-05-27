import type { Layer } from "@/editor/types"

/**
 * The initial document: an empty working layer over a pinned white **Background**.
 * Index 0 = top of the stack (matches how the Layers panel renders), so the
 * background is last. The background is a real (locked) layer — see `Layer.background`.
 */
export const INITIAL_LAYERS: Layer[] = [
  { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
  { id: "bg", name: "Background", type: "raster", visible: true, opacity: 100, background: true },
]

export const INITIAL_ACTIVE_LAYER_ID = "l1"
/** Next default "Layer N" number — "Layer 1" is taken; "Background" isn't numbered. */
export const INITIAL_NEXT_LAYER_NUM = 2
