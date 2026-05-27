import { useReducer } from "react"
import type { ToolId, VectorKind } from "@/editor/types"

/**
 * Shell UI state — tool selection, brush params, zoom, and panel chrome. One
 * reducer, local-only. The document model (layers/active layer) has graduated to
 * `documentStore`; viewport (zoom) and pure-UI bits still live here until they
 * earn their own stores. Nothing here is persisted.
 */
export interface EditorState {
  activeTool: ToolId
  /** The tool to restore after an eyedropper sample (set when entering the eyedropper). */
  previousTool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  /** Which primitive the Shape tool draws. */
  shapeKind: VectorKind
  /** Fill tool match looseness, 0–100. */
  fillTolerance: number
  zoom: number
  rightCollapsed: boolean
}

export type EditorAction =
  | { type: "setTool"; tool: ToolId }
  | { type: "setBrushSize"; value: number }
  | { type: "nudgeBrushSize"; delta: number }
  | { type: "setHardness"; value: number }
  | { type: "setOpacity"; value: number }
  | { type: "setForeground"; color: string }
  | { type: "applySampledColor"; color: string }
  | { type: "setShapeKind"; kind: VectorKind }
  | { type: "setFillTolerance"; value: number }
  | { type: "nudgeZoom"; delta: number }
  | { type: "toggleRight" }

const initialState: EditorState = {
  activeTool: "brush",
  previousTool: "brush",
  brushSize: 30,
  hardness: 80,
  opacity: 100,
  foreground: "#E89940",
  shapeKind: "rect",
  fillTolerance: 20,
  zoom: 75,
  rightCollapsed: false,
}

const clampZoom = (z: number) => Math.min(400, Math.max(10, z))
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
    case "applySampledColor":
      // Eyedropper picked a colour: set it and return to the pre-eyedropper tool.
      return { ...state, foreground: action.color, activeTool: state.previousTool }
    case "setShapeKind":
      return { ...state, shapeKind: action.kind }
    case "setFillTolerance":
      return { ...state, fillTolerance: action.value }
    case "nudgeZoom":
      return { ...state, zoom: clampZoom(state.zoom + action.delta) }
    case "toggleRight":
      return { ...state, rightCollapsed: !state.rightCollapsed }
  }
}

export function useEditorState() {
  return useReducer(reducer, initialState)
}
