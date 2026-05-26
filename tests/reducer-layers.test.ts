import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useEditorState } from "@/editor/state/useEditorState"

// INITIAL_LAYERS (mock-data) ids, index 0 = top: ["l4", "l3", "l2", "l1"].
describe("layer reducer ops", () => {
  it("moveLayer reorders, and a same-index move is a no-op (state unchanged)", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => result.current[1]({ type: "moveLayer", id: "l4", toIndex: 2 }))
    expect(result.current[0].layers.map((l) => l.id)).toEqual(["l3", "l2", "l4", "l1"])

    const stable = result.current[0]
    act(() => result.current[1]({ type: "moveLayer", id: "l4", toIndex: 2 }))
    expect(result.current[0]).toBe(stable) // from === to → same reference
  })

  it("renameLayer trims, and ignores empty input", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => result.current[1]({ type: "renameLayer", id: "l4", name: "  Sky  " }))
    expect(result.current[0].layers.find((l) => l.id === "l4")?.name).toBe("Sky")

    const stable = result.current[0]
    act(() => result.current[1]({ type: "renameLayer", id: "l4", name: "   " }))
    expect(result.current[0]).toBe(stable) // whitespace-only → unchanged
  })

  it("duplicateLayer inserts a copy above the source and activates it", () => {
    const { result } = renderHook(() => useEditorState())

    act(() => result.current[1]({ type: "duplicateLayer", id: "l3", newId: "dup1" }))

    expect(result.current[0].layers.map((l) => l.id)).toEqual(["l4", "dup1", "l3", "l2", "l1"])
    const copy = result.current[0].layers.find((l) => l.id === "dup1")
    expect(copy?.name).toBe("Layer 3 copy")
    expect(copy?.type).toBe("raster")
    expect(result.current[0].activeLayerId).toBe("dup1")
  })
})
