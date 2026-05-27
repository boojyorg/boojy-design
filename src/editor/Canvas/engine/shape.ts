import type { Point } from "@/editor/Canvas/engine/types"

/** A document-space axis-aligned rectangle (top-left origin, non-negative size). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Turn a drag (start → current) into a normalized top-left rect — width/height
 * are always ≥ 0, so dragging in any of the four directions Just Works.
 *
 * When `square` is set (Shift held), the shape is constrained to the *larger*
 * drag axis, so it grows to enclose the cursor (the Figma/Photoshop feel). A
 * purely-axial drag (one delta zero) extends rightward / downward by convention.
 *
 * Pure geometry — no canvas — so it's directly unit-testable.
 */
export function normalizeRect(start: Point, current: Point, square: boolean): Rect {
  let dx = current.x - start.x
  let dy = current.y - start.y
  if (square) {
    const side = Math.max(Math.abs(dx), Math.abs(dy))
    dx = (dx < 0 ? -1 : 1) * side
    dy = (dy < 0 ? -1 : 1) * side
  }
  return {
    x: Math.min(start.x, start.x + dx),
    y: Math.min(start.y, start.y + dy),
    w: Math.abs(dx),
    h: Math.abs(dy),
  }
}

/** Fill a rectangle. Opacity/composite are the caller's concern (the engine's render()). */
export function drawRect(ctx: CanvasRenderingContext2D, rect: Rect, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
}

/** Fill an ellipse inscribed in `rect`. `ctx.ellipse` gives anti-aliased edges for free. */
export function drawEllipse(ctx: CanvasRenderingContext2D, rect: Rect, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, rect.h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
}
