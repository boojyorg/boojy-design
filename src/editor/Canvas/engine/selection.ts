import { type Box, invert, type Transform } from "@/editor/Canvas/engine/transform"

export type FlipAxis = "h" | "v"

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
  ctx.imageSmoothingEnabled = false
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
  const [c0, c1, c2, c3] = [
    invert(transform, { x: rect.x, y: rect.y }),
    invert(transform, { x: rect.x + rect.w, y: rect.y }),
    invert(transform, { x: rect.x + rect.w, y: rect.y + rect.h }),
    invert(transform, { x: rect.x, y: rect.y + rect.h }),
  ]
  if (!c0 || !c1 || !c2 || !c3) return
  targetCtx.save()
  targetCtx.beginPath()
  targetCtx.moveTo(c0.x, c0.y)
  targetCtx.lineTo(c1.x, c1.y)
  targetCtx.lineTo(c2.x, c2.y)
  targetCtx.lineTo(c3.x, c3.y)
  targetCtx.closePath()
  targetCtx.clip()
  targetCtx.clearRect(0, 0, docWidth, docHeight)
  targetCtx.restore()
}

/**
 * Flip the pixels inside a doc-space selection rect (axis-aligned) on the source layer,
 * respecting the layer's affine transform. Pixels outside the rect are not touched.
 *
 * Algorithm:
 *  1. Extract the selected region into `scratch` via `copyRegion` (doc-space copy).
 *  2. Clear that region from the source buffer via `clearRegion`.
 *  3. Draw `scratch` back into the source buffer through the composite transform
 *     T_inv ∘ T_flip, where T_inv is the inverse layer transform (doc → buffer) and
 *     T_flip mirrors about the rect's centre axis in doc space.
 *
 * The caller allocates `scratch` (doc-space sized) — use `document.createElement("canvas")`
 * in production and `createCanvas` from @napi-rs/canvas in pixel tests.
 */
export function flipRegion(
  sourceCanvas: HTMLCanvasElement,
  sourceCtx: CanvasRenderingContext2D,
  transform: Transform,
  rect: Box,
  axis: FlipAxis,
  scratch: HTMLCanvasElement,
  docWidth: number,
  docHeight: number,
): void {
  const scratchCtx = scratch.getContext("2d")
  if (!scratchCtx) return

  // Step 1: Extract the region (doc space) to scratch.
  scratchCtx.clearRect(0, 0, docWidth, docHeight)
  copyRegion(sourceCanvas, transform, rect, scratch)

  // Step 2: Clear the region from source.
  clearRegion(sourceCtx, transform, rect, docWidth, docHeight)

  // Step 3: Draw scratch back with CTM = T_inv · T_flip so that each doc-space pixel
  // is first flipped within the rect, then mapped to the correct buffer position.
  // Canvas API: each call right-multiplies the CTM, so applying T_inv first then T_flip
  // gives CTM = T_inv * T_flip — which maps scratch coord s → T_flip(s) → T_inv(T_flip(s)).
  sourceCtx.save()
  sourceCtx.imageSmoothingEnabled = false
  // Apply T_inv (inverse layer transform: doc → buffer).
  sourceCtx.scale(1 / transform.scaleX, 1 / transform.scaleY)
  sourceCtx.rotate(-transform.rotation)
  sourceCtx.translate(-transform.x, -transform.y)
  // Apply T_flip (mirror about the rect's centre axis in doc space).
  if (axis === "h") {
    sourceCtx.translate(2 * (rect.x + rect.w / 2), 0)
    sourceCtx.scale(-1, 1)
  } else {
    sourceCtx.translate(0, 2 * (rect.y + rect.h / 2))
    sourceCtx.scale(1, -1)
  }
  sourceCtx.drawImage(scratch, 0, 0)
  sourceCtx.restore()
}
