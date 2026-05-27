import type { Point } from "@/editor/Canvas/engine/types"

/**
 * A layer's non-destructive **affine transform** (non-uniform scale + rotation + translation),
 * mapping a buffer-space point to document space:
 *
 *   doc = translate(x, y) · rotate(rotation) · scale(scaleX, scaleY)   — pivot at the buffer origin.
 *
 * Stored engine-side per layer (not on the thin Layer model). `rotation` is in **radians**. A plain
 * move is `{ x, y, scaleX: 1, scaleY: 1, rotation: 0 }`. Scale is per-axis (so edge handles can
 * stretch one side) but never sheared, so the inverse stays a clean affine — what painting needs.
 */
export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
}

export const IDENTITY: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }

/** Smallest scale a gesture may produce — keeps the transform invertible and prevents flipping. */
const MIN_SCALE = 0.02
const clampScale = (v: number) => Math.max(MIN_SCALE, v)

interface Box {
  x: number
  y: number
  w: number
  h: number
}

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
  const scaled = rotate({ x: p.x * t.scaleX, y: p.y * t.scaleY }, t.rotation)
  return { x: scaled.x + t.x, y: scaled.y + t.y }
}

/** Map a document-space point back to buffer space (the inverse of {@link apply}). */
export function invert(t: Transform, d: Point): Point {
  const local = rotate(sub(d, { x: t.x, y: t.y }), -t.rotation)
  return { x: local.x / t.scaleX, y: local.y / t.scaleY }
}

/** The four corners of a buffer-space box, TL → TR → BR → BL (for the selection outline). */
export function boxCorners(b: Box): Point[] {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ]
}

/**
 * The 8 transform handles, clockwise from the top edge: Top, Top-Right, Right, Bottom-Right,
 * Bottom, Bottom-Left, Left, Top-Left. Each knows its buffer point and the opposite handle's
 * buffer point (the fixed anchor when dragging it). Edge handles share a coordinate with their
 * anchor, so only the perpendicular axis scales.
 */
export const HANDLES: { point: (b: Box) => Point; anchor: (b: Box) => Point }[] = [
  {
    point: (b) => ({ x: b.x + b.w / 2, y: b.y }),
    anchor: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h }),
  }, // 0 Top
  { point: (b) => ({ x: b.x + b.w, y: b.y }), anchor: (b) => ({ x: b.x, y: b.y + b.h }) }, // 1 TR
  {
    point: (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 }),
    anchor: (b) => ({ x: b.x, y: b.y + b.h / 2 }),
  }, // 2 Right
  { point: (b) => ({ x: b.x + b.w, y: b.y + b.h }), anchor: (b) => ({ x: b.x, y: b.y }) }, // 3 BR
  {
    point: (b) => ({ x: b.x + b.w / 2, y: b.y + b.h }),
    anchor: (b) => ({ x: b.x + b.w / 2, y: b.y }),
  }, // 4 Bottom
  { point: (b) => ({ x: b.x, y: b.y + b.h }), anchor: (b) => ({ x: b.x + b.w, y: b.y }) }, // 5 BL
  {
    point: (b) => ({ x: b.x, y: b.y + b.h / 2 }),
    anchor: (b) => ({ x: b.x + b.w, y: b.y + b.h / 2 }),
  }, // 6 Left
  { point: (b) => ({ x: b.x, y: b.y }), anchor: (b) => ({ x: b.x + b.w, y: b.y + b.h }) }, // 7 TL
]

/** Base resize cursors, indexed like {@link HANDLES} (clockwise from Top). */
const RESIZE_CURSORS = [
  "ns-resize", // Top
  "nesw-resize", // TR
  "ew-resize", // Right
  "nwse-resize", // BR
  "ns-resize", // Bottom
  "nesw-resize", // BL
  "ew-resize", // Left
  "nwse-resize", // TL
]

/**
 * The CSS cursor for a handle, **remapped for the layer's rotation** so it always points the right
 * way: a 90°-rotated layer's top handle shows `ew-resize`, not `ns-resize`. Rotation is snapped to
 * the nearest 45° sector and the index shifted clockwise around the box.
 */
export function resizeCursor(handleIndex: number, rotationDeg: number): string {
  const normalized = ((rotationDeg % 360) + 360) % 360
  const sectorOffset = Math.round(normalized / 45) % 8
  return RESIZE_CURSORS[(handleIndex + sectorOffset) % 8] ?? "default"
}

/** Translate the transform by a document-space delta (the move gesture / arrow nudge). */
export function translateBy(t: Transform, dx: number, dy: number): Transform {
  return { ...t, x: t.x + dx, y: t.y + dy }
}

/**
 * Resize by dragging handle `index` so the cursor follows it, holding the opposite handle fixed in
 * document space. `proportional` (corner default) scales both axes by one distance-ratio factor;
 * otherwise each active axis is set independently (free corner / single-axis edge). Scale is clamped
 * positive, so dragging past the anchor collapses to the minimum rather than flipping.
 */
export function resize(
  start: Transform,
  box: Box,
  index: number,
  cursor: Point,
  opts: { proportional: boolean },
): Transform {
  const def = HANDLES[index]
  if (!def) return start
  const anchorBuf = def.anchor(box)
  const handleBuf = def.point(box)
  const anchorDoc = apply(start, anchorBuf)
  const c = Math.cos(start.rotation)
  const s = Math.sin(start.rotation)
  const ux = { x: c, y: s } // box local +X axis in doc space (unit)
  const uy = { x: -s, y: c } // box local +Y axis in doc space (unit)
  const cv = sub(cursor, anchorDoc)
  const dBx = handleBuf.x - anchorBuf.x
  const dBy = handleBuf.y - anchorBuf.y

  let scaleX = start.scaleX
  let scaleY = start.scaleY
  if (opts.proportional && dBx !== 0 && dBy !== 0) {
    const base = dist(apply(start, handleBuf), anchorDoc)
    if (base > 1e-6) {
      const f = Math.hypot(cv.x, cv.y) / base
      scaleX = start.scaleX * f
      scaleY = start.scaleY * f
    }
  } else {
    if (dBx !== 0) scaleX = (cv.x * ux.x + cv.y * ux.y) / dBx
    if (dBy !== 0) scaleY = (cv.x * uy.x + cv.y * uy.y) / dBy
  }
  scaleX = clampScale(scaleX)
  scaleY = clampScale(scaleY)

  // Keep the anchor fixed: x,y = anchorDoc − R(rotation)·(scale · anchorBuf).
  const a = rotate({ x: scaleX * anchorBuf.x, y: scaleY * anchorBuf.y }, start.rotation)
  return { x: anchorDoc.x - a.x, y: anchorDoc.y - a.y, scaleX, scaleY, rotation: start.rotation }
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
    scaleX: t.scaleX,
    scaleY: t.scaleY,
    rotation: t.rotation + a,
  }
}
