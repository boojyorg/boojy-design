import type { Meta, StoryObj } from "@storybook/react-vite"
import { INITIAL_LAYERS } from "@/editor/mock-data"
import { RightSidebar } from "./RightSidebar"

const noop = () => {}

const meta = {
  title: "Editor/RightSidebar",
  component: RightSidebar,
  args: {
    layers: INITIAL_LAYERS,
    activeLayerId: "l4",
    onSelectLayer: noop,
    onToggleLayer: noop,
    onAddLayer: noop,
    onDeleteLayer: noop,
    onRenameLayer: noop,
    onDuplicateLayer: noop,
    onMoveLayer: noop,
  },
  decorators: [(Story) => <div className="flex h-[620px] justify-end bg-editor">{Story()}</div>],
} satisfies Meta<typeof RightSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = { args: { collapsed: false } }
export const Collapsed: Story = { args: { collapsed: true } }
