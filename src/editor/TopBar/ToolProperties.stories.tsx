import type { Meta, StoryObj } from "@storybook/react-vite"
import { ToolProperties } from "./ToolProperties"

const noop = () => {}

const meta = {
  title: "Editor/ToolProperties",
  component: ToolProperties,
  args: {
    brushSize: 30,
    hardness: 80,
    opacity: 100,
    foreground: "#E89940",
    onBrushSize: noop,
    onHardness: noop,
    onOpacity: noop,
  },
  decorators: [(Story) => <div className="flex h-13 items-center bg-chrome px-4">{Story()}</div>],
} satisfies Meta<typeof ToolProperties>

export default meta
type Story = StoryObj<typeof meta>

export const Brush: Story = { args: { tool: "brush" } }
export const Eraser: Story = { args: { tool: "eraser" } }
export const Shape: Story = { args: { tool: "shape" } }
export const Hand: Story = { args: { tool: "hand" } }
export const TextRoadmap: Story = { args: { tool: "text" } }
