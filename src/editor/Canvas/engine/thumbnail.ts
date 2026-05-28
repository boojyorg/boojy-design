/** The tight bounding box of a layer's non-transparent pixels (used to crop its thumbnail). */
export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Scan an RGBA buffer for the bounding box of pixels with alpha > 0. Returns null when the
 * buffer is fully transparent (a blank layer → no thumbnail). Pure — testable on a raw array.
 */
export function contentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Bounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null // nothing opaque anywhere
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/**
 * Fit a raster layer's content box into a `w`×`h` thumbnail context, centred. Upscaling is
 * allowed so a small mark still reads large. Ctx-taking — the caller owns the thumbnail canvas.
 */
export function drawRasterThumbnail(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  bounds: Bounds,
  w: number,
  h: number,
): void {
  const scale = Math.min(w / bounds.w, h / bounds.h)
  const dw = bounds.w * scale
  const dh = bounds.h * scale
  ctx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

/** Draw a text layer's first glyphs into a thumbnail context, vertically centred. Font size is
 *  capped to ~⅔ of the thumbnail height so long/large text still fits. */
export function drawTextThumbnail(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  color: string,
  h: number,
): void {
  const fs = Math.min(fontSize, Math.round(h * 0.65))
  ctx.font = `${fs}px sans-serif`
  ctx.fillStyle = color
  ctx.textBaseline = "middle"
  ctx.fillText(text.slice(0, 14), 4, h / 2)
}
