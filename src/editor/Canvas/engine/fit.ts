export interface FitRect {
  dx: number
  dy: number
  dw: number
  dh: number
}

/**
 * Centre an image of `imgW`×`imgH` inside a `docW`×`docH` page, scaled to fit (contain)
 * without upscaling past its natural size. Returns the destination rect for drawImage.
 * Pure — unit-tested. Degenerate (non-positive) dimensions yield an empty rect.
 */
export function fitContain(imgW: number, imgH: number, docW: number, docH: number): FitRect {
  if (imgW <= 0 || imgH <= 0) return { dx: 0, dy: 0, dw: 0, dh: 0 }
  const scale = Math.min(docW / imgW, docH / imgH, 1)
  const dw = imgW * scale
  const dh = imgH * scale
  return { dx: (docW - dw) / 2, dy: (docH - dh) / 2, dw, dh }
}
