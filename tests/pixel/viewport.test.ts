import { describe, expect, it } from "vitest"
import { clampZoom, computeView, fitView, zoomAtPoint } from "@/editor/Canvas/engine/viewport"

// Pure view math — no canvas needed, but lives with the other engine-math tests.
const W = 800
const H = 600
const DW = 1280
const DH = 800

describe("computeView", () => {
  it("centres the document when pan is zero", () => {
    const v = computeView(W, H, DW, DH, 50)
    expect(v.scale).toBe(0.5)
    expect(v.x).toBe((W - DW * 0.5) / 2) // 80
    expect(v.y).toBe((H - DH * 0.5) / 2) // 100
  })

  it("adds pan as a screen-space offset on top of centring", () => {
    const base = computeView(W, H, DW, DH, 50)
    const panned = computeView(W, H, DW, DH, 50, 30, -10)
    expect(panned.x).toBe(base.x + 30)
    expect(panned.y).toBe(base.y - 10)
  })
})

describe("zoomAtPoint", () => {
  it("keeps the doc point under the cursor fixed across a zoom", () => {
    const prev = { zoom: 50, panX: 20, panY: -8 }
    const sx = 300
    const sy = 220
    const before = computeView(W, H, DW, DH, prev.zoom, prev.panX, prev.panY)
    const doc = { x: (sx - before.x) / before.scale, y: (sy - before.y) / before.scale }

    const next = zoomAtPoint(prev, W, H, DW, DH, 175, sx, sy)
    const after = computeView(W, H, DW, DH, next.zoom, next.panX, next.panY)
    // The same doc point must map back to the same screen point.
    expect(after.x + doc.x * after.scale).toBeCloseTo(sx)
    expect(after.y + doc.y * after.scale).toBeCloseTo(sy)
    expect(next.zoom).toBe(175)
  })

  it("clamps the zoom to the allowed range", () => {
    expect(zoomAtPoint({ zoom: 400, panX: 0, panY: 0 }, W, H, DW, DH, 9999, 100, 100).zoom).toBe(
      400,
    )
    expect(zoomAtPoint({ zoom: 10, panX: 0, panY: 0 }, W, H, DW, DH, 1, 100, 100).zoom).toBe(10)
  })
})

describe("fitView", () => {
  it("fits to the limiting axis and zeroes pan", () => {
    const v = fitView(W, H, DW, DH) // width-limited: 800/1280 = 0.625 → 62.5%
    expect(v.zoom).toBeCloseTo(62.5)
    expect(v.panX).toBe(0)
    expect(v.panY).toBe(0)
  })

  it("shrinks to leave a padding margin", () => {
    const v = fitView(W, H, DW, DH, 40) // avail 720 wide → 720/1280 = 0.5625 → 56.25%
    expect(v.zoom).toBeCloseTo(56.25)
  })
})

describe("clampZoom", () => {
  it("bounds zoom to 10–400", () => {
    expect(clampZoom(5)).toBe(10)
    expect(clampZoom(500)).toBe(400)
    expect(clampZoom(100)).toBe(100)
  })
})
