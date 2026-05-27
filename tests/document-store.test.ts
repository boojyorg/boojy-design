import { beforeEach, describe, expect, it } from "vitest"
import { useDocumentStore } from "@/editor/state/documentStore"
import { seedMockDocument } from "./fixtures"

// Seed the multi-layer fixture before each test (the app default is a single layer,
// but these ops only mean anything with a stack). MOCK_LAYERS ids, index 0 = top:
// ["l4", "l3", "l2", "l1"].
beforeEach(seedMockDocument)
describe("documentStore layer ops", () => {
  it("moveLayer reorders, and a same-index move is a no-op (array unchanged)", () => {
    const store = useDocumentStore

    store.getState().moveLayer("l4", 2)
    expect(store.getState().layers.map((l) => l.id)).toEqual(["l3", "l2", "l4", "l1"])

    const stable = store.getState().layers
    store.getState().moveLayer("l4", 2)
    expect(store.getState().layers).toBe(stable) // from === to → same array reference
  })

  it("renameLayer trims, and ignores empty input", () => {
    const store = useDocumentStore

    store.getState().renameLayer("l4", "  Sky  ")
    expect(store.getState().layers.find((l) => l.id === "l4")?.name).toBe("Sky")

    const stable = store.getState().layers
    store.getState().renameLayer("l4", "   ")
    expect(store.getState().layers).toBe(stable) // whitespace-only → unchanged
  })

  it("duplicateLayer inserts a copy above the source and activates it", () => {
    const store = useDocumentStore

    store.getState().duplicateLayer("l3", "dup1")

    expect(store.getState().layers.map((l) => l.id)).toEqual(["l4", "dup1", "l3", "l2", "l1"])
    const copy = store.getState().layers.find((l) => l.id === "dup1")
    expect(copy?.name).toBe("Layer 3 copy")
    expect(copy?.type).toBe("raster")
    expect(store.getState().activeLayerId).toBe("dup1")
  })

  it("addLayer prepends a new active layer and bumps the name counter", () => {
    const store = useDocumentStore

    store.getState().addLayer()
    const layers = store.getState().layers
    expect(layers.length).toBe(5)
    expect(layers[0]?.name).toBe("Layer 5")
    expect(store.getState().activeLayerId).toBe(layers[0]?.id)
  })

  it("deleteActiveLayer removes the active layer; refuses to drop the last one", () => {
    const store = useDocumentStore

    store.getState().selectLayer("l2")
    store.getState().deleteActiveLayer()
    expect(store.getState().layers.map((l) => l.id)).toEqual(["l4", "l3", "l1"])
    expect(store.getState().activeLayerId).toBe("l4")

    const top = store.getState().layers[0]
    if (!top) throw new Error("expected a remaining layer")
    useDocumentStore.setState({ layers: [{ ...top }], activeLayerId: top.id })
    const single = store.getState().layers
    store.getState().deleteActiveLayer()
    expect(store.getState().layers).toBe(single) // last layer is protected
  })

  it("toggleLayer flips only the targeted layer's visibility", () => {
    const store = useDocumentStore

    store.getState().toggleLayer("l4")
    expect(store.getState().layers.find((l) => l.id === "l4")?.visible).toBe(false)
    expect(store.getState().layers.find((l) => l.id === "l3")?.visible).toBe(true)
  })
})

describe("documentStore — the background layer is locked", () => {
  const ids = () => useDocumentStore.getState().layers.map((l) => l.id)
  const withBackground = (activeLayerId = "bg") =>
    useDocumentStore.setState({
      layers: [
        { id: "a", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
        {
          id: "bg",
          name: "Background",
          type: "raster",
          visible: true,
          opacity: 100,
          background: true,
        },
      ],
      activeLayerId,
      nextLayerNum: 2,
    })

  it("refuses to delete the background", () => {
    withBackground("bg")
    useDocumentStore.getState().deleteActiveLayer()
    expect(ids()).toEqual(["a", "bg"])
  })

  it("won't move the background and keeps it pinned at the bottom", () => {
    withBackground()
    useDocumentStore.getState().moveLayer("bg", 0) // the background itself can't move
    expect(ids()).toEqual(["a", "bg"])
    useDocumentStore.getState().moveLayer("a", 1) // nothing can land at/below the background
    expect(ids()).toEqual(["a", "bg"])
  })

  it("refuses to duplicate the background", () => {
    withBackground()
    useDocumentStore.getState().duplicateLayer("bg", "dup")
    expect(ids()).toEqual(["a", "bg"])
  })
})
