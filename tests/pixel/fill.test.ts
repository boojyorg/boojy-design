import { describe, expect, it } from "vitest"
import { hexToRgb } from "@/editor/Canvas/engine/color"
import { floodFill } from "@/editor/Canvas/engine/fill"

const W = 4
const H = 4
const RED = { r: 255, g: 0, b: 0 }
const WHITE = { r: 255, g: 255, b: 255 }

/** A W×H RGBA buffer filled with one opaque colour. */
function solid(r: number, g: number, b: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return data
}

const px = (data: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * W + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

describe("hexToRgb", () => {
  it("parses #RRGGBB and #RGB", () => {
    expect(hexToRgb("#E89940")).toEqual({ r: 232, g: 153, b: 64 })
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe("floodFill", () => {
  it("fills a uniform field with the opaque fill colour", () => {
    const data = solid(255, 255, 255)
    floodFill(data, W, H, 0, 0, RED, 0, 0)
    expect(px(data, 0, 0)).toEqual([255, 0, 0, 255])
    expect(px(data, 3, 3)).toEqual([255, 0, 0, 255])
  })

  it("does not cross a hard colour border at tolerance 0", () => {
    // Left half white, right half blue → fill the white side; blue is untouched.
    const data = solid(255, 255, 255)
    for (let y = 0; y < H; y++) {
      for (let x = 2; x < W; x++) {
        const i = (y * W + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 255
      }
    }
    floodFill(data, W, H, 0, 0, RED, 0, 0)
    expect(px(data, 0, 0)).toEqual([255, 0, 0, 255]) // filled
    expect(px(data, 3, 0)).toEqual([0, 0, 255, 255]) // blue border held
  })

  it("bridges near-colours once tolerance is high enough", () => {
    // A near-white column (250) between the seed and the far edge.
    const data = solid(255, 255, 255)
    for (let y = 0; y < H; y++) {
      const i = (y * W + 2) * 4
      data[i] = 250
      data[i + 1] = 250
      data[i + 2] = 250
    }
    floodFill(data, W, H, 0, 0, RED, 20, 0)
    expect(px(data, 3, 0)).toEqual([255, 0, 0, 255]) // reached across the near-white seam
  })

  it("is a no-op when the seed already equals the fill colour", () => {
    const data = solid(255, 0, 0)
    floodFill(data, W, H, 1, 1, RED, 0, 0)
    expect(px(data, 0, 0)).toEqual([255, 0, 0, 255]) // unchanged (still red)
  })

  it("composites the fill under the feather and stops at solid pixels", () => {
    // col 0 = transparent interior (seed); col 1 = feather (black @ 20% alpha); cols 2–3 = solid.
    const data = new Uint8ClampedArray(W * H * 4)
    for (let y = 0; y < H; y++) {
      const f = (y * W + 1) * 4
      data[f + 3] = 51 // black, alpha 51 (~20%)
      for (const cx of [2, 3]) {
        data[(y * W + cx) * 4 + 3] = 255 // opaque black core
      }
    }
    floodFill(data, W, H, 0, 0, WHITE, 0, 16)
    expect(px(data, 0, 0)).toEqual([255, 255, 255, 255]) // interior: hard-filled white
    // feather: white under black@20% → 0·0.2 + 255·0.8 = 204 per channel, opaque
    expect(px(data, 1, 0)).toEqual([204, 204, 204, 255])
    expect(px(data, 2, 0)).toEqual([0, 0, 0, 255]) // solid core untouched
  })
})
