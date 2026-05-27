import { type Box, invert, type Transform } from "@/editor/Canvas/engine/transform"

/**
 * Copy the pixels of sourceCanvas (in buffer space) that lie within a doc-space selection
 * rect into `out` (a caller-supplied canvas, typically doc-space sized). Pixels outside the
 * rect are left transparent. Keeping doc-space dimensions means paste can stash the result
 * directly as a layer buffer (a transform offset positions it correctly on the page).
 *
 * The caller allocates `out` — use `document.createElement("canvas")` in production and
 * `createCanvas` from @napi-rs/canvas in pixel tests.
 */
export function copyRegion(
  sourceCanvas: HTMLCanvasElement,
  transform: Transform,
  rect: Box,
  out: HTMLCanvasElement,
): void {
  const ctx = out.getContext("2d")
  if (!ctx) return

  // Clip to the axis-aligned selection rect in doc space, then draw the transformed layer.
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  ctx.translate(transform.x, transform.y)
  ctx.rotate(transform.rotation)
  ctx.scale(transform.scaleX, transform.scaleY)
  ctx.drawImage(sourceCanvas, 0, 0)
  ctx.restore()
}

/**
 * Clear the pixels of targetCtx (buffer space) that correspond to the doc-space selection
 * rect, taking the layer's transform into account. For identity/translated layers this is a
 * simple clip-clearRect; for rotated/scaled layers the inverse-mapped quad is clipped before
 * clearing the whole buffer — one code path handles all transforms.
 */
export function clearRegion(
  targetCtx: CanvasRenderingContext2D,
  transform: Transform,
  rect: Box,
  docWidth: number,
  docHeight: number,
): void {
  // Map the four doc-space corners of the selection rect back to buffer space via invert().
  const corners = [
    invert(transform, { x: rect.x, y: rect.y }),
    invert(transform, { x: rect.x + rect.w, y: rect.y }),
    invert(transform, { x: rect.x + rect.w, y: rect.y + rect.h }),
    invert(transform, { x: rect.x, y: rect.y + rect.h }),
  ]
  targetCtx.save()
  targetCtx.beginPath()
  targetCtx.moveTo(corners[0]!.x, corners[0]!.y)
  targetCtx.lineTo(corners[1]!.x, corners[1]!.y)
  targetCtx.lineTo(corners[2]!.x, corners[2]!.y)
  targetCtx.lineTo(corners[3]!.x, corners[3]!.y)
  targetCtx.closePath()
  targetCtx.clip()
  targetCtx.clearRect(0, 0, docWidth, docHeight)
  targetCtx.restore()
}
