import type { Point } from "@/editor/Canvas/engine/types"

/**
 * A layer's non-destructive **similarity transform** (uniform scale + rotation + translation),
 * mapping a buffer-space point to document space:
 *
 *   doc = translate(x, y) · rotate(rotation) · scale(scale)   — pivot at the buffer origin.
 *
 * Stored engine-side per layer (not on the thin Layer model). `rotation` is in **radians**.
 * A plain move is just `{ x, y, scale: 1, rotation: 0 }`, so it's a strict superset of the old
 * translate-only offset. Uniform scale only ⇒ the inverse is a clean similarity (no shear), which
 * is what painting on a transformed layer needs. Pure — node-testable without Konva/DOM.
 */
export interface Transform {
  x: number
  y: number
  scale: number
  rotation: number
}

export const IDENTITY: Transform = { x: 0, y: 0, scale: 1, rotation: 0 }

/** Smallest scale a gesture may produce (keeps the transform invertible / visible). */
const MIN_SCALE = 0.02

const rotate = (v: Point, a: number): Point => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
const angle = (v: Point): number => Math.atan2(v.y, v.x)

/** Map a buffer-space point to document space through `t`. */
export function apply(t: Transform, p: Point): Point {
  const scaled = rotate({ x: p.x * t.scale, y: p.y * t.scale }, t.rotation)
  return { x: scaled.x + t.x, y: scaled.y + t.y }
}

/** Map a document-space point back to buffer space (the inverse of {@link apply}). */
export function invert(t: Transform, d: Point): Point {
  const local = rotate(sub(d, { x: t.x, y: t.y }), -t.rotation)
  return { x: local.x / t.scale, y: local.y / t.scale }
}

/** The four corners of a buffer-space box, TL → TR → BR → BL. */
export function boxCorners(box: { x: number; y: number; w: number; h: number }): Point[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x, y: box.y + box.h },
  ]
}

/** Translate the transform by a document-space delta (the move gesture / arrow nudge). */
export function translateBy(t: Transform, dx: number, dy: number): Transform {
  return { ...t, x: t.x + dx, y: t.y + dy }
}

/**
 * Scale uniformly about a fixed document-space `anchor` (the corner opposite the dragged one) so
 * the anchor stays put. Factor = how much farther the cursor (`to`) is from the anchor than the
 * drag start (`from`). No-op if the start coincides with the anchor.
 */
export function scaleAbout(t: Transform, anchor: Point, from: Point, to: Point): Transform {
  const base = dist(anchor, from)
  if (base < 1e-6) return t
  const f = dist(anchor, to) / base
  const scale = Math.max(MIN_SCALE, t.scale * f)
  const k = scale / t.scale // actual applied factor after the min clamp
  return {
    x: k * (t.x - anchor.x) + anchor.x,
    y: k * (t.y - anchor.y) + anchor.y,
    scale,
    rotation: t.rotation,
  }
}

/**
 * Rotate about a fixed document-space `centre` by the angle the cursor swept from `from` to `to`.
 * With `snapDeg`, the resulting absolute rotation snaps to the nearest multiple (e.g. 15°).
 */
export function rotateAbout(
  t: Transform,
  centre: Point,
  from: Point,
  to: Point,
  snapDeg?: number,
): Transform {
  let a = angle(sub(to, centre)) - angle(sub(from, centre))
  if (snapDeg && snapDeg > 0) {
    const step = (snapDeg * Math.PI) / 180
    const snapped = Math.round((t.rotation + a) / step) * step
    a = snapped - t.rotation
  }
  const moved = rotate(sub({ x: t.x, y: t.y }, centre), a)
  return {
    x: moved.x + centre.x,
    y: moved.y + centre.y,
    scale: t.scale,
    rotation: t.rotation + a,
  }
}
