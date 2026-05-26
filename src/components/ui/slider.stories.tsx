import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { Slider } from "./slider"

const meta = {
  title: "Primitives/Slider",
  component: Slider,
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([40])
    return (
      <div className="w-64 bg-chrome p-6">
        <Slider aria-label="Demo" value={value} min={0} max={100} onValueChange={setValue} />
      </div>
    )
  },
}
