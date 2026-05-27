import { describe, expect, it } from "vitest"
import { contentBounds } from "@/editor/Canvas/engine/thumbnail"

const W = 6
const H = 5

const blank = () => new Uint8ClampedArray(W * H * 4)
const setOpaque = (d: Uint8ClampedArray, x: number, y: number) => {
  d[(y * W + x) * 4 + 3] = 255
}

describe("contentBounds", () => {
  it("returns null for a fully transparent buffer", () => {
    expect(contentBounds(blank(), W, H)).toBeNull()
  })

  it("tightly bounds the non-transparent pixels", () => {
    const d = blank()
    setOpaque(d, 1, 1)
    setOpaque(d, 3, 2)
    // spans x 1..3, y 1..2 → origin (1,1), size 3×2
    expect(contentBounds(d, W, H)).toEqual({ x: 1, y: 1, w: 3, h: 2 })
  })

  it("returns full bounds when every pixel is opaque", () => {
    const d = blank()
    for (let i = 0; i < W * H; i++) d[i * 4 + 3] = 255
    expect(contentBounds(d, W, H)).toEqual({ x: 0, y: 0, w: W, h: H })
  })

  it("ignores fully transparent pixels even with non-zero RGB", () => {
    const d = blank()
    d[(2 * W + 2) * 4] = 255 // red, but alpha 0
    expect(contentBounds(d, W, H)).toBeNull()
  })
})
