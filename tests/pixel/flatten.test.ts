import { type Canvas, createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { flattenLayers } from "@/editor/Canvas/engine/flatten"
import type { Layer } from "@/editor/types"

// Real-canvas tests (node project, @napi-rs/canvas). The @napi-rs context implements the
// same 2D API as the browser's, so we cast to the DOM types the source code is written against.
const W = 4
const H = 4

function solid(color: string): Canvas {
  const c = createCanvas(W, H)
  const ctx = c.getContext("2d")
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, H)
  return c
}

function layer(id: string, extra: Partial<Layer> = {}): Layer {
  return { id, name: id, type: "raster", visible: true, opacity: 100, ...extra }
}

function flatten(
  layers: Layer[],
  canvases: Record<string, Canvas>,
  background: "white" | "transparent",
): Uint8ClampedArray {
  const out = createCanvas(W, H)
  const ctx = out.getContext("2d")
  flattenLayers(
    ctx as unknown as CanvasRenderingContext2D,
    layers,
    (id) => canvases[id] as unknown as CanvasImageSource | undefined,
    { background, backgroundColor: "#ffffff", width: W, height: H },
  )
  return ctx.getImageData(0, 0, W, H).data as unknown as Uint8ClampedArray
}

describe("flattenLayers (real canvas)", () => {
  it("fills a white background then paints an opaque layer", () => {
    const d = flatten([layer("a")], { a: solid("#ff0000") }, "white")
    expect([d[0], d[1], d[2], d[3]]).toEqual([255, 0, 0, 255])
  })

  it("leaves transparent where nothing paints", () => {
    const d = flatten([], {}, "transparent")
    expect(d[3]).toBe(0)
  })

  it("skips hidden layers", () => {
    const d = flatten([layer("a", { visible: false })], { a: solid("#ff0000") }, "transparent")
    expect(d[3]).toBe(0)
  })

  it("applies layer opacity when compositing over white", () => {
    // 50% red over white ≈ (255, 128, 128)
    const d = flatten([layer("a", { opacity: 50 })], { a: solid("#ff0000") }, "white")
    expect(d[0]).toBe(255)
    expect(d[1]).toBeGreaterThan(120)
    expect(d[1]).toBeLessThan(136)
    expect(d[2]).toBeGreaterThan(120)
    expect(d[2]).toBeLessThan(136)
  })

  it("paints top-of-stack (index 0) last", () => {
    // top = blue (opaque) over bottom = red → blue wins
    const d = flatten(
      [layer("top"), layer("bottom")],
      { top: solid("#0000ff"), bottom: solid("#ff0000") },
      "white",
    )
    expect([d[0], d[1], d[2]]).toEqual([0, 0, 255])
  })
})
