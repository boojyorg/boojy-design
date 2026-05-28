import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import {
  caretIndexAt,
  drawText,
  measureTextWidth,
  textContentBox,
} from "@/editor/Canvas/engine/text"

const ctx = () => createCanvas(400, 200).getContext("2d") as unknown as CanvasRenderingContext2D

describe("measureTextWidth", () => {
  it("measures a real context's text width (monotonic in length)", () => {
    const c = ctx()
    const short = measureTextWidth(c, "Hi", 40)
    const long = measureTextWidth(c, "Hello world", 40)
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })

  it("falls back to the 0.6em estimate when no context is available", () => {
    // 5 chars × 40px × 0.6 = 120
    expect(measureTextWidth(null, "abcde", 40)).toBe(120)
  })
})

describe("textContentBox", () => {
  it("is anchored at the origin with height = 1.3 × fontSize", () => {
    const box = textContentBox(ctx(), "Sample", 40)
    expect(box.x).toBe(0)
    expect(box.y).toBe(0)
    expect(box.h).toBeCloseTo(52) // 40 × 1.3
    expect(box.w).toBeGreaterThan(0)
  })

  it("uses the estimate height even without a context", () => {
    const box = textContentBox(null, "Sample", 40)
    expect(box.h).toBeCloseTo(52)
    expect(box.w).toBe(6 * 40 * 0.6)
  })
})

describe("caretIndexAt", () => {
  it("returns 0 for empty text or a null context", () => {
    expect(caretIndexAt(ctx(), "", 40, 100)).toBe(0)
    expect(caretIndexAt(null, "hello", 40, 100)).toBe(0)
  })

  it("returns 0 at the very start and text.length past the end", () => {
    const c = ctx()
    expect(caretIndexAt(c, "hello", 40, 0)).toBe(0)
    const end = measureTextWidth(c, "hello", 40)
    expect(caretIndexAt(c, "hello", 40, end + 100)).toBe(5)
  })

  it("lands on the boundary nearest the click (past a glyph's midpoint)", () => {
    const c = ctx()
    const text = "hello"
    // Just past the centre of the first glyph → caret moves to index 1.
    const firstGlyph = measureTextWidth(c, "h", 40)
    expect(caretIndexAt(c, text, 40, firstGlyph * 0.6)).toBe(1)
  })
})

describe("drawText (real canvas)", () => {
  it("paints non-transparent pixels at the top-left origin", () => {
    const canvas = createCanvas(400, 200)
    const c = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    drawText(c, "A", 80, "#ff0000")
    // Somewhere inside the glyph box near the origin should be painted red.
    let painted = false
    const data = canvas.getContext("2d").getImageData(0, 0, 60, 80).data
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 0) {
        painted = true
        break
      }
    }
    expect(painted).toBe(true)
  })
})
