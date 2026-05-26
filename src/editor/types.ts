export type ToolId = "select" | "brush" | "eraser" | "shape" | "text" | "hand"

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
}
