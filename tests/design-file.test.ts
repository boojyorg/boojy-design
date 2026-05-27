import { describe, expect, it, vi } from "vitest"
import type { DocumentSnapshot } from "@/editor/state/documentStore"
import { parseDesign, serializeDesign } from "@/lib/designFile"

const SIZE = { width: 1280, height: 800 }

const snapshot: DocumentSnapshot = {
  layers: [
    { id: "l2", name: "Top", type: "raster", visible: true, opacity: 100 },
    { id: "l1", name: "Rect", type: "vector", visible: false, opacity: 50, kind: "rect" },
  ],
  activeLayerId: "l2",
  nextLayerNum: 3,
}

// jsdom canvases can't rasterize, so fake the pixel read with a stub toDataURL.
function fakePixels(dataUrl: string | null): (id: string) => HTMLCanvasElement | null {
  return () =>
    dataUrl === null ? null : ({ toDataURL: () => dataUrl } as unknown as HTMLCanvasElement)
}

describe("serializeDesign / parseDesign", () => {
  it("round-trips the document metadata and per-layer pixels", () => {
    const json = serializeDesign(snapshot, fakePixels("data:image/png;base64,AAAA"), SIZE)
    const parsed = parseDesign(json)

    expect(parsed.snapshot.activeLayerId).toBe("l2")
    expect(parsed.snapshot.nextLayerNum).toBe(3)
    expect(parsed.snapshot.layers).toEqual(snapshot.layers) // names, order, kind, opacity, visibility
    expect(parsed.pixels).toEqual([
      { layerId: "l2", dataUrl: "data:image/png;base64,AAAA" },
      { layerId: "l1", dataUrl: "data:image/png;base64,AAAA" },
    ])
  })

  it("omits pixel entries for layers with no captured bitmap", () => {
    const json = serializeDesign(snapshot, fakePixels(null), SIZE)
    const parsed = parseDesign(json)
    expect(parsed.pixels).toEqual([])
    expect(parsed.snapshot.layers.map((l) => l.id)).toEqual(["l2", "l1"])
  })

  it("rejects malformed JSON", () => {
    expect(() => parseDesign("{not json")).toThrow()
  })

  it("rejects an unrecognised format or a future version", () => {
    expect(() => parseDesign(JSON.stringify({ format: "something-else", version: 1 }))).toThrow()
    expect(() =>
      parseDesign(
        JSON.stringify({
          format: "boojy-design",
          version: 999,
          activeLayerId: "l1",
          nextLayerNum: 1,
          layers: [],
        }),
      ),
    ).toThrow()
  })

  it("rejects a file whose layers are the wrong shape", () => {
    const bad = JSON.stringify({
      format: "boojy-design",
      version: 1,
      document: SIZE,
      activeLayerId: "l1",
      nextLayerNum: 1,
      layers: [{ id: "l1", name: "x" }], // missing type/visible/opacity/pixels
    })
    expect(() => parseDesign(bad)).toThrow()
  })
})

describe("toDataURL is read once per layer", () => {
  it("calls the pixel getter for every layer", () => {
    const getPixels = vi.fn(() => null)
    serializeDesign(snapshot, getPixels, SIZE)
    expect(getPixels).toHaveBeenCalledTimes(2)
    expect(getPixels).toHaveBeenCalledWith("l2")
    expect(getPixels).toHaveBeenCalledWith("l1")
  })
})
