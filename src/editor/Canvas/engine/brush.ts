import type { GradientStop, Point } from "@/editor/Canvas/engine/types"

/**
 * Pure brush math — no Konva, no DOM. The engine turns these results into actual
 * canvas draw calls; keeping the geometry here makes it unit-testable without a
 * real 2D context (which jsdom doesn't provide).
 */

/** Fraction of brush diameter between successive stamps along a stroke. */
const SPACING_FRACTION = 0.15

/** Distance (document px) between stamp centres for a given brush diameter. */
export function stampSpacing(size: number): number {
  return Math.max(1, size * SPACING_FRACTION)
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

/**
 * Snap `to` onto the nearest 45° ray from `from`, keeping the same distance — so a
 * Shift-held brush stroke locks to a straight horizontal / vertical / diagonal line.
 * A zero-length move returns `from` unchanged.
 */
export function snapTo45(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: from.x, y: from.y }
  const step = Math.PI / 4 // 45°
  const angle = Math.round(Math.atan2(dy, dx) / step) * step
  return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length }
}

export interface StampRun {
  /** Stamp centres to draw along this segment, in order. */
  points: Point[]
  /** Distance travelled since the last stamp, to carry into the next segment. */
  carryOver: number
}

/**
 * Place stamp centres along the segment `from`→`to` at fixed `spacing`, given the
 * distance already accumulated since the previous stamp (`carryOver`, in [0, spacing)).
 * Distance-based so fast pointer moves never leave gaps.
 */
export function interpolateStamps(
  from: Point,
  to: Point,
  spacing: number,
  carryOver: number,
): StampRun {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const points: Point[] = []

  if (length === 0) {
    return { points, carryOver }
  }

  // First stamp falls `spacing - carryOver` into this segment.
  let next = spacing - carryOver
  while (next <= length) {
    points.push(lerp(from, to, next / length))
    next += spacing
  }

  const lastStamp = next - spacing // position of the final stamp placed (< 0 if none)
  const carry = points.length > 0 ? length - lastStamp : carryOver + length
  return { points, carryOver: carry }
}

/**
 * Radial-gradient stops (centre → edge) for a stamp at the given hardness (0–100).
 * 100 = hard disc, 0 = fully feathered. `alpha` is the colour-alpha multiplier.
 */
export function hardnessStops(hardness: number): GradientStop[] {
  const core = Math.min(1, Math.max(0, hardness / 100))
  if (core >= 1) {
    return [
      { offset: 0, alpha: 1 },
      { offset: 1, alpha: 1 },
    ]
  }
  if (core <= 0) {
    return [
      { offset: 0, alpha: 1 },
      { offset: 1, alpha: 0 },
    ]
  }
  return [
    { offset: 0, alpha: 1 },
    { offset: core, alpha: 1 },
    { offset: 1, alpha: 0 },
  ]
}

/** Stroke-level alpha (0–1), applied once when compositing the stroke onto the layer. */
export function strokeAlpha(opacity: number): number {
  return Math.min(1, Math.max(0, opacity / 100))
}

/** Canvas composite operation used when flushing the stroke buffer onto the layer. */
export function compositeOp(tool: "brush" | "eraser"): "source-over" | "destination-out" {
  return tool === "eraser" ? "destination-out" : "source-over"
}
