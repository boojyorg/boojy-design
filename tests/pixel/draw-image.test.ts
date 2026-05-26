import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { drawImageContain } from "@/editor/Canvas/engine/draw"

describe("drawImageContain (real canvas)", () => {
  it("draws a wide source letterboxed and centered into the doc", () => {
    const doc = createCanvas(1280, 800)
    const ctx = doc.getContext("2d")

    // A 2000×500 solid-green source → fits to 1280×320 at dy=240 (top/bottom letterbox).
    const src = createCanvas(2000, 500)
    const sctx = src.getContext("2d")
    sctx.fillStyle = "#00ff00"
    sctx.fillRect(0, 0, 2000, 500)

    drawImageContain(
      ctx as unknown as CanvasRenderingContext2D,
      src as unknown as CanvasImageSource,
      2000,
      500,
      1280,
      800,
    )

    // Centre of the page is inside the drawn band → green.
    const center = ctx.getImageData(640, 400, 1, 1).data
    expect([center[0], center[1], center[2], center[3]]).toEqual([0, 255, 0, 255])

    // Top-left is in the letterbox margin (y < 240) → untouched/transparent.
    const margin = ctx.getImageData(5, 5, 1, 1).data
    expect(margin[3]).toBe(0)
  })
})
