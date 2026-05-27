import type { Point } from "@/editor/Canvas/engine/types"

/** A layer's non-destructive display offset: where its buffer is drawn, in document pixels. */
export interface Offset {
  x: number
  y: number
}

/**
 * The new offset after dragging a layer from `fromDoc` to `toDoc` in document space, starting
 * from `start`. The delta is rounded to whole pixels so the layer stays pixel-aligned (paint
 * ops index the buffer by integer coords). Pure — the Move tool's only spatial logic, so it's
 * unit-testable without the Konva-coupled engine.
 */
export function moveOffset(start: Offset, fromDoc: Point, toDoc: Point): Offset {
  return {
    x: start.x + Math.round(toDoc.x - fromDoc.x),
    y: start.y + Math.round(toDoc.y - fromDoc.y),
  }
}
