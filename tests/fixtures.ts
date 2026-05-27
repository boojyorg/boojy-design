import { useDocumentStore } from "@/editor/state/documentStore"
import type { Layer } from "@/editor/types"

/**
 * A multi-layer stack for the pure store/command tests, whose whole point is
 * reorder / duplicate / delete — behaviours that are meaningless with a single
 * layer. The *app's* real default is one empty layer (see mock-data.ts); these
 * tests deliberately seed their own richer fixture instead.
 * Index 0 = top of the stack.
 */
export const MOCK_LAYERS: Layer[] = [
  { id: "l4", name: "Layer 4", type: "raster", visible: true, opacity: 100 },
  { id: "l3", name: "Layer 3", type: "raster", visible: true, opacity: 100 },
  { id: "l2", name: "Rectangle 1", type: "vector", visible: false, opacity: 100, kind: "rect" },
  { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
]

/** Seed the document store with {@link MOCK_LAYERS} (active = "l4"). */
export function seedMockDocument() {
  useDocumentStore.setState({
    layers: MOCK_LAYERS.map((l) => ({ ...l })),
    activeLayerId: "l4",
    nextLayerNum: MOCK_LAYERS.length + 1,
  })
}
