import { describe, expect, it } from "vitest"
import type { Command } from "@/editor/state/undoStore"
import { useUndoStore } from "@/editor/state/undoStore"

// vitest.setup clears the undo timeline before each test (module singleton).
const log: string[] = []
function tracer(id: string): Command {
  return { label: id, undo: () => log.push(`undo ${id}`), redo: () => log.push(`redo ${id}`) }
}

describe("undoStore timeline", () => {
  it("tracks canUndo/canRedo and replays commands in order", () => {
    log.length = 0
    const s = useUndoStore.getState()
    expect(s.canUndo).toBe(false)
    expect(s.canRedo).toBe(false)

    s.record(tracer("a"))
    s.record(tracer("b"))
    expect(useUndoStore.getState().canUndo).toBe(true)
    expect(useUndoStore.getState().canRedo).toBe(false)

    useUndoStore.getState().undo() // reverse b (the latest)
    expect(log).toEqual(["undo b"])
    expect(useUndoStore.getState().canRedo).toBe(true)

    useUndoStore.getState().undo() // reverse a
    expect(log).toEqual(["undo b", "undo a"])
    expect(useUndoStore.getState().canUndo).toBe(false)

    useUndoStore.getState().redo() // replay a
    expect(log).toEqual(["undo b", "undo a", "redo a"])
  })

  it("truncates the redo branch when a new command is recorded after an undo", () => {
    const noop: Command = { label: "x", undo: () => {}, redo: () => {} }
    const s = useUndoStore.getState()
    s.record({ ...noop })
    s.record({ ...noop })
    s.undo()
    expect(useUndoStore.getState().canRedo).toBe(true)

    useUndoStore.getState().record({ ...noop })
    expect(useUndoStore.getState().canRedo).toBe(false)
  })

  it("undo/redo on an empty timeline is a safe no-op", () => {
    const s = useUndoStore.getState()
    expect(() => {
      s.undo()
      s.redo()
    }).not.toThrow()
    expect(useUndoStore.getState().canUndo).toBe(false)
  })
})
