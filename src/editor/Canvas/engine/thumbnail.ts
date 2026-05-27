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
