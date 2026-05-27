import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EditorV1 } from "@/editor/EditorV1"
import { useEditorState } from "@/editor/state/useEditorState"
import { AppMenu } from "@/editor/TopBar/AppMenu"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

describe("PNG export wiring", () => {
  it("fires onExport when the Export… menu item is selected", async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(
      <AppMenu onExport={onExport} onOpen={() => {}} onSave={() => {}} onImportImage={() => {}} />,
    )

    await user.click(screen.getByRole("button")) // open the Design menu
    await user.click(await screen.findByText("Export…"))

    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it("⌘E / Ctrl+E triggers export without changing the tool", () => {
    const dispatch = vi.fn()
    const onExport = vi.fn()
    renderHook(() => useKeyboardShortcuts(dispatch, { onExport }))

    act(() => {
      fireEvent.keyDown(document.body, { key: "e", metaKey: true })
    })

    expect(onExport).toHaveBeenCalledTimes(1)
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe("editable foreground colour", () => {
  it("setForeground updates the foreground colour in state", () => {
    const { result } = renderHook(() => useEditorState())
    expect(result.current[0].foreground).toBe("#E89940")

    act(() => result.current[1]({ type: "setForeground", color: "#123456" }))

    expect(result.current[0].foreground).toBe("#123456")
  })

  it("opens the colour picker from the brush colour chip", async () => {
    const user = userEvent.setup()
    render(<EditorV1 />)

    // Two buttons carry the "Foreground color" label (top-bar chip + rail swatch);
    // scope to the tool-props zone for the chip.
    const chip = within(screen.getByTestId("tool-props")).getByRole("button", {
      name: "Foreground color",
    })
    await user.click(chip)

    expect(await screen.findByLabelText("Hex color")).toBeInTheDocument()
  })
})
