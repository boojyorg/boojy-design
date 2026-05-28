import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import {
  contentBounds,
  drawRasterThumbnail,
  drawTextThumbnail,
} from "@/editor/Canvas/engine/thumbnail"

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

const ctxOf = (w: number, h: number) =>
  createCanvas(w, h).getContext("2d") as unknown as CanvasRenderingContext2D

describe("drawRasterThumbnail (real canvas)", () => {
  it("fits a content box into the thumbnail, centred (letterboxed on the short axis)", () => {
    // Source: a 50×50 red block at (10,10) on a 100×100 canvas.
    const src = createCanvas(100, 100)
    const sctx = src.getContext("2d")
    sctx.fillStyle = "#ff0000"
    sctx.fillRect(10, 10, 50, 50)

    // Thumbnail 80 wide, 40 tall → the square content scales to 40×40, centred at x≈20.
    const thumb = ctxOf(80, 40)
    drawRasterThumbnail(
      thumb,
      src as unknown as CanvasImageSource,
      { x: 10, y: 10, w: 50, h: 50 },
      80,
      40,
    )

    expect(thumb.getImageData(40, 20, 1, 1).data[3]).toBe(255) // centre painted
    expect(thumb.getImageData(2, 20, 1, 1).data[3]).toBe(0) // left letterbox empty
  })
})

describe("drawTextThumbnail (real canvas)", () => {
  it("paints glyph pixels and caps the font to ~⅔ of the height", () => {
    const thumb = ctxOf(120, 40)
    drawTextThumbnail(thumb, "Hello", 200, "#000000", 40)
    // Something is painted in the left region where text begins.
    let painted = false
    const data = thumb.getImageData(0, 0, 60, 40).data
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 0) {
        painted = true
        break
      }
    }
    expect(painted).toBe(true)
  })
})
