import { type Canvas, createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { clearRegion, copyRegion } from "@/editor/Canvas/engine/selection"
import { IDENTITY, type Transform } from "@/editor/Canvas/engine/transform"

// Real-canvas pixel tests (node project, @napi-rs/canvas). Cast contexts to the DOM types
// the source is written against — same pattern as flatten.test.ts.
// copyRegion takes a caller-supplied output canvas so the engine can use document.createElement
// while these tests use createCanvas (no DOM).

const W = 8
const H = 8

function solid(color: string): Canvas {
  const c = createCanvas(W, H)
  const ctx = c.getContext("2d")
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, H)
  return c
}

function blank(): Canvas {
  return createCanvas(W, H)
}

function px(data: Uint8ClampedArray, x: number, y: number) {
  const i = (y * W + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

// ── copyRegion ────────────────────────────────────────────────────────────────

describe("copyRegion", () => {
  it("copies the selected region into a doc-space canvas", () => {
    const src = solid("#ff0000") as unknown as HTMLCanvasElement
    const out = blank()
    copyRegion(src, IDENTITY, { x: 2, y: 2, w: 4, h: 4 }, out as unknown as HTMLCanvasElement)
    const data = out.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    // Inside the selection rect: red opaque
    expect(px(data, 3, 3)).toEqual([255, 0, 0, 255])
    // Outside the rect: transparent
    expect(px(data, 0, 0)).toEqual([0, 0, 0, 0])
    expect(px(data, 7, 7)).toEqual([0, 0, 0, 0])
  })

  it("respects a translation transform when copying", () => {
    // Layer shifted right by 4px: its red pixels appear at doc x=4..7
    const src = solid("#ff0000") as unknown as HTMLCanvasElement
    const t: Transform = { x: 4, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
    const out = blank()
    // Select the right half where the shifted layer shows
    copyRegion(src, t, { x: 4, y: 0, w: 4, h: 8 }, out as unknown as HTMLCanvasElement)
    const data = out.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    // Pixels inside the selection (doc x=4..7) should be red
    expect(px(data, 5, 0)).toEqual([255, 0, 0, 255])
    // Pixels outside (doc x=0..3) should be transparent
    expect(px(data, 1, 0)).toEqual([0, 0, 0, 0])
  })

  it("returns transparent pixels where the layer has no content", () => {
    const src = blank() as unknown as HTMLCanvasElement
    const out = blank()
    copyRegion(src, IDENTITY, { x: 0, y: 0, w: W, h: H }, out as unknown as HTMLCanvasElement)
    const data = out.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    expect(px(data, 0, 0)[3]).toBe(0)
  })
})

// ── clearRegion ───────────────────────────────────────────────────────────────

describe("clearRegion", () => {
  it("clears exactly the selected rect for an identity-transform layer", () => {
    const c = solid("#ff0000")
    const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D
    clearRegion(ctx, IDENTITY, { x: 2, y: 2, w: 4, h: 4 }, W, H)
    const data = c.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    // Inside the cleared rect: transparent
    expect(px(data, 3, 3)[3]).toBe(0)
    expect(px(data, 2, 2)[3]).toBe(0)
    expect(px(data, 5, 5)[3]).toBe(0)
    // Outside: still red
    expect(px(data, 0, 0)).toEqual([255, 0, 0, 255])
    expect(px(data, 7, 7)).toEqual([255, 0, 0, 255])
  })

  it("leaves pixels outside the cleared region untouched", () => {
    const c = solid("#00ff00")
    const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D
    clearRegion(ctx, IDENTITY, { x: 0, y: 0, w: 4, h: 4 }, W, H)
    const data = c.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    // Top-left quad cleared
    expect(px(data, 2, 2)[3]).toBe(0)
    // Bottom-right untouched
    expect(px(data, 6, 6)).toEqual([0, 255, 0, 255])
  })

  it("clears the inverse-transformed region for a translated layer", () => {
    // Layer shifted right by 4px in doc space: buffer pixel at (0,y) shows at doc (4,y).
    // Clearing doc rect x=4..7 should clear buffer pixels x=0..3.
    const c = solid("#0000ff")
    const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D
    const t: Transform = { x: 4, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }
    clearRegion(ctx, t, { x: 4, y: 0, w: 4, h: 8 }, W, H)
    const data = c.getContext("2d").getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
    // Buffer pixels x=0..3 (which show at doc x=4..7) should be cleared
    expect(px(data, 2, 0)[3]).toBe(0)
    // Buffer pixels x=4..7 (which show at doc x=8..11, off-canvas) are untouched
    expect(px(data, 6, 0)).toEqual([0, 0, 255, 255])
  })
})
