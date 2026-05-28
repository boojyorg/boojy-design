import type { Bounds } from "@/editor/Canvas/engine/thumbnail"

/**
 * Pure text geometry + rendering for live text layers. The engine owns the Konva.Text
 * nodes and the layer lookups; these helpers do the canvas-measuring and drawing so the
 * `measureText` boilerplate lives in one place and is unit-testable on a real context.
 *
 * Every function takes the 2D context as a caller-supplied parameter (the engine passes a
 * scratch context from the DOM; node tests pass an `@napi-rs/canvas` context). Width is
 * estimated as `fontSize * length * 0.6` when no context is available (jsdom).
 */

/** Text layers render single-line `sans-serif`; box height is this multiple of the font size. */
const FONT_FAMILY = "sans-serif"
const LINE_HEIGHT = 1.3

/** Rough width when no measuring context exists (jsdom) — average glyph ≈ 0.6em. */
function approxWidth(text: string, fontSize: number): number {
  return fontSize * text.length * 0.6
}

/** Measured width of `text` at `fontSize`, or the `0.6em` estimate when `ctx` is null. */
export function measureTextWidth(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
): number {
  if (!ctx) return approxWidth(text, fontSize)
  ctx.font = `${fontSize}px ${FONT_FAMILY}`
  return ctx.measureText(text).width
}

/** The text layer's bounding box in buffer-local space (origin at 0,0). */
export function textContentBox(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
): Bounds {
  return { x: 0, y: 0, w: measureTextWidth(ctx, text, fontSize), h: fontSize * LINE_HEIGHT }
}

/**
 * The caret index for a local-X offset over the text: the character boundary nearest the
 * click, by midpoint (the boundary flips once the cursor passes a glyph's centre). Returns
 * 0 for empty text or no context, `text.length` when the offset is past the end.
 */
export function caretIndexAt(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
  localX: number,
): number {
  if (!ctx || !text) return 0
  ctx.font = `${fontSize}px ${FONT_FAMILY}`
  let prev = 0
  for (let i = 1; i <= text.length; i++) {
    const w = ctx.measureText(text.slice(0, i)).width
    if (localX < (prev + w) / 2) return i - 1
    prev = w
  }
  return text.length
}

/** Draw a text layer's content into `ctx` at the origin (top-left baseline). Pure draw —
 *  the caller owns the canvas, its size and any transform. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  color: string,
): void {
  ctx.font = `${fontSize}px ${FONT_FAMILY}`
  ctx.fillStyle = color
  ctx.textBaseline = "top"
  ctx.fillText(text, 0, 0)
}
