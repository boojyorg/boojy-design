import type { Layer } from "@/editor/types"

export interface FlattenOpts {
  background: "white" | "transparent"
  backgroundColor: string
  width: number
  height: number
}

/**
 * Composite layers onto a target 2D context, bottom→top (layers[0] is top of the stack),
 * skipping hidden layers and applying each layer's opacity. Pure — touches only the
 * provided context; `getCanvas` resolves a layer id to its pixel source, and `getOffset`
 * resolves its non-destructive display offset (so a moved layer composites where it shows,
 * and content shifted past the page edge is cropped by the target's bounds). Extracted from
 * the engine so it can be pixel-tested with a real canvas (no Konva/DOM).
 */
export function flattenLayers(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  getCanvas: (id: string) => CanvasImageSource | undefined,
  opts: FlattenOpts,
  getOffset: (id: string) => { x: number; y: number } = () => ({ x: 0, y: 0 }),
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
    const { x, y } = getOffset(layer.id)
    ctx.globalAlpha = layer.opacity / 100
    ctx.drawImage(source, x, y)
  }
  ctx.globalAlpha = 1
}
