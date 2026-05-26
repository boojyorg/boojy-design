import type { Meta, StoryObj } from "@storybook/react-vite"
import { Logo } from "./Logo"

const meta = {
  title: "Primitives/Logo",
  component: Logo,
  decorators: [(Story) => <div className="bg-chrome p-6">{Story()}</div>],
} satisfies Meta<typeof Logo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { height: 22 } }
export const Large: Story = { args: { height: 40 } }
