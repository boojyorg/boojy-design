import { fireEvent, render, renderHook, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { TopBar } from "@/editor/TopBar/TopBar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

const noop = () => {}

function renderTopBar(overrides: Partial<ComponentProps<typeof TopBar>> = {}) {
  const props: ComponentProps<typeof TopBar> = {
    tool: "brush",
    brushSize: 30,
    hardness: 80,
    opacity: 100,
    foreground: "#E89940",
    fillTolerance: 20,
    zoom: 100,
    rightCollapsed: false,
    onBrushSize: noop,
    onHardness: noop,
    onOpacity: noop,
    onForeground: noop,
    onFillTolerance: noop,
    onZoomIn: noop,
    onZoomOut: noop,
    onToggleRight: noop,
    onExport: noop,
    onOpen: noop,
    onSave: noop,
    onImportImage: noop,
    onUndo: noop,
    onRedo: noop,
    canUndo: false,
    canRedo: false,
    ...overrides,
  }
  return render(<TopBar {...props} />)
}

describe("undo/redo keyboard shortcuts", () => {
  it("⌘Z triggers undo, ⌘⇧Z triggers redo, neither changes the tool", () => {
    const dispatch = vi.fn()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    renderHook(() => useKeyboardShortcuts(dispatch, { onUndo, onRedo }))

    fireEvent.keyDown(document.body, { key: "z", metaKey: true })
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).not.toHaveBeenCalled()

    fireEvent.keyDown(document.body, { key: "z", metaKey: true, shiftKey: true })
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("ignores ⌘Z while typing in an input (native text undo wins)", () => {
    const onUndo = vi.fn()
    renderHook(() => useKeyboardShortcuts(vi.fn(), { onUndo }))
    render(<input aria-label="field" />)

    fireEvent.keyDown(screen.getByLabelText("field"), { key: "z", metaKey: true })
    expect(onUndo).not.toHaveBeenCalled()
  })
})

describe("undo/redo toolbar buttons", () => {
  it("disables Undo/Redo when there is nothing to undo/redo", () => {
    renderTopBar({ canUndo: false, canRedo: false })
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled()
  })

  it("fires the handlers when the enabled buttons are clicked", () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    renderTopBar({ canUndo: true, canRedo: true, onUndo, onRedo })

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    fireEvent.click(screen.getByRole("button", { name: "Redo" }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
  })
})
