/** An RGB triple, 0–255 each. */
export interface Rgb {
  r: number
  g: number
  b: number
}

/**
 * Contiguous flood fill on raw RGBA pixel data, in place. Starting at (startX, startY),
 * replaces the connected region of pixels whose colour is within `tolerance` of the seed
 * with an opaque `fill`. 4-connected, iterative (an explicit stack — no recursion, so a
 * full-page fill can't blow the call stack).
 *
 * `tolerance` is 0–255: a pixel matches when the max per-channel difference (R/G/B/A) from
 * the seed pixel is ≤ tolerance. 0 = exact match only.
 *
 * After the flood, `grow` is the max number of steps it marches outward into the anti-aliased
 * feather, compositing the fill *under* each absorbed pixel (so the stroke colour stays on top
 * and the join is a smooth gradient — no fringe ring). It only absorbs partly-transparent
 * pixels (0 < alpha < 255), halting at the solid stroke core (255) and at the transparent
 * exterior (0); the latter keeps it from leaking into open canvas through thin spots.
 *
 * Pure beyond mutating `data`.
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fill: Rgb,
  tolerance: number,
  grow: number,
): void {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return

  const at = (x: number, y: number) => (y * width + x) * 4
  const seed = at(startX, startY)
  const sr = data[seed] ?? 0
  const sg = data[seed + 1] ?? 0
  const sb = data[seed + 2] ?? 0
  const sa = data[seed + 3] ?? 0

  // Nothing to do if the seed is already the fill colour (opaque) — avoids a pointless sweep.
  if (sr === fill.r && sg === fill.g && sb === fill.b && sa === 255) return

  const matches = (i: number) =>
    Math.max(
      Math.abs((data[i] ?? 0) - sr),
      Math.abs((data[i + 1] ?? 0) - sg),
      Math.abs((data[i + 2] ?? 0) - sb),
      Math.abs((data[i + 3] ?? 0) - sa),
    ) <= tolerance

  const seen = new Uint8Array(width * height)
  // Hard fill — used for the flooded interior (it should fully take the fill colour).
  const paint = (p: number) => {
    seen[p] = 1
    const i = p * 4
    data[i] = fill.r
    data[i + 1] = fill.g
    data[i + 2] = fill.b
    data[i + 3] = 255
  }
  // Composite the (opaque) fill *under* the existing semi-transparent pixel — used for the
  // anti-aliased feather, so the stroke colour stays on top and the join is a smooth gradient.
  const paintUnder = (p: number) => {
    seen[p] = 1
    const i = p * 4
    const a = (data[i + 3] ?? 0) / 255
    data[i] = (data[i] ?? 0) * a + fill.r * (1 - a)
    data[i + 1] = (data[i + 1] ?? 0) * a + fill.g * (1 - a)
    data[i + 2] = (data[i + 2] ?? 0) * a + fill.b * (1 - a)
    data[i + 3] = 255
  }

  const stack: number[] = [startX, startY]
  // Pixels filled this round, used to seed the grow frontier.
  const filled: number[] = []

  while (stack.length) {
    // biome-ignore lint/style/noNonNullAssertion: stack has pairs; length checked above.
    const y = stack.pop()!
    // biome-ignore lint/style/noNonNullAssertion: pushed in (x, y) pairs.
    const x = stack.pop()!
    const p = y * width + x
    if (seen[p]) continue
    if (!matches(p * 4)) continue
    paint(p)
    filled.push(p)

    if (x > 0) stack.push(x - 1, y)
    if (x < width - 1) stack.push(x + 1, y)
    if (y > 0) stack.push(x, y - 1)
    if (y < height - 1) stack.push(x, y + 1)
  }

  // Grow into the anti-aliased feather: march up to `grow` steps, compositing the fill under
  // each absorbed pixel. Gate on 0 < alpha < 255 so it halts at the solid stroke core (255)
  // AND at the transparent exterior (0) — the latter stops it leaking into open canvas through
  // thin/soft spots in a stroke.
  let frontier = filled
  for (let step = 0; step < grow && frontier.length; step++) {
    const next: number[] = []
    for (const p of frontier) {
      const x = p % width
      const y = (p / width) | 0
      const neighbours = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ]
      for (const np of neighbours) {
        if (np < 0 || seen[np]) continue
        const na = data[np * 4 + 3] ?? 0
        if (na <= 0 || na >= 255) continue // halt at transparent exterior and solid core
        paintUnder(np)
        next.push(np)
      }
    }
    frontier = next
  }
}
