import { compositeOp, hardnessStops, strokeAlpha } from "@/editor/Canvas/engine/brush"
import { hexToRgba } from "@/editor/Canvas/engine/color"
import type { Point } from "@/editor/Canvas/engine/types"

/**
 * The brush/eraser hot path, as ctx-taking draw ops (no Konva, no engine state). The engine
 * owns the buffers — a `strokeCanvas` accumulating stamps at full alpha and a `snapshotCanvas`
 * of the layer at stroke start — and calls these to paint and to flush each frame.
 */

/** What a stamp needs from the brush: diameter, colour and hardness (0–100). */
type StampStyle = { size: number; color: string; hardness: number }

/** Paint one radial-gradient stamp (centre→edge, hardness-shaped) into the stroke buffer at
 *  full alpha. Stroke-level opacity is applied later, once, by `compositeStroke`. */
export function stampInto(ctx: CanvasRenderingContext2D, point: Point, brush: StampStyle): void {
  const radius = Math.max(0.5, brush.size / 2)
  const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
  for (const stop of hardnessStops(brush.hardness)) {
    grad.addColorStop(stop.offset, hexToRgba(brush.color, stop.alpha))
  }
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Redraw the target buffer = snapshot + (stroke composited once at stroke opacity). Recomposing
 * from the snapshot each frame means re-painting within one stroke never darkens past the chosen
 * opacity, and the eraser erases at a uniform strength. Sizes come from the target's own canvas.
 */
export function compositeStroke(
  ctx: CanvasRenderingContext2D,
  snapshot: CanvasImageSource,
  stroke: CanvasImageSource,
  opacity: number,
  tool: "brush" | "eraser",
): void {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = "source-over"
  ctx.drawImage(snapshot, 0, 0)

  ctx.globalAlpha = strokeAlpha(opacity)
  ctx.globalCompositeOperation = compositeOp(tool)
  ctx.drawImage(stroke, 0, 0)

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = "source-over"
}
