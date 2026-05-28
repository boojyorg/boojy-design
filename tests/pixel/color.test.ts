import { type Canvas, createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { hexToRgba, rgbaToHex } from "@/editor/Canvas/engine/color"
import { flattenLayers } from "@/editor/Canvas/engine/flatten"
import type { Layer } from "@/editor/types"

describe("rgbaToHex", () => {
  it("formats RGB triples as uppercase #RRGGBB", () => {
    expect(rgbaToHex(0, 0, 0)).toBe("#000000")
    expect(rgbaToHex(255, 255, 255)).toBe("#FFFFFF")
    expect(rgbaToHex(232, 153, 64)).toBe("#E89940")
  })

  it("zero-pads single-digit channels", () => {
    expect(rgbaToHex(1, 2, 3)).toBe("#010203")
  })
})

describe("hexToRgba", () => {
  it("expands #RRGGBB to an rgba() string at the given alpha", () => {
    expect(hexToRgba("#E89940", 0.5)).toBe("rgba(232, 153, 64, 0.5)")
  })

  it("expands shorthand #RGB", () => {
    expect(hexToRgba("#fff", 1)).toBe("rgba(255, 255, 255, 1)")
  })
})

// The eyedropper samples the flattened composite then hexes it — exercise that path on a
// real @napi-rs canvas (the engine method itself is Konva-coupled and can't run here).
const W = 4
const H = 4

function solid(color: string): Canvas {
  const c = createCanvas(W, H)
  const ctx = c.getContext("2d")
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, H)
  return c
}

function sampleHex(layers: Layer[], canvases: Record<string, Canvas>): string {
  const out = createCanvas(W, H)
  const ctx = out.getContext("2d")
  flattenLayers(
    ctx as unknown as CanvasRenderingContext2D,
    layers,
    (id) => canvases[id] as unknown as CanvasImageSource | undefined,
    { background: "white", backgroundColor: "#ffffff", width: W, height: H },
  )
  const d = ctx.getImageData(1, 1, 1, 1).data
  return rgbaToHex(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0)
}

describe("sampling the flattened composite", () => {
  const layer = (id: string): Layer => ({
    id,
    name: id,
    type: "raster",
    visible: true,
    opacity: 100,
  })

  it("returns the opaque layer's colour", () => {
    expect(sampleHex([layer("a")], { a: solid("#ff0000") })).toBe("#FF0000")
  })

  it("returns the white page where nothing is painted", () => {
    expect(sampleHex([], {})).toBe("#FFFFFF")
  })
})
