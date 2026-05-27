import { describe, expect, it } from "vitest"
import { moveOffset } from "@/editor/Canvas/engine/move"

describe("moveOffset", () => {
  it("adds the rounded drag delta to the starting offset", () => {
    expect(moveOffset({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 40, y: 25 })).toEqual({
      x: 30,
      y: 15,
    })
  })

  it("accumulates from the starting offset (re-dragging a moved layer)", () => {
    expect(moveOffset({ x: 100, y: -20 }, { x: 5, y: 5 }, { x: 5, y: 55 })).toEqual({
      x: 100,
      y: 30,
    })
  })

  it("rounds sub-pixel deltas to whole pixels (offsets stay pixel-aligned)", () => {
    expect(moveOffset({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2.4, y: 2.6 })).toEqual({
      x: 2,
      y: 3,
    })
  })

  it("returns the starting offset for a zero drag", () => {
    expect(moveOffset({ x: 7, y: 9 }, { x: 3, y: 3 }, { x: 3, y: 3 })).toEqual({ x: 7, y: 9 })
  })
})
