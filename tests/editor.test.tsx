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

  it("shows only Fill in the top bar for Shape (the rect/ellipse picker moved to the rail)", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Shape (R)" }))
    const props = screen.getByTestId("tool-props")
    expect(within(props).getByText("Fill")).toBeInTheDocument()
    expect(within(props).queryByRole("button", { name: "Rectangle" })).not.toBeInTheDocument()
    expect(within(props).queryByRole("button", { name: "Ellipse" })).not.toBeInTheDocument()
  })

  it("reveals the shape flyout only while the Shape tool is active", () => {
    renderEditor()
    expect(screen.queryByTestId("shape-flyout")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Shape (R)" }))
    const flyout = screen.getByTestId("shape-flyout")
    expect(within(flyout).getByRole("button", { name: "Rectangle" })).toBeInTheDocument()
    expect(within(flyout).getByRole("button", { name: "Ellipse" })).toBeInTheDocument()

    // Leaving the tool hides it again.
    fireEvent.click(screen.getByRole("button", { name: "Eraser (E)" }))
    expect(screen.queryByTestId("shape-flyout")).not.toBeInTheDocument()
  })

  it("toggles the shape kind from the flyout (Rectangle ⇄ Ellipse)", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Shape (R)" }))
    const flyout = screen.getByTestId("shape-flyout")
    const rect = within(flyout).getByRole("button", { name: "Rectangle" })
    const ellipse = within(flyout).getByRole("button", { name: "Ellipse" })

    // Defaults to Rectangle.
    expect(rect).toHaveAttribute("aria-pressed", "true")
    expect(ellipse).toHaveAttribute("aria-pressed", "false")

    // Picking Ellipse round-trips through the reducer.
    fireEvent.click(ellipse)
    expect(ellipse).toHaveAttribute("aria-pressed", "true")
    expect(rect).toHaveAttribute("aria-pressed", "false")
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

  it("selects the Eyedropper and shows the pick-a-colour hint", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Eyedropper (I)" }))
    expect(screen.getByRole("button", { name: "Eyedropper (I)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByTestId("tool-props")).toHaveTextContent("Click the canvas to pick a colour")
  })

  it("selects the Eyedropper with the I shortcut", () => {
    renderEditor()
    fireEvent.keyDown(document.body, { key: "i" })
    expect(screen.getByRole("button", { name: "Eyedropper (I)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("selects the Fill tool (click or G) and shows Tolerance + Color props", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Fill (G)" }))
    expect(screen.getByRole("button", { name: "Fill (G)" })).toHaveAttribute("aria-pressed", "true")
    const props = screen.getByTestId("tool-props")
    expect(within(props).getByText("Tolerance")).toBeInTheDocument()
    expect(within(props).getByText("Color")).toBeInTheDocument()
  })

  it("selects the Fill tool with the G shortcut", () => {
    renderEditor()
    fireEvent.keyDown(document.body, { key: "g" })
    expect(screen.getByRole("button", { name: "Fill (G)" })).toHaveAttribute("aria-pressed", "true")
  })

  it("selects the Move tool (click or V) and shows the drag-to-move hint", () => {
    renderEditor()
    fireEvent.click(screen.getByRole("button", { name: "Move (V)" }))
    expect(screen.getByRole("button", { name: "Move (V)" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("tool-props")).toHaveTextContent("Drag a layer to move it")
  })

  it("selects the Move tool with the V shortcut", () => {
    renderEditor()
    fireEvent.keyDown(document.body, { key: "v" })
    expect(screen.getByRole("button", { name: "Move (V)" })).toHaveAttribute("aria-pressed", "true")
  })

  it("disables the non-MVP Text tool with a coming-in-v0.5 affordance", () => {
    renderEditor()
    const text = screen.getByRole("button", { name: "Text — coming in v0.5" })
    expect(text).toHaveAttribute("aria-disabled", "true")

    // Clicking a disabled tool must not change the active tool (Brush props stay).
    fireEvent.click(text)
    expect(within(screen.getByTestId("tool-props")).getByText("Color")).toBeInTheDocument()
  })

  it("steps the zoom level with the +/- controls", () => {
    renderEditor()
    // Buttons step a preset ladder (…67, 75, 80, 90…), not a fixed ±25.
    expect(screen.getByText("75%")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(screen.getByText("80%")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(screen.getByText("67%")).toBeInTheDocument()
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
    const hide = screen.getByRole("button", { name: "Hide Layer 1" })
    fireEvent.click(hide)
    expect(screen.getByRole("button", { name: "Show Layer 1" })).toBeInTheDocument()
  })

  it("selects a layer on click", () => {
    renderEditor()
    // The document opens with one layer; add a second so there's something to select between.
    expect(screen.getByRole("option", { name: "Layer 1", selected: true })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Add layer" }))
    expect(screen.getByRole("option", { name: "Layer 2", selected: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("option", { name: "Layer 1" }))
    expect(screen.getByRole("option", { name: "Layer 1", selected: true })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Layer 2", selected: false })).toBeInTheDocument()
  })

  it("adds a new active layer and deletes the active layer", () => {
    renderEditor()
    expect(screen.getAllByRole("option")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Add layer" }))
    expect(screen.getAllByRole("option")).toHaveLength(2)
    expect(screen.getByRole("option", { name: "Layer 2", selected: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete layer" }))
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.queryByRole("option", { name: "Layer 2" })).not.toBeInTheDocument()
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

  it("ignores shortcuts for the non-MVP Text tool (T does nothing)", () => {
    renderEditor()
    fireEvent.keyDown(document.body, { key: "t" })
    // Still Brush — Color prop remains.
    expect(within(screen.getByTestId("tool-props")).getByText("Color")).toBeInTheDocument()
  })

  it("zooms and nudges brush size via keyboard", () => {
    renderEditor()
    expect(screen.getByText("75%")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "=" })
    expect(screen.getByText("80%")).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: "]" })
    expect(screen.getByText("35")).toBeInTheDocument()
  })

  it("renames a layer inline via double-click", () => {
    renderEditor()
    fireEvent.doubleClick(screen.getByText("Layer 1"))
    const input = screen.getByRole("textbox", { name: "Rename Layer 1" })
    fireEvent.change(input, { target: { value: "Sky" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByRole("option", { name: "Sky" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Layer 1" })).not.toBeInTheDocument()
  })

  it("duplicates the active layer above itself", () => {
    renderEditor()
    expect(screen.getAllByRole("option")).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Duplicate layer" }))
    expect(screen.getAllByRole("option")).toHaveLength(2)
    expect(screen.getByRole("option", { name: "Layer 1 copy", selected: true })).toBeInTheDocument()
  })
})

describe("unified undo timeline", () => {
  it("keeps Undo disabled for non-edits (plain selection) and enables it on an edit", () => {
    renderEditor()
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()

    // Selecting a layer is navigation, not an edit — it must not arm Undo.
    fireEvent.click(screen.getByRole("option", { name: "Layer 1" }))
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled()

    // An actual edit does.
    fireEvent.click(screen.getByRole("button", { name: "Add layer" }))
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled()
  })

  it("undoes and redoes a layer delete (the layer comes back)", () => {
    renderEditor()
    // Add a second layer first — the last remaining layer can't be deleted.
    fireEvent.click(screen.getByRole("button", { name: "Add layer" })) // adds Layer 2 (active)
    expect(screen.getAllByRole("option")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "Delete layer" })) // removes Layer 2
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.queryByRole("option", { name: "Layer 2" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(screen.getAllByRole("option")).toHaveLength(2)
    expect(screen.getByRole("option", { name: "Layer 2", selected: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Redo" }))
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(screen.queryByRole("option", { name: "Layer 2" })).not.toBeInTheDocument()
  })

  it("undoes an inline rename", () => {
    renderEditor()
    fireEvent.doubleClick(screen.getByText("Layer 1"))
    const input = screen.getByRole("textbox", { name: "Rename Layer 1" })
    fireEvent.change(input, { target: { value: "Sky" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByRole("option", { name: "Sky" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(screen.getByRole("option", { name: "Layer 1" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Sky" })).not.toBeInTheDocument()
  })
})
