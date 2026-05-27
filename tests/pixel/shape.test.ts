import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { drawEllipse, drawRect, normalizeRect } from "@/editor/Canvas/engine/shape"

describe("normalizeRect", () => {
  it("normalizes a down-right drag to a top-left rect", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 50, y: 80 }, false)).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 60,
    })
  })

  it("normalizes a drag in any direction to the same rect", () => {
    // Dragging up-left from the opposite corner yields identical bounds.
    expect(normalizeRect({ x: 50, y: 80 }, { x: 10, y: 20 }, false)).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 60,
    })
  })

  it("constrains to a square on the larger axis when square is set", () => {
    // dx=100, dy=40 → side 100, both axes grow to 100, signs preserved.
    expect(normalizeRect({ x: 0, y: 0 }, { x: 100, y: 40 }, true)).toEqual({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    })
    // Up-left square stays anchored to the larger axis from the start corner.
    expect(normalizeRect({ x: 100, y: 100 }, { x: 0, y: 60 }, true)).toEqual({
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    })
  })
})

describe("drawRect / drawEllipse (real canvas)", () => {
  it("fills a rectangle inside its bounds and nowhere else", () => {
    const doc = createCanvas(1280, 800)
    const ctx = doc.getContext("2d")
    drawRect(
      ctx as unknown as CanvasRenderingContext2D,
      { x: 100, y: 100, w: 200, h: 150 },
      "#ff0000",
    )

    const inside = ctx.getImageData(200, 175, 1, 1).data
    expect([inside[0], inside[1], inside[2], inside[3]]).toEqual([255, 0, 0, 255])
    const outside = ctx.getImageData(50, 50, 1, 1).data
    expect(outside[3]).toBe(0)
  })

  it("fills an ellipse that misses the corners of its bounding box", () => {
    const doc = createCanvas(1280, 800)
    const ctx = doc.getContext("2d")
    drawEllipse(
      ctx as unknown as CanvasRenderingContext2D,
      { x: 0, y: 0, w: 400, h: 400 },
      "#ff0000",
    )

    // Centre is filled.
    const center = ctx.getImageData(200, 200, 1, 1).data
    expect([center[0], center[1], center[2], center[3]]).toEqual([255, 0, 0, 255])
    // A bounding-box corner lies outside the inscribed ellipse → untouched.
    const corner = ctx.getImageData(10, 10, 1, 1).data
    expect(corner[3]).toBe(0)
  })
})
