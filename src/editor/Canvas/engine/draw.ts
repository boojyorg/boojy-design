import { fitContain } from "@/editor/Canvas/engine/fit"

/**
 * Draw an image into a 2D context, fit-centered within the doc bounds (contain, no upscale).
 * Pure beyond the provided context — pixel-testable without Konva/DOM.
 */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  docW: number,
  docH: number,
): void {
  const { dx, dy, dw, dh } = fitContain(srcW, srcH, docW, docH)
  if (dw <= 0 || dh <= 0) return
  ctx.drawImage(source, dx, dy, dw, dh)
}
