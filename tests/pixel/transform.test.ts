import { describe, expect, it } from "vitest"
import {
  apply,
  boxCorners,
  IDENTITY,
  invert,
  rotateAbout,
  scaleAbout,
  type Transform,
} from "@/editor/Canvas/engine/transform"

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

describe("apply / invert", () => {
  it("identity maps a point to itself", () => {
    expect(apply(IDENTITY, { x: 12, y: 34 })).toEqual({ x: 12, y: 34 })
  })

  it("applies translate, then scale, then rotation", () => {
    const t: Transform = { x: 10, y: 20, scale: 2, rotation: 0 }
    expect(apply(t, { x: 3, y: 4 })).toEqual({ x: 16, y: 28 }) // (3,4)*2 + (10,20)
  })

  it("round-trips through invert for a rotated, scaled, translated transform", () => {
    const t: Transform = { x: -40, y: 15, scale: 1.7, rotation: 0.9 }
    const p = { x: 123, y: -45 }
    const back = invert(t, apply(t, p))
    expect(near(back.x, p.x)).toBe(true)
    expect(near(back.y, p.y)).toBe(true)
  })
})

describe("scaleAbout", () => {
  it("keeps the anchor fixed and scales the rest", () => {
    const t = IDENTITY
    const anchor = { x: 0, y: 0 }
    // drag a point at distance 100 out to distance 200 → factor 2 about the origin.
    const next = scaleAbout(t, anchor, { x: 100, y: 0 }, { x: 200, y: 0 })
    expect(next.scale).toBe(2)
    // the anchor (origin) is unmoved: applying to (0,0) stays (0,0).
    expect(apply(next, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  it("clamps to a minimum scale and never flips", () => {
    const next = scaleAbout(IDENTITY, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 })
    expect(next.scale).toBeGreaterThan(0)
  })
})

describe("rotateAbout", () => {
  it("adds the swept angle", () => {
    const next = rotateAbout(IDENTITY, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 })
    expect(near(next.rotation, Math.PI / 2)).toBe(true) // 90° sweep
  })

  it("snaps the absolute rotation to the nearest step", () => {
    // sweep ~10° but snap to 15° → lands on 15°.
    const from = { x: 1, y: 0 }
    const to = { x: Math.cos(0.17), y: Math.sin(0.17) } // ~9.7°
    const next = rotateAbout(IDENTITY, { x: 0, y: 0 }, from, to, 15)
    expect(near(next.rotation, (15 * Math.PI) / 180)).toBe(true)
  })
})

describe("boxCorners", () => {
  it("returns TL, TR, BR, BL", () => {
    expect(boxCorners({ x: 2, y: 3, w: 4, h: 6 })).toEqual([
      { x: 2, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 9 },
      { x: 2, y: 9 },
    ])
  })
})
