import { IDENTITY, type Transform } from "@/editor/Canvas/engine/transform"
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
  /** Marks the pinned document background layer. Optional → legacy files have none. */
  background?: boolean
  /** data: URL PNG of the layer's pixels, or null for text layers / no content. */
  pixels: string | null
  /** Non-destructive transform; omitted when identity. */
  transform?: Transform
  /** Legacy translate-only offset (pre-transform files) — read as `{…, scale:1, rotation:0}`. */
  offsetX?: number
  offsetY?: number
  /** text layers only — persisted as metadata, no pixels field used. */
  textContent?: string
  fontSize?: number
  textColor?: string
}

interface DesignFile {
  format: typeof FORMAT
  version: typeof VERSION
  document: { width: number; height: number }
  activeLayerId: string
  nextLayerNum: number
  layers: SerializedLayer[]
}

/** A parsed file split into the document slice, per-layer pixel data, and per-layer transforms. */
export interface ParsedDesign {
  snapshot: DocumentSnapshot
  pixels: { layerId: string; dataUrl: string }[]
  transforms: { layerId: string; transform: Transform }[]
}

const isIdentity = (t: Transform) =>
  t.x === 0 && t.y === 0 && t.scaleX === 1 && t.scaleY === 1 && t.rotation === 0

/** Coerce an unknown to a Transform, or null if it isn't one (validates on open). Accepts both the
 *  current `{scaleX, scaleY}` shape and a legacy uniform `{scale}` (→ both axes). */
function asTransform(v: unknown): Transform | null {
  if (typeof v !== "object" || v === null) return null
  const t = v as Record<string, unknown>
  if (typeof t.x !== "number" || typeof t.y !== "number" || typeof t.rotation !== "number") {
    return null
  }
  if (typeof t.scaleX === "number" && typeof t.scaleY === "number") {
    return { x: t.x, y: t.y, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation }
  }
  if (typeof t.scale === "number") {
    return { x: t.x, y: t.y, scaleX: t.scale, scaleY: t.scale, rotation: t.rotation }
  }
  return null
}

/** Serialise the current document to a `.design` JSON string. `getPixels` reads a layer's
 *  pixels from the engine (null under jsdom / for a layer with no node); `getTransform` reads
 *  its non-destructive transform (defaults to identity). */
export function serializeDesign(
  snapshot: DocumentSnapshot,
  getPixels: (layerId: string) => HTMLCanvasElement | null,
  size: { width: number; height: number },
  getTransform: (layerId: string) => Transform = () => IDENTITY,
): string {
  const layers: SerializedLayer[] = snapshot.layers.map((l) => {
    const t = getTransform(l.id)
    const base = {
      id: l.id,
      name: l.name,
      type: l.type,
      visible: l.visible,
      opacity: l.opacity,
      ...(l.kind ? { kind: l.kind } : {}),
      ...(l.background ? { background: true } : {}),
      ...(isIdentity(t) ? {} : { transform: t }),
    }
    if (l.type === "text") {
      return {
        ...base,
        pixels: null,
        ...(l.textContent !== undefined ? { textContent: l.textContent } : {}),
        ...(l.fontSize !== undefined ? { fontSize: l.fontSize } : {}),
        ...(l.textColor !== undefined ? { textColor: l.textColor } : {}),
      }
    }
    return { ...base, pixels: getPixels(l.id)?.toDataURL("image/png") ?? null }
  })
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
    ...(l.background ? { background: true } : {}),
    ...(l.type === "text"
      ? {
          textContent: l.textContent ?? "",
          fontSize: l.fontSize ?? 40,
          textColor: l.textColor ?? "#000000",
        }
      : {}),
  }))
  const pixels = data.layers
    .filter((l): l is SerializedLayer & { pixels: string } => typeof l.pixels === "string")
    .map((l) => ({ layerId: l.id, dataUrl: l.pixels }))
  const transforms = data.layers
    .map((l) => {
      const t = asTransform(l.transform)
      if (t) return { layerId: l.id, transform: t }
      // Legacy translate-only offset → a transform with unit scale / no rotation.
      if (typeof l.offsetX === "number" && typeof l.offsetY === "number") {
        return {
          layerId: l.id,
          transform: { x: l.offsetX, y: l.offsetY, scaleX: 1, scaleY: 1, rotation: 0 },
        }
      }
      return null
    })
    .filter((x): x is { layerId: string; transform: Transform } => x !== null)

  return {
    snapshot: { layers, activeLayerId: data.activeLayerId, nextLayerNum: data.nextLayerNum },
    pixels,
    transforms,
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
    (l.type === "raster" || l.type === "vector" || l.type === "image" || l.type === "text") &&
    typeof l.visible === "boolean" &&
    typeof l.opacity === "number" &&
    (l.pixels === null || typeof l.pixels === "string")
  )
}
