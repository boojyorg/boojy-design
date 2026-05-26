import { useCallback, useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CanvasStage, type CanvasStageHandle } from "@/editor/Canvas/CanvasStage"
import { LeftRail } from "@/editor/LeftRail/LeftRail"
import { RightSidebar } from "@/editor/RightSidebar/RightSidebar"
import { useEditorState } from "@/editor/state/useEditorState"
import { TopBar } from "@/editor/TopBar/TopBar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

/** V1 "Classic" — the chosen direction. Three-region layout, mock-interactive. */
export function EditorV1() {
  const [state, dispatch] = useEditorState()
  const stageRef = useRef<CanvasStageHandle>(null)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const onExport = useCallback(() => stageRef.current?.exportPNG(), [])
  const onUndo = useCallback(() => stageRef.current?.undo(), [])
  const onRedo = useCallback(() => stageRef.current?.redo(), [])
  useKeyboardShortcuts(dispatch, { onExport, onUndo, onRedo })

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-editor font-sans text-[13px] text-fg">
        <TopBar
          tool={state.activeTool}
          brushSize={state.brushSize}
          hardness={state.hardness}
          opacity={state.opacity}
          foreground={state.foreground}
          zoom={state.zoom}
          rightCollapsed={state.rightCollapsed}
          onBrushSize={(value) => dispatch({ type: "setBrushSize", value })}
          onHardness={(value) => dispatch({ type: "setHardness", value })}
          onOpacity={(value) => dispatch({ type: "setOpacity", value })}
          onForeground={(color) => dispatch({ type: "setForeground", color })}
          onZoomIn={() => dispatch({ type: "nudgeZoom", delta: 25 })}
          onZoomOut={() => dispatch({ type: "nudgeZoom", delta: -25 })}
          onToggleRight={() => dispatch({ type: "toggleRight" })}
          onExport={onExport}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
        />

        <div className="flex min-h-0 flex-1">
          <LeftRail
            activeTool={state.activeTool}
            foreground={state.foreground}
            onSelectTool={(tool) => dispatch({ type: "setTool", tool })}
            onForeground={(color) => dispatch({ type: "setForeground", color })}
          />
          <CanvasStage
            ref={stageRef}
            tool={state.activeTool}
            brushSize={state.brushSize}
            hardness={state.hardness}
            opacity={state.opacity}
            foreground={state.foreground}
            zoom={state.zoom}
            layers={state.layers}
            activeLayerId={state.activeLayerId}
            onHistoryChange={setHistory}
          />
          <RightSidebar
            collapsed={state.rightCollapsed}
            layers={state.layers}
            activeLayerId={state.activeLayerId}
            onSelectLayer={(id) => dispatch({ type: "selectLayer", id })}
            onToggleLayer={(id) => dispatch({ type: "toggleLayer", id })}
            onAddLayer={() => dispatch({ type: "addLayer" })}
            onDeleteLayer={() => dispatch({ type: "deleteActiveLayer" })}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
