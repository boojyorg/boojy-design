import { describe, expect, it } from "vitest"
import { HistoryStack } from "@/editor/Canvas/engine/history"

describe("HistoryStack", () => {
  it("starts empty — nothing to undo or redo", () => {
    const h = new HistoryStack<string>()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
    expect(h.undo()).toBeUndefined()
    expect(h.redo()).toBeUndefined()
  })

  it("undoes then redoes the latest entry", () => {
    const h = new HistoryStack<string>()
    h.push("a")
    h.push("b")
    expect(h.canUndo()).toBe(true)
    expect(h.canRedo()).toBe(false)

    expect(h.undo()).toBe("b")
    expect(h.canRedo()).toBe(true)
    expect(h.undo()).toBe("a")
    expect(h.canUndo()).toBe(false)

    expect(h.redo()).toBe("a")
    expect(h.redo()).toBe("b")
    expect(h.canRedo()).toBe(false)
  })

  it("truncates the redo branch when a new entry is pushed after an undo", () => {
    const h = new HistoryStack<string>()
    h.push("a")
    h.push("b")
    h.push("c")
    h.undo() // c
    h.undo() // b → redo branch holds [c, b]
    expect(h.canRedo()).toBe(true)

    h.push("d") // new branch — redo discarded
    expect(h.canRedo()).toBe(false)
    expect(h.undo()).toBe("d")
    expect(h.undo()).toBe("a")
  })

  it("caps depth and drops the oldest entry", () => {
    const h = new HistoryStack<number>(2)
    h.push(1)
    h.push(2)
    h.push(3) // 1 drops off the bottom
    expect(h.undo()).toBe(3)
    expect(h.undo()).toBe(2)
    expect(h.undo()).toBeUndefined() // 1 is gone
  })

  it("prunes matching entries from both branches", () => {
    const h = new HistoryStack<{ layerId: string }>()
    h.push({ layerId: "l1" })
    h.push({ layerId: "l2" })
    h.push({ layerId: "l1" })
    h.undo() // moves the second l1 to the redo branch

    h.prune((e) => e.layerId === "l1")

    // Only the l2 entry survives, in the undo branch.
    expect(h.canRedo()).toBe(false)
    expect(h.undo()).toEqual({ layerId: "l2" })
    expect(h.canUndo()).toBe(false)
  })
})
