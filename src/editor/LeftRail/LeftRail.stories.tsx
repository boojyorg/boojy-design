import type { Meta, StoryObj } from "@storybook/react-vite"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LeftRail } from "./LeftRail"

const meta = {
  title: "Editor/LeftRail",
  component: LeftRail,
  args: {
    activeTool: "brush",
    foreground: "#E89940",
    shapeKind: "rect",
    onSelectTool: () => {},
    onForeground: () => {},
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex h-[600px] bg-editor">{Story()}</div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof LeftRail>

export default meta
type Story = StoryObj<typeof meta>

export const Brush: Story = {}
export const Shape: Story = { args: { activeTool: "shape" } }
