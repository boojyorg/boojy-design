import { useReducer } from "react"
import { INITIAL_ACTIVE_LAYER_ID, INITIAL_LAYERS } from "@/editor/mock-data"
import type { Layer, LayerType, ToolId } from "@/editor/types"

/**
 * DISPOSABLE shell state. One reducer, local-only — no persistence, no engine.
 * When the real editor is built this is replaced by the three Zustand stores
 * (documentStore / undoStore / viewportStore). Nothing here is meant to survive.
 */
export interface EditorState {
  activeTool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  zoom: number
  layers: Layer[]
  activeLayerId: string
  rightCollapsed: boolean
  nextLayerNum: number
}

export type EditorAction =
  | { type: "setTool"; tool: ToolId }
  | { type: "setBrushSize"; value: number }
  | { type: "nudgeBrushSize"; delta: number }
  | { type: "setHardness"; value: number }
  | { type: "setOpacity"; value: number }
  | { type: "setForeground"; color: string }
  | { type: "nudgeZoom"; delta: number }
  | { type: "selectLayer"; id: string }
  | { type: "toggleLayer"; id: string }
  | { type: "addLayer"; name?: string; layerType?: LayerType }
  | { type: "deleteActiveLayer" }
  | { type: "toggleRight" }

const initialState: EditorState = {
  activeTool: "brush",
  brushSize: 30,
  hardness: 80,
  opacity: 100,
  foreground: "#E89940",
  zoom: 75,
  layers: INITIAL_LAYERS,
  activeLayerId: INITIAL_ACTIVE_LAYER_ID,
  rightCollapsed: false,
  nextLayerNum: INITIAL_LAYERS.length + 1,
}

const clampZoom = (z: number) => Math.min(400, Math.max(10, z))
const clampSize = (s: number) => Math.min(500, Math.max(1, s))

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "setTool":
      return { ...state, activeTool: action.tool }
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
    case "nudgeZoom":
      return { ...state, zoom: clampZoom(state.zoom + action.delta) }
    case "selectLayer":
      return { ...state, activeLayerId: action.id }
    case "toggleLayer":
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, visible: !l.visible } : l)),
      }
    case "addLayer": {
      const layer: Layer = {
        id: `l-${Math.random().toString(36).slice(2, 8)}`,
        name: action.name ?? `Layer ${state.nextLayerNum}`,
        type: action.layerType ?? "raster",
        visible: true,
        opacity: 100,
      }
      return {
        ...state,
        layers: [layer, ...state.layers],
        activeLayerId: layer.id,
        nextLayerNum: state.nextLayerNum + 1,
      }
    }
    case "deleteActiveLayer": {
      if (state.layers.length <= 1) return state
      const remaining = state.layers.filter((l) => l.id !== state.activeLayerId)
      return { ...state, layers: remaining, activeLayerId: remaining[0]?.id ?? "" }
    }
    case "toggleRight":
      return { ...state, rightCollapsed: !state.rightCollapsed }
  }
}

export function useEditorState() {
  return useReducer(reducer, initialState)
}
