/**
 * Engine-phase types. These intentionally live *outside* the shell's
 * `src/editor/types.ts` (which stays thin and serializable) — pixel buffers,
 * stamp geometry and brush params belong to the engine, not the reducer.
 */
import type { ToolId, VectorKind } from "@/editor/types"

export interface Point {
  x: number
  y: number
}

export interface GradientStop {
  /** 0–1 position from the stamp centre (0) to its edge (1). */
  offset: number
  /** 0–1 colour-alpha multiplier at this stop. */
  alpha: number
}

export interface BrushParams {
  /** The active tool; the engine only paints when this is "brush" or "eraser". */
  tool: ToolId
  /** Hex colour (ignored for the eraser — only the stamp alpha matters there). */
  color: string
  /** Diameter in document pixels. */
  size: number
  /** 0–100, applied once per stroke when compositing onto the layer. */
  opacity: number
  /** 0–100. 100 = hard disc, 0 = fully feathered. */
  hardness: number
  /** Which primitive the Shape tool fills (ignored by brush/eraser). Defaults to "rect". */
  shapeKind?: VectorKind
  /** Fill tool match looseness, 0–100 (ignored by other tools). */
  tolerance?: number
}

/** Fixed document size for this slice (the first real "page"). */
export const DOC_WIDTH = 1280
export const DOC_HEIGHT = 800

/** The page (and white-export) background colour — single source for the Konva page + export. */
export const PAGE_BACKGROUND = "#ffffff"
