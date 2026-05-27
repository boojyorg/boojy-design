import { describe, expect, it } from "vitest"
import {
  apply,
  boxCorners,
  flipHorizontal,
  flipVertical,
  IDENTITY,
  invert,
  resize,
  resizeCursor,
  rotateAbout,
  type Transform,
} from "@/editor/Canvas/engine/transform"

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps
const BOX = { x: 0, y: 0, w: 100, h: 100 }

describe("apply / invert", () => {
  it("identity maps a point to itself", () => {
    expect(apply(IDENTITY, { x: 12, y: 34 })).toEqual({ x: 12, y: 34 })
  })

  it("applies per-axis scale then translate", () => {
    const t: Transform = { x: 10, y: 20, scaleX: 2, scaleY: 3, rotation: 0 }
    expect(apply(t, { x: 3, y: 4 })).toEqual({ x: 16, y: 32 }) // (3*2+10, 4*3+20)
  })

  it("round-trips through invert for a rotated, non-uniformly scaled, translated transform", () => {
    const t: Transform = { x: -40, y: 15, scaleX: 1.7, scaleY: 0.6, rotation: 0.9 }
    const p = { x: 123, y: -45 }
    const back = invert(t, apply(t, p))
    expect(near(back.x, p.x)).toBe(true)
    expect(near(back.y, p.y)).toBe(true)
  })
})

describe("resize", () => {
  it("edge handle scales only its axis, holding the opposite edge fixed", () => {
    // Right edge (index 2): drag from x=100 out to x=200 → scaleX 2, scaleY unchanged.
    const next = resize(IDENTITY, BOX, 2, { x: 200, y: 50 }, { proportional: false })
    expect(near(next.scaleX, 2)).toBe(true)
    expect(near(next.scaleY, 1)).toBe(true)
    expect(apply(next, { x: 0, y: 50 })).toEqual({ x: 0, y: 50 }) // left edge (anchor) fixed
  })

  it("corner proportional keeps aspect and the opposite corner fixed", () => {
    // BR corner (index 3), anchor TL (0,0); drag the diagonal out by 2× → both axes ×2.
    const next = resize(IDENTITY, BOX, 3, { x: 200, y: 200 }, { proportional: true })
    expect(near(next.scaleX, 2)).toBe(true)
    expect(near(next.scaleY, 2)).toBe(true)
    expect(apply(next, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 }) // anchor fixed
  })

  it("corner free scales each axis independently", () => {
    const next = resize(IDENTITY, BOX, 3, { x: 200, y: 150 }, { proportional: false })
    expect(near(next.scaleX, 2)).toBe(true)
    expect(near(next.scaleY, 1.5)).toBe(true)
  })

  it("mirrors (negative scale) when dragged past the anchor, anchored at the opposite edge", () => {
    // Right edge (index 2), drag the cursor past the left edge (anchor): scaleX goes negative.
    const next = resize(IDENTITY, BOX, 2, { x: -50, y: 50 }, { proportional: false })
    expect(next.scaleX).toBeLessThan(0)
    // Left anchor (x=0) must stay fixed in doc space.
    expect(near(apply(next, { x: 0, y: 50 }).x, 0)).toBe(true)
  })

  it("corner proportional mirrors when dragged diagonally past the anchor, both axes flip", () => {
    // BR corner (index 3), anchor TL (0,0); drag cursor to (-200, -200) → both axes flip.
    const next = resize(IDENTITY, BOX, 3, { x: -200, y: -200 }, { proportional: true })
    expect(next.scaleX).toBeLessThan(0)
    expect(next.scaleY).toBeLessThan(0)
    // Anchor (TL, buffer 0,0) stays fixed.
    expect(near(apply(next, { x: 0, y: 0 }).x, 0)).toBe(true)
    expect(near(apply(next, { x: 0, y: 0 }).y, 0)).toBe(true)
  })

  it("bishop constraint: proportional corner drag can never flip only one axis", () => {
    // Drag BR (index 3) leftward past the anchor but not diagonally — old code flipped X only.
    const next = resize(IDENTITY, BOX, 3, { x: -200, y: 50 }, { proportional: true })
    expect(next.scaleX < 0).toBe(next.scaleY < 0) // signs must always match
  })
})

