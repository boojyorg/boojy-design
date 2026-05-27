import { IDENTITY, type Transform } from "@/editor/Canvas/engine/transform"
import type { Layer } from "@/editor/types"

export interface FlattenOpts {
  background: "white" | "transparent"
  backgroundColor: string
  width: number
  height: number
}

/**
 * Composite layers onto a target 2D context, bottom→top (layers[0] is top of the stack),
 * skipping hidden layers and applying each layer's opacity. Pure — touches only the provided
 * context; `getCanvas` resolves a layer id to its pixel source, and `getTransform` resolves its
 * non-destructive transform (so a moved/scaled/rotated layer composites where it shows, and
 * anything past the page edge is cropped by the target's bounds). Extracted from the engine so it
 * can be pixel-tested with a real canvas (no Konva/DOM).
 */
export function flattenLayers(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  getCanvas: (id: string) => CanvasImageSource | undefined,
  opts: FlattenOpts,
  getTransform: (id: string) => Transform = () => IDENTITY,
): void {
  if (opts.background === "white") {
    ctx.fillStyle = opts.backgroundColor
    ctx.fillRect(0, 0, opts.width, opts.height)
  }
  // layers[0] is top of the stack, so paint the reversed list bottom→top.
  for (const layer of [...layers].reverse()) {
    if (!layer.visible) continue
    const source = getCanvas(layer.id)
    if (!source) continue
    const t = getTransform(layer.id)
    ctx.globalAlpha = layer.opacity / 100
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.rotate(t.rotation)
    ctx.scale(t.scale, t.scale)
    ctx.drawImage(source, 0, 0)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}
