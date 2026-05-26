import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"

// Mirrors CanvasEngine.duplicateLayerPixels (clear target, drawImage source). The Konva-
// coupled method itself can't run in node, so we assert the pixel-copy contract directly.
describe("layer duplicate pixel copy (real canvas)", () => {
  it("copies the source's pixels — including transparency — into the target", () => {
    const W = 4
    const H = 4
    const from = createCanvas(W, H)
    const fctx = from.getContext("2d")
    fctx.fillStyle = "#0000ff"
    fctx.fillRect(0, 0, 2, H) // left half blue, right half transparent

    const to = createCanvas(W, H)
    const tctx = to.getContext("2d") as unknown as CanvasRenderingContext2D
    tctx.clearRect(0, 0, W, H)
    tctx.drawImage(from as unknown as CanvasImageSource, 0, 0)

    const left = tctx.getImageData(0, 0, 1, 1).data
    const right = tctx.getImageData(3, 0, 1, 1).data
    expect([left[0], left[1], left[2], left[3]]).toEqual([0, 0, 255, 255])
    expect(right[3]).toBe(0) // transparent region copied as transparent
  })
})
