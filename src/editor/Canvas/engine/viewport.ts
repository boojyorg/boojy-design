/**
 * Pure viewport math — turns a zoom percentage + pan offset into the content layer's
 * scale and top-left position. The document is centred in the container, then shifted
 * by the pan offset (screen-space pixels). No Konva/DOM, so it unit-tests directly.
 */

export interface ViewTransform {
  scale: number
  x: number
  y: number
}

/** The mutable view: zoom (%) plus a screen-space pan offset. */
export interface ViewState {
  zoom: number
  panX: number
  panY: number
}

export const ZOOM_MIN = 10
export const ZOOM_MAX = 400

export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

/**
 * Zoom presets the +/- buttons and keys step through — Chrome-like: finer near 100%,
 * coarser at the extremes (a fixed linear step feels wrong at both ends). Pinch/scroll
 * stays continuous; only the discrete controls snap to these rungs.
 */
export const ZOOM_STOPS = [
  10, 25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400,
]

/**
 * The next preset strictly above (`dir` > 0) or below (`dir` < 0) the current `zoom`,
 * clamped to the ends. The 0.5% epsilon means a zoom sitting *on* a rung steps to the
 * next one (rather than snapping back to itself on float drift).
 */
export function nextZoomStop(zoom: number, dir: number): number {
  const eps = 0.5
  if (dir > 0) return ZOOM_STOPS.find((z) => z > zoom + eps) ?? ZOOM_MAX
  return ZOOM_STOPS.filter((z) => z < zoom - eps).at(-1) ?? ZOOM_MIN
}

/**
 * Centre a `docW`×`docH` document in a `containerW`×`containerH` viewport at `zoom`%,
 * then offset by (`panX`, `panY`). pan defaults to 0 ⇒ the document is exactly centred
 * (the pre-pan behaviour). With these applied to the content layer, screen↔doc mapping
 * is `screen = view.x + doc·scale`.
 */
export function computeView(
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
  zoom: number,
  panX = 0,
  panY = 0,
): ViewTransform {
  const scale = zoom / 100
  return {
    scale,
    x: (containerW - docW * scale) / 2 + panX,
    y: (containerH - docH * scale) / 2 + panY,
  }
}

/**
 * Zoom to `nextZoom`% while keeping the document point currently under the screen point
 * (`screenX`, `screenY`) fixed under that same point. Returns the new {zoom, panX, panY}
 * (zoom clamped). Screen coords are container-relative — the same space `computeView` uses.
 */
export function zoomAtPoint(
  prev: ViewState,
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
  nextZoom: number,
  screenX: number,
  screenY: number,
): ViewState {
  const zoom = clampZoom(nextZoom)
  const before = computeView(containerW, containerH, docW, docH, prev.zoom, prev.panX, prev.panY)
  // The doc point currently under the cursor.
  const docX = (screenX - before.x) / before.scale
  const docY = (screenY - before.y) / before.scale
  const scale = zoom / 100
  // Re-solve pan so that doc point lands back under the same screen point at the new scale.
  return {
    zoom,
    panX: screenX - (containerW - docW * scale) / 2 - docX * scale,
    panY: screenY - (containerH - docH * scale) / 2 - docY * scale,
  }
}

/**
 * Fit the document inside the container with a uniform `padding` (px) margin, centred
 * (pan reset to 0). Zoom clamped to the allowed range.
 */
export function fitView(
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
  padding = 0,
): ViewState {
  const availW = Math.max(1, containerW - padding * 2)
  const availH = Math.max(1, containerH - padding * 2)
  const scale = Math.min(availW / docW, availH / docH)
  return { zoom: clampZoom(scale * 100), panX: 0, panY: 0 }
}