describe("resizeCursor", () => {
  it("uses the base cursor at no rotation", () => {
    expect(resizeCursor(0, 0)).toBe("ns-resize") // top edge
    expect(resizeCursor(2, 0)).toBe("ew-resize") // right edge
  })

  it("remaps for rotation (90° turns the top handle east-west)", () => {
    expect(resizeCursor(0, 90)).toBe("ew-resize")
  })

  it("flipped=true swaps diagonal cursors, leaves axis cursors unchanged", () => {
    expect(resizeCursor(1, 0, true)).toBe("nwse-resize") // TR: nesw → nwse
    expect(resizeCursor(3, 0, true)).toBe("nesw-resize") // BR: nwse → nesw
    expect(resizeCursor(0, 0, true)).toBe("ns-resize") // Top: axis cursor unchanged
    expect(resizeCursor(2, 0, true)).toBe("ew-resize") // Right: axis cursor unchanged
  })
})

describe("rotateAbout", () => {
  it("adds the swept angle and snaps to the nearest step", () => {
    expect(
      near(
        rotateAbout(IDENTITY, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }).rotation,
        Math.PI / 2,
      ),
    ).toBe(true)
    const to = { x: Math.cos(0.17), y: Math.sin(0.17) } // ~9.7°, snap to 15°
    expect(
      near(
        rotateAbout(IDENTITY, { x: 0, y: 0 }, { x: 1, y: 0 }, to, 15).rotation,
        (15 * Math.PI) / 180,
      ),
    ).toBe(true)
  })
})

describe("boxCorners", () => {
  it("returns TL, TR, BR, BL", () => {
    expect(boxCorners(BOX)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ])
  })
})

describe("flipHorizontal / flipVertical", () => {
  const centre = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 } // {50, 50}

  it("flipHorizontal: content-box centre stays in place, scaleX negates", () => {
    const t: Transform = { x: 200, y: 100, scaleX: 1, scaleY: 1, rotation: 0 }
    const before = apply(t, centre)
    const after = flipHorizontal(t, BOX)
    const afterPt = apply(after, centre)
    expect(near(afterPt.x, before.x)).toBe(true)
    expect(near(afterPt.y, before.y)).toBe(true)
    expect(after.scaleX).toBe(-t.scaleX)
    expect(after.scaleY).toBe(t.scaleY)
  })

  it("flipVertical: content-box centre stays in place, scaleY negates", () => {
    const t: Transform = { x: 200, y: 100, scaleX: 1, scaleY: 1, rotation: 0 }
    const before = apply(t, centre)
    const after = flipVertical(t, BOX)
    const afterPt = apply(after, centre)
    expect(near(afterPt.x, before.x)).toBe(true)
    expect(near(afterPt.y, before.y)).toBe(true)
    expect(after.scaleX).toBe(t.scaleX)
    expect(after.scaleY).toBe(-t.scaleY)
  })

  it("flipHorizontal: centre-invariant even with non-trivial translation, scale, and rotation", () => {
    const t: Transform = { x: -40, y: 15, scaleX: 1.7, scaleY: 0.6, rotation: 0.9 }
    const before = apply(t, centre)
    const after = flipHorizontal(t, BOX)
    const afterPt = apply(after, centre)
    expect(near(afterPt.x, before.x)).toBe(true)
    expect(near(afterPt.y, before.y)).toBe(true)
  })

  it("double flip restores the original transform", () => {
    const t: Transform = { x: 300, y: 80, scaleX: 2, scaleY: 0.5, rotation: 0.3 }
    const once = flipHorizontal(t, BOX)
    const twice = flipHorizontal(once, BOX)
    expect(near(twice.x, t.x)).toBe(true)
    expect(near(twice.y, t.y)).toBe(true)
    expect(near(twice.scaleX, t.scaleX)).toBe(true)
    expect(near(twice.scaleY, t.scaleY)).toBe(true)
  })
})
