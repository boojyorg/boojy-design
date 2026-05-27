export type ToolId =
  | "select"
  | "marquee"
  | "brush"
  | "eraser"
  | "fill"
  | "shape"
  | "eyedropper"
  | "text"
  | "hand"

export type LayerType = "raster" | "vector" | "image"
export type VectorKind = "rect" | "ellipse"

/**
 * Shell layer model — intentionally thinner than the spec's full schema.
 * No `transform`, `bitmap`, or blend mode here: those belong to the engine
 * phase. This is just enough to render the Layers panel.
 */
export interface Layer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  /** 0–100 */
  opacity: number
  /** vector layers only */
  kind?: VectorKind
  /** The document's pinned background layer: opaque paper at the bottom of the stack,
   *  locked from delete / reorder / duplicate. Just one per document. */
  background?: boolean
}
