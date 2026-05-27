import { useReducer } from "react"
import type { ToolId, VectorKind } from "@/editor/types"

/**
 * Shell UI state — tool selection, brush params, and panel chrome. One reducer,
 * local-only. The document model (layers/active layer) lives in `documentStore` and
 * the canvas viewport (zoom + pan) in `viewportStore`; only pure-UI bits remain here.
 * Nothing here is persisted.
 */
export interface EditorState {
  activeTool: ToolId
  /** The tool to restore after an eyedropper sample (set when entering the eyedropper). */
  previousTool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  /** Secondary colour slot. Painting always uses `foreground`; X swaps the two,
   *  D resets to black/white. No tool consumes `background` directly yet. */
  background: string
  /** Which primitive the Shape tool draws. */
  shapeKind: VectorKind
  /** Fill tool match looseness, 0–100. */
  fillTolerance: number
  rightCollapsed: boolean
}

export type EditorAction =
  | { type: "setTool"; tool: ToolId }
  | { type: "setBrushSize"; value: number }
  | { type: "nudgeBrushSize"; delta: number }
  | { type: "setHardness"; value: number }
  | { type: "setOpacity"; value: number }
  | { type: "setForeground"; color: string }
  | { type: "setBackground"; color: string }
  | { type: "swapColors" }
  | { type: "resetColors" }
  | { type: "applySampledColor"; color: string }
  | { type: "setShapeKind"; kind: VectorKind }
  | { type: "setFillTolerance"; value: number }
  | { type: "toggleRight" }

const initialState: EditorState = {
  activeTool: "brush",
  previousTool: "brush",
  brushSize: 30,
  hardness: 80,
  opacity: 100,
  foreground: "#E89940",
  background: "#FFFFFF",
  shapeKind: "rect",
  fillTolerance: 20,
  rightCollapsed: false,
}

const clampSize = (s: number) => Math.min(500, Math.max(1, s))

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "setTool":
      return {
        ...state,
        activeTool: action.tool,
        // Remember where we came from so the eyedropper can snap back after one pick.
        previousTool:
          action.tool === "eyedropper" && state.activeTool !== "eyedropper"
            ? state.activeTool
            : state.previousTool,
      }
    case "setBrushSize":
      return { ...state, brushSize: action.value }
    case "nudgeBrushSize":
      return { ...state, brushSize: clampSize(state.brushSize + action.delta) }
    case "setHardness":
      return { ...state, hardness: action.value }
    case "setOpacity":
      return { ...state, opacity: action.value }
    case "setForeground":
      return { ...state, foreground: action.color }
    case "setBackground":
      return { ...state, background: action.color }
    case "swapColors":
      return { ...state, foreground: state.background, background: state.foreground }
    case "resetColors":
      // D resets to the classic black-foreground / white-background defaults.
      return { ...state, foreground: "#000000", background: "#FFFFFF" }
    case "applySampledColor":
      // Eyedropper picked a colour: set it and return to the pre-eyedropper tool.
      return { ...state, foreground: action.color, activeTool: state.previousTool }
    case "setShapeKind":
      return { ...state, shapeKind: action.kind }
    case "setFillTolerance":
      return { ...state, fillTolerance: action.value }
    case "toggleRight":
      return { ...state, rightCollapsed: !state.rightCollapsed }
  }
}

export function useEditorState() {
  return useReducer(reducer, initialState)
}
