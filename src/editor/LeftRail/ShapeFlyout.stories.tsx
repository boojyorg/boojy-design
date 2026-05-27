import type { Meta, StoryObj } from "@storybook/react-vite"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ShapeFlyout } from "./ShapeFlyout"

const meta = {
  title: "Editor/ShapeFlyout",
  component: ShapeFlyout,
  args: {
    shapeKind: "rect",
    onShapeKind: () => {},
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex h-[300px] items-center bg-editor p-6">{Story()}</div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof ShapeFlyout>

export default meta
type Story = StoryObj<typeof meta>

export const Rectangle: Story = {}
export const Ellipse: Story = { args: { shapeKind: "ellipse" } }
