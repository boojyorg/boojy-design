import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { compositeStroke, stampInto } from "@/editor/Canvas/engine/stroke"

const ctxOf = (w: number, h: number) =>
  createCanvas(w, h).getContext("2d") as unknown as CanvasRenderingContext2D

describe("stampInto", () => {
  it("paints an opaque core for a hard brush, transparent outside the radius", () => {
    const ctx = ctxOf(100, 100)
    stampInto(ctx, { x: 50, y: 50 }, { size: 40, color: "#ff0000", hardness: 100 })

    const center = ctx.getImageData(50, 50, 1, 1).data
    expect([center[0], center[1], center[2]]).toEqual([255, 0, 0])
    expect(center[3]).toBe(255)

    // Well outside the 20px radius → untouched.
    const far = ctx.getImageData(95, 95, 1, 1).data
    expect(far[3]).toBe(0)
  })

  it("feathers the edge for a soft brush (edge alpha < core alpha)", () => {
    const ctx = ctxOf(100, 100)
    stampInto(ctx, { x: 50, y: 50 }, { size: 60, color: "#000000", hardness: 0 })
    const core = ctx.getImageData(50, 50, 1, 1).data[3] ?? 0
    const edge = ctx.getImageData(50, 72, 1, 1).data[3] ?? 0 // near the 30px radius
    expect(core).toBeGreaterThan(edge)
    expect(edge).toBeGreaterThan(0)
  })
})

describe("compositeStroke", () => {
  it("caps re-painted overlap at the stroke opacity (no double-darkening)", () => {
    // snapshot: empty. stroke buffer: a solid black square painted twice (full alpha).
    const snapshot = createCanvas(10, 10)
    const stroke = createCanvas(10, 10)
    const sctx = stroke.getContext("2d")
    sctx.fillStyle = "rgba(0,0,0,1)"
    sctx.fillRect(0, 0, 10, 10)

    const target = ctxOf(10, 10)
    compositeStroke(
      target,
      snapshot as unknown as CanvasImageSource,
      stroke as unknown as CanvasImageSource,
      50, // 50% stroke opacity
      "brush",
    )
    const a = target.getImageData(5, 5, 1, 1).data[3] ?? 0
    // ~50% of 255, regardless of how much was stamped into the stroke buffer.
    expect(a).toBeGreaterThan(120)
    expect(a).toBeLessThan(140)
  })

  it("erases (destination-out) where the stroke buffer is painted", () => {
    const snapshot = createCanvas(10, 10)
    const snapCtx = snapshot.getContext("2d")
    snapCtx.fillStyle = "rgba(0,0,0,1)"
    snapCtx.fillRect(0, 0, 10, 10) // fully opaque layer

    const stroke = createCanvas(10, 10)
    const strokeCtx = stroke.getContext("2d")
    strokeCtx.fillStyle = "rgba(0,0,0,1)"
    strokeCtx.fillRect(0, 0, 5, 5) // erase the top-left quadrant

    const target = ctxOf(10, 10)
    compositeStroke(
      target,
      snapshot as unknown as CanvasImageSource,
      stroke as unknown as CanvasImageSource,
      100,
      "eraser",
    )
    expect(target.getImageData(2, 2, 1, 1).data[3]).toBe(0) // erased
    expect(target.getImageData(8, 8, 1, 1).data[3]).toBe(255) // untouched
  })
})
