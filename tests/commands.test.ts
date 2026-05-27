import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  type PixelPort,
  runDeleteLayer,
  runDuplicateLayer,
  runUndoable,
} from "@/editor/state/commands"
import { useDocumentStore } from "@/editor/state/documentStore"
import type { Command } from "@/editor/state/undoStore"
import { seedMockDocument } from "./fixtures"

// The app default is a single layer; seed the multi-layer fixture so the layer
// ops here are meaningful. MOCK_LAYERS: ["l4","l3","l2","l1"].
beforeEach(seedMockDocument)
function recorder() {
  const commands: Command[] = []
  return { record: (c: Command) => commands.push(c), commands }
}
function firstCommand(commands: Command[]): Command {
  const c = commands[0]
  if (!c) throw new Error("expected a recorded command")
  return c
}
const ids = () => useDocumentStore.getState().layers.map((l) => l.id)
const fakePort = (canvas: HTMLCanvasElement | null): PixelPort => ({
  captureLayerPixels: vi.fn(() => canvas),
  stashPixelRestore: vi.fn(),
  getLayerTransform: vi.fn(() => ({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 })),
  setLayerTransform: vi.fn(),
})

describe("runUndoable", () => {
  it("records a metadata change and round-trips it", () => {
    const { record, commands } = recorder()
    runUndoable("reorder", () => useDocumentStore.getState().moveLayer("l4", 2), record)
    expect(ids()).toEqual(["l3", "l2", "l4", "l1"])

    const cmd = firstCommand(commands)
    cmd.undo()
    expect(ids()).toEqual(["l4", "l3", "l2", "l1"])
    cmd.redo()
    expect(ids()).toEqual(["l3", "l2", "l4", "l1"])
  })

  it("records nothing when the mutation is a no-op (empty rename)", () => {
    const { record, commands } = recorder()
    runUndoable("rename", () => useDocumentStore.getState().renameLayer("l4", "   "), record)
    expect(commands).toHaveLength(0)
  })
})

describe("runDeleteLayer", () => {
  it("captures pixels before delete and restores the layer + pixels on undo", () => {
    const { record, commands } = recorder()
    const captured = document.createElement("canvas")
    const port = fakePort(captured)

    runDeleteLayer(port, record) // active is l4 by default
    expect(port.captureLayerPixels).toHaveBeenCalledWith("l4")
    expect(ids()).toEqual(["l3", "l2", "l1"])

    firstCommand(commands).undo()
    expect(ids()).toEqual(["l4", "l3", "l2", "l1"])
    expect(useDocumentStore.getState().activeLayerId).toBe("l4")
    expect(port.stashPixelRestore).toHaveBeenCalledWith("l4", captured)
  })

  it("records nothing when the last layer is protected", () => {
    useDocumentStore.setState({
      layers: [{ id: "only", name: "Only", type: "raster", visible: true, opacity: 100 }],
      activeLayerId: "only",
    })
    const { record, commands } = recorder()
    runDeleteLayer(fakePort(null), record)
    expect(commands).toHaveLength(0)
    expect(ids()).toEqual(["only"])
  })
})

describe("runDuplicateLayer", () => {
  it("inserts a reversible copy; redo replays the captured pixels deterministically", () => {
    const { record, commands } = recorder()
    const captured = document.createElement("canvas")
    const port = fakePort(captured)

    runDuplicateLayer("l3", "dup1", port, record)
    expect(port.captureLayerPixels).toHaveBeenCalledWith("l3")
    expect(port.stashPixelRestore).toHaveBeenCalledWith("dup1", captured)
    expect(ids()).toEqual(["l4", "dup1", "l3", "l2", "l1"])

    const cmd = firstCommand(commands)
    cmd.undo()
    expect(ids()).toEqual(["l4", "l3", "l2", "l1"])

    vi.mocked(port.stashPixelRestore).mockClear()
    cmd.redo()
    expect(ids()).toEqual(["l4", "dup1", "l3", "l2", "l1"])
    expect(port.stashPixelRestore).toHaveBeenCalledWith("dup1", captured)
  })

  it("copies the source layer's transform onto the duplicate (lands in place)", () => {
    const { record } = recorder()
    const port = fakePort(null)
    const transform = { x: 12, y: -4, scaleX: 1.5, scaleY: 0.7, rotation: 0.2 }
    vi.mocked(port.getLayerTransform).mockReturnValue(transform)

    runDuplicateLayer("l3", "dup1", port, record)
    expect(port.getLayerTransform).toHaveBeenCalledWith("l3")
    expect(port.setLayerTransform).toHaveBeenCalledWith("dup1", transform)
  })
})
