import type { DocumentSnapshot } from "@/editor/state/documentStore"
import type { Layer, LayerType, VectorKind } from "@/editor/types"

/**
 * The `.design` file format: a single JSON document holding the layer stack plus each
 * layer's pixels as an embedded base64 PNG. No dependencies, human-readable. `serialize`
 * and `parse` are pure (parse validates shape + version); the actual pixel encode/decode
 * is done by the caller via the engine seam (`captureLayerPixels`) and {@link decodeDataUrlToCanvas}.
 */

const FORMAT = "boojy-design"
const VERSION = 1

interface SerializedLayer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  opacity: number
  kind?: VectorKind
  /** data: URL PNG of the layer's pixels, or null if it had none (or couldn't be read). */
  pixels: string | null
}

interface DesignFile {
  format: typeof FORMAT
  version: typeof VERSION
  document: { width: number; height: number }
  activeLayerId: string
  nextLayerNum: number
  layers: SerializedLayer[]
}

/** A parsed file split into the document slice and the per-layer pixel data to decode. */
export interface ParsedDesign {
  snapshot: DocumentSnapshot
  pixels: { layerId: string; dataUrl: string }[]
}

/** Serialise the current document to a `.design` JSON string. `getPixels` reads a layer's
 *  pixels from the engine (null under jsdom / for a layer with no node). */
export function serializeDesign(
  snapshot: DocumentSnapshot,
  getPixels: (layerId: string) => HTMLCanvasElement | null,
  size: { width: number; height: number },
): string {
  const layers: SerializedLayer[] = snapshot.layers.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    visible: l.visible,
    opacity: l.opacity,
    ...(l.kind ? { kind: l.kind } : {}),
    pixels: getPixels(l.id)?.toDataURL("image/png") ?? null,
  }))
  const file: DesignFile = {
    format: FORMAT,
    version: VERSION,
    document: size,
    activeLayerId: snapshot.activeLayerId,
    nextLayerNum: snapshot.nextLayerNum,
    layers,
  }
  return JSON.stringify(file)
}

/** Parse + validate a `.design` JSON string. Throws on malformed JSON or an unrecognised
 *  shape/version (the caller fails silently — opening a bad file is a no-op). */
export function parseDesign(json: string): ParsedDesign {
  const data: unknown = JSON.parse(json)
  if (!isDesignFile(data)) throw new Error("Not a recognised .design file")

  const layers: Layer[] = data.layers.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    visible: l.visible,
    opacity: l.opacity,
    ...(l.kind ? { kind: l.kind } : {}),
  }))
  const pixels = data.layers
    .filter((l): l is SerializedLayer & { pixels: string } => typeof l.pixels === "string")
    .map((l) => ({ layerId: l.id, dataUrl: l.pixels }))

  return {
    snapshot: { layers, activeLayerId: data.activeLayerId, nextLayerNum: data.nextLayerNum },
    pixels,
  }
}

/** Decode a base64 PNG data URL into a canvas, sized to the image. DOM/async (uses Image). */
export async function decodeDataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Failed to decode layer pixels"))
    img.src = dataUrl
  })
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext("2d")?.drawImage(img, 0, 0)
  return canvas
}

function isDesignFile(v: unknown): v is DesignFile {
  if (typeof v !== "object" || v === null) return false
  const f = v as Record<string, unknown>
  return (
    f.format === FORMAT &&
    f.version === VERSION &&
    typeof f.activeLayerId === "string" &&
    typeof f.nextLayerNum === "number" &&
    Array.isArray(f.layers) &&
    f.layers.every(isSerializedLayer)
  )
}

function isSerializedLayer(v: unknown): v is SerializedLayer {
  if (typeof v !== "object" || v === null) return false
  const l = v as Record<string, unknown>
  return (
    typeof l.id === "string" &&
    typeof l.name === "string" &&
    (l.type === "raster" || l.type === "vector" || l.type === "image") &&
    typeof l.visible === "boolean" &&
    typeof l.opacity === "number" &&
    (l.pixels === null || typeof l.pixels === "string")
  )
}
