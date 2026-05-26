/**
 * Pure viewport math — turns a zoom percentage into the content layer's scale and
 * top-left offset so the document stays centred in the container. No Konva/DOM.
 */

export interface ViewTransform {
  scale: number
  x: number
  y: number
}

/**
 * Centre a `docW`×`docH` document inside a `containerW`×`containerH` viewport at the
 * given `zoom` percentage. Returns the scale and offset for the content layer; with
 * these applied, Konva's `getRelativePointerPosition()` yields document-space coords.
 */
export function computeView(
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
  zoom: number,
): ViewTransform {
  const scale = zoom / 100
  return {
    scale,
    x: (containerW - docW * scale) / 2,
    y: (containerH - docH * scale) / 2,
  }
}
