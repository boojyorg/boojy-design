import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LayerThumb } from "@/editor/LayerThumb"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import type { Layer } from "@/editor/types"

const raster: Layer = { id: "l1", name: "Layer 1", type: "raster", visible: true, opacity: 100 }

describe("LayerThumb", () => {
  it("renders the cached pixel preview as an image when one exists", () => {
    useThumbnailStore.getState().setThumbnail("l1", "data:image/png;base64,AAAA")
    const { container } = render(<LayerThumb layer={raster} />)

    // The thumbnail is decorative (empty alt → no img role), so query the element directly.
    const img = container.querySelector("img")
    expect(img).toHaveAttribute("src", "data:image/png;base64,AAAA")
    expect(container.querySelector("svg")).not.toBeInTheDocument() // placeholder replaced
  })

  it("falls back to the placeholder icon when the layer has no thumbnail yet", () => {
    // vitest.setup clears the store before each test, so l1 has no entry here.
    const { container } = render(<LayerThumb layer={raster} />)

    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument() // raster placeholder squiggle
  })
})
