import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Layer } from "@/editor/types"
import { RightSidebar } from "./RightSidebar"

const noop = () => {}

// A richer stack than the app's single-layer default, so the panel catalogue
// shows reorder/visibility/selection states. Index 0 = top.
const sampleLayers: Layer[] = [
  { id: "l4", name: "Layer 4", type: "raster", visible: true, opacity: 100 },
  { id: "l3", name: "Layer 3", type: "raster", visible: true, opacity: 100 },
  { id: "l2", name: "Rectangle 1", type: "vector", visible: false, opacity: 100, kind: "rect" },
  { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 },
]

const meta = {
  title: "Editor/RightSidebar",
  component: RightSidebar,
  args: {
    layers: sampleLayers,
    activeLayerId: "l4",
    onSelectLayer: noop,
    onToggleLayer: noop,
    onAddLayer: noop,
    onDeleteLayer: noop,
    onRenameLayer: noop,
    onDuplicateLayer: noop,
    onMoveLayer: noop,
    onLiveLayerOpacity: noop,
    onCommitLayerOpacity: noop,
    onLiveFontSize: noop,
    onTextColor: noop,
  },
  decorators: [(Story) => <div className="flex h-[620px] justify-end bg-editor">{Story()}</div>],
} satisfies Meta<typeof RightSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = { args: { collapsed: false } }
export const Collapsed: Story = { args: { collapsed: true } }
