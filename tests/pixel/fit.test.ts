import { describe, expect, it } from "vitest"
import { fitContain } from "@/editor/Canvas/engine/fit"

describe("fitContain", () => {
  it("letterboxes a wide image (full width, bars top/bottom)", () => {
    // 2000×500 into 1280×800 → scale 0.64 → 1280×320, centered vertically
    expect(fitContain(2000, 500, 1280, 800)).toEqual({ dx: 0, dy: 240, dw: 1280, dh: 320 })
  })

  it("pillarboxes a tall image (full height, bars left/right)", () => {
    // 500×2000 into 1280×800 → scale 0.4 → 200×800, centered horizontally
    expect(fitContain(500, 2000, 1280, 800)).toEqual({ dx: 540, dy: 0, dw: 200, dh: 800 })
  })

  it("does not upscale a small image — keeps native size, centered", () => {
    expect(fitContain(100, 50, 1280, 800)).toEqual({ dx: 590, dy: 375, dw: 100, dh: 50 })
  })

  it("returns an empty rect for degenerate dimensions", () => {
    expect(fitContain(0, 100, 1280, 800)).toEqual({ dx: 0, dy: 0, dw: 0, dh: 0 })
  })
})
