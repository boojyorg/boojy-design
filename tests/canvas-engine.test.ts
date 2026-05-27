import { describe, expect, it } from "vitest"
import {
  compositeOp,
  hardnessStops,
  interpolateStamps,
  snapTo45,
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

describe("snapTo45", () => {
  const o = { x: 0, y: 0 }

  it("leaves a point already on an axis untouched", () => {
    const p = snapTo45(o, { x: 10, y: 0 })
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeCloseTo(0)
  })

  it("snaps a near-horizontal drag flat to the horizontal, preserving distance", () => {
    // 10px out, 2px down → snaps to pure horizontal at the same length (~10.2px).
    const p = snapTo45(o, { x: 10, y: 2 })
    expect(p.y).toBeCloseTo(0)
    expect(p.x).toBeCloseTo(Math.hypot(10, 2))
  })

  it("snaps to the nearest diagonal (45°)", () => {
    // Mostly-diagonal drag → equal x and y at the same distance.
    const p = snapTo45(o, { x: 10, y: 9 })
    const len = Math.hypot(10, 9)
    expect(p.x).toBeCloseTo(len * Math.SQRT1_2)
    expect(p.y).toBeCloseTo(len * Math.SQRT1_2)
  })

  it("snaps near-vertical to the vertical axis", () => {
    const p = snapTo45(o, { x: 1, y: -12 })
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(-Math.hypot(1, 12))
  })

  it("returns the origin for a zero-length move", () => {
    expect(snapTo45(o, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
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
