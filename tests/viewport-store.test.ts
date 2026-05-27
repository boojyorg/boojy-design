import { describe, expect, it } from "vitest"
import { useViewportStore } from "@/editor/state/viewportStore"

// vitest.setup resets the viewport store before each test.
const vp = () => useViewportStore.getState()

describe("viewportStore", () => {
  it("accumulates pan deltas", () => {
    vp().panBy(10, -5)
    vp().panBy(3, 2)
    expect([vp().panX, vp().panY]).toEqual([13, -3])
  })

  it("steps zoom through presets, clamped at the ends", () => {
    vp().setContainerSize(800, 600)
    // From the 75% default, in → 80 → 90 → 100, then out → 90.
    vp().nudgeZoom(1)
    expect(vp().zoom).toBe(80)
    vp().nudgeZoom(1)
    expect(vp().zoom).toBe(90)
    vp().nudgeZoom(1)
    expect(vp().zoom).toBe(100)
    vp().nudgeZoom(-1)
    expect(vp().zoom).toBe(90)
  })

  it("zooms toward a cursor point, keeping it fixed", () => {
    vp().setContainerSize(800, 600)
    vp().zoomAtCursor(2, 200, 150) // 75% → 150%
    expect(vp().zoom).toBe(150)
  })

  it("fitToScreen zeroes pan and picks a fitting zoom", () => {
    vp().setContainerSize(800, 600)
    vp().panBy(50, 50)
    vp().fitToScreen()
    expect([vp().panX, vp().panY]).toEqual([0, 0])
    expect(vp().zoom).toBeLessThanOrEqual(100)
  })

  it("zoom100 resets to 100% centred", () => {
    vp().setContainerSize(800, 600)
    vp().panBy(50, 50)
    vp().nudgeZoom(50)
    vp().zoom100()
    expect(vp().zoom).toBe(100)
    expect([vp().panX, vp().panY]).toEqual([0, 0])
  })
})
