import type { Meta, StoryObj } from "@storybook/react-vite"
import { EditorV1 } from "./EditorV1"

const meta = {
  title: "Editor/EditorV1",
  component: EditorV1,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ height: "100vh" }}>{Story()}</div>],
} satisfies Meta<typeof EditorV1>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
