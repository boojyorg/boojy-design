import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EditorV1 } from "@/editor/EditorV1"

function renderEditor() {
  return render(<EditorV1 />)
}

describe("EditorV1 shell", () => {
  it("renders the three regions (top bar, tool rail, canvas, sidebar)", () => {
    renderEditor()
    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Tools" })).toBeInTheDocument()
    expect(screen.getByTestId("canvas-stage")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-reserved")).toBeInTheDocument()
  })

  it("defaults to the Brush tool with Size, Hardness, Opacity and Color props", () => {
    renderEditor()
    const props = screen.getByTestId("tool-props")
    expect(within(props).getByText("Size")).toBeInTheDocument()
    expect(within(props).getByText("Hardness")).toBeInTheDocument()
    expect(within(props).getByText("Opacity")).toBeInTheDocument()
    expect(within(props).getByText("Color")).toBeInTheDocument()
  })

  it("swaps to Shape props (Rectangle/Ellipse + Fill) when Shape is picked", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Shape (R)" }))
    const props = screen.getByTestId("tool-props")
    expect(within(props).getByRole("button", { name: "Rectangle" })).toBeInTheDocument()
    expect(within(props).getByRole("button", { name: "Ellipse" })).toBeInTheDocument()
    expect(within(props).getByText("Fill")).toBeInTheDocument()
  })

  it("shows Eraser props without a Color control", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Eraser (E)" }))
    const props = screen.getByTestId("tool-props")
    expect(within(props).getByText("Hardness")).toBeInTheDocument()
    expect(within(props).queryByText("Color")).not.toBeInTheDocument()
  })

  it("shows a hint instead of controls for the Hand tool", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Hand (H)" }))
    expect(screen.getByText(/Drag to pan · scroll to zoom/)).toBeInTheDocument()
  })

  it("disables non-MVP tools (Move, Text) with a coming-in-v0.5 affordance", () => {
    renderEditor()
    const move = screen.getByRole("button", { name: "Move — coming in v0.5" })
    const text = screen.getByRole("button", { name: "Text — coming in v0.5" })
    expect(move).toHaveAttribute("aria-disabled", "true")
    expect(text).toHaveAttribute("aria-disabled", "true")

    // Clicking a disabled tool must not change the active tool (Brush props stay).
    fireEvent.click(move)
    expect(within(screen.getByTestId("tool-props")).getByText("Color")).toBeInTheDocument()
  })

  it("steps the zoom level with the +/- controls", () => {
    renderEditor()
    expect(screen.getByText("75%")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(screen.getByText("100%")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(screen.getByText("50%")).toBeInTheDocument()
  })

  it("updates a slider's value via keyboard", () => {
    renderEditor()
    const sliders = screen.getAllByRole("slider")
    const sizeSlider = sliders[0]
    expect(sizeSlider).toBeDefined()
    if (!sizeSlider) return
    expect(sizeSlider).toHaveAttribute("aria-valuenow", "30")
    fireEvent.keyDown(sizeSlider, { key: "ArrowRight" })
    expect(sizeSlider).toHaveAttribute("aria-valuenow", "31")
    expect(screen.getByText("31")).toBeInTheDocument()
  })

  it("toggles a layer's visibility", () => {
    renderEditor()
    const hide = screen.getByRole("button", { name: "Hide Layer 4" })
    fireEvent.click(hide)
    expect(screen.getByRole("button", { name: "Show Layer 4" })).toBeInTheDocument()
  })

  it("selects a layer on click", () => {
    renderEditor()
    expect(screen.getByRole("option", { name: "Layer 4", selected: true })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: "Layer 1" }))
    expect(screen.getByRole("option", { name: "Layer 1", selected: true })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Layer 4", selected: false })).toBeInTheDocument()
  })

  it("adds a new active layer and deletes the active layer", () => {
    renderEditor()
    expect(screen.getAllByRole("option")).toHaveLength(4)

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }))
    expect(screen.getAllByRole("option")).toHaveLength(5)
    expect(screen.getByRole("option", { name: "Layer 5", selected: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete layer" }))
    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(screen.queryByRole("option", { name: "Layer 5" })).not.toBeInTheDocument()
  })

  it("collapses the sidebar without removing the reserved canvas layout space", () => {
    renderEditor()
    const reserved = screen.getByTestId("sidebar-reserved")
    const panel = screen.getByTestId("sidebar-panel")
    expect(panel).toHaveAttribute("data-collapsed", "false")

    fireEvent.click(screen.getByRole("button", { name: "Hide panels" }))

    // Panel collapses, but the 288px reserving wrapper and canvas remain — so
    // the canvas surface cannot shift.
    expect(panel).toHaveAttribute("data-collapsed", "true")
    expect(reserved).toBeInTheDocument()
    expect(reserved).toHaveClass("w-72")
    expect(screen.getByTestId("canvas-stage")).toBeInTheDocument()
  })

  it("makes the collapsed sidebar inert (keeps focus out)", () => {
    renderEditor()
    const panel = screen.getByTestId("sidebar-panel")
    expect(panel).not.toHaveAttribute("inert")
    fireEvent.click(screen.getByRole("button", { name: "Hide panels" }))
    expect(panel).toHaveAttribute("inert")
  })

  it("selects a tool with a keyboard shortcut (E → Eraser)", () => {
    renderEditor()
    expect(within(screen.getByTestId("tool-props")).getByText("Color")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "e" })
    expect(within(screen.getByTestId("tool-props")).queryByText("Color")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eraser (E)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("ignores shortcuts for non-MVP tools (V/T do nothing)", () => {
    renderEditor()
    fireEvent.keyDown(document.body, { key: "v" })
    // Still Brush — Color prop remains.
    expect(within(screen.getByTestId("tool-props")).getByText("Color")).toBeInTheDocument()
  })

  it("zooms and nudges brush size via keyboard", () => {
    renderEditor()
    expect(screen.getByText("75%")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "=" })
    expect(screen.getByText("100%")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "]" })
    expect(screen.getByText("35")).toBeInTheDocument()
  })
})
