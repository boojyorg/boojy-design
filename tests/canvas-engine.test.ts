import { describe, expect, it } from "vitest"
import {
  compositeOp,
  hardnessStops,
  interpolateStamps,
  stampSpacing,
  strokeAlpha,
} from "@/editor/Canvas/engine/brush"
import { computeView } from "@/editor/Canvas/engine/viewport"

describe("brush stamp spacing", () => {
  it("spaces stamps at a fraction of the brush diameter", () => {
    expect(stampSpacing(100)).toBe(15)
    expect(stampSpacing(30)).toBeCloseTo(4.5)
  })

  it("never drops below 1px so tiny brushes still step", () => {
    expect(stampSpacing(1)).toBe(1)
  })
})

describe("interpolateStamps", () => {
  it("places evenly spaced stamps along a segment", () => {
    const run = interpolateStamps({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 0)
    expect(run.points).toEqual([
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ])
    expect(run.carryOver).toBe(0)
  })

  it("returns no stamps and an unchanged carry for a zero-length move", () => {
    const run = interpolateStamps({ x: 4, y: 4 }, { x: 4, y: 4 }, 5, 2)
    expect(run.points).toEqual([])
    expect(run.carryOver).toBe(2)
  })

  it("carries leftover distance across short segments (no gaps on fast drags)", () => {
    // First short hop is too short to place a stamp; distance accumulates.
    const a = interpolateStamps({ x: 0, y: 0 }, { x: 3, y: 0 }, 5, 0)
    expect(a.points).toEqual([])
    expect(a.carryOver).toBe(3)

    // Next hop fires a stamp using the carried distance, then carries the remainder.
    const b = interpolateStamps({ x: 3, y: 0 }, { x: 6, y: 0 }, 5, a.carryOver)
    expect(b.points).toEqual([{ x: 5, y: 0 }])
    expect(b.carryOver).toBe(1)
  })
})

describe("hardnessStops", () => {
  it("is fully feathered at hardness 0", () => {
    expect(hardnessStops(0)).toEqual([
      { offset: 0, alpha: 1 },
      { offset: 1, alpha: 0 },
    ])
  })

  it("has a solid core proportional to hardness", () => {
    expect(hardnessStops(50)).toEqual([
      { offset: 0, alpha: 1 },
      { offset: 0.5, alpha: 1 },
      { offset: 1, alpha: 0 },
    ])
  })

  it("is a hard disc at hardness 100", () => {
    expect(hardnessStops(100)).toEqual([
      { offset: 0, alpha: 1 },
      { offset: 1, alpha: 1 },
    ])
  })
})

describe("strokeAlpha", () => {
  it("maps opacity percent to 0–1 and clamps", () => {
    expect(strokeAlpha(100)).toBe(1)
    expect(strokeAlpha(50)).toBe(0.5)
    expect(strokeAlpha(0)).toBe(0)
    expect(strokeAlpha(150)).toBe(1)
    expect(strokeAlpha(-10)).toBe(0)
  })
})

describe("compositeOp", () => {
  it("paints with the brush and erases with the eraser", () => {
    expect(compositeOp("brush")).toBe("source-over")
    expect(compositeOp("eraser")).toBe("destination-out")
  })
})

describe("computeView", () => {
  it("centres the document at 100% zoom", () => {
    expect(computeView(1000, 1000, 1280, 800, 100)).toEqual({ scale: 1, x: -140, y: 100 })
  })

  it("scales and recentres when zoomed out", () => {
    expect(computeView(1000, 1000, 1280, 800, 50)).toEqual({ scale: 0.5, x: 180, y: 300 })
  })
})
