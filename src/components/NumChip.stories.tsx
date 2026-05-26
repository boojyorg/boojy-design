import type { Meta, StoryObj } from "@storybook/react-vite"
import { NumChip } from "./NumChip"

const meta = {
  title: "Primitives/NumChip",
  component: NumChip,
  decorators: [(Story) => <div className="bg-chrome p-6">{Story()}</div>],
} satisfies Meta<typeof NumChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { value: 30 } }
export const Full: Story = { args: { value: 100 } }
