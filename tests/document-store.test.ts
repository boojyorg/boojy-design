import { beforeEach, describe, expect, it } from "vitest"
import { initialDocumentState, useDocumentStore } from "@/editor/state/documentStore"

// Reset to fresh document state before each test (merge keeps the action fns).
beforeEach(() => useDocumentStore.setState(initialDocumentState()))

// INITIAL_LAYERS (mock-data) ids, index 0 = top: ["l4", "l3", "l2", "l1"].
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
