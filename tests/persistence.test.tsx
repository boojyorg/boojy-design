import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AppMenu } from "@/editor/TopBar/AppMenu"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

describe("AppMenu document actions", () => {
  it("fires Open, Save and Import image from their menu items", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const onSave = vi.fn()
    const onImportImage = vi.fn()
    render(
      <AppMenu onOpen={onOpen} onSave={onSave} onImportImage={onImportImage} onExport={() => {}} />,
    )

    await user.click(screen.getByRole("button")) // open the Design menu
    await user.click(await screen.findByText("Open…"))
    expect(onOpen).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button"))
    await user.click(await screen.findByText("Save"))
    expect(onSave).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button"))
    await user.click(await screen.findByText("Import image…"))
    expect(onImportImage).toHaveBeenCalledTimes(1)
  })
})

describe("save / open keyboard shortcuts", () => {
  it("⌘S saves and ⌘O opens, neither changes the tool", () => {
    const dispatch = vi.fn()
    const onSave = vi.fn()
    const onOpen = vi.fn()
    renderHook(() => useKeyboardShortcuts(dispatch, { onSave, onOpen }))

    act(() => fireEvent.keyDown(document.body, { key: "s", metaKey: true }))
    expect(onSave).toHaveBeenCalledTimes(1)

    act(() => fireEvent.keyDown(document.body, { key: "o", metaKey: true }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("ignores ⌘S while typing in an input (native behaviour wins)", () => {
    const onSave = vi.fn()
    renderHook(() => useKeyboardShortcuts(vi.fn(), { onSave }))
    render(<input aria-label="field" />)

    fireEvent.keyDown(screen.getByLabelText("field"), { key: "s", metaKey: true })
    expect(onSave).not.toHaveBeenCalled()
  })
})
