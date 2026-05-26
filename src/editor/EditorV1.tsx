import { TooltipProvider } from "@/components/ui/tooltip"
import { CanvasStage } from "@/editor/Canvas/CanvasStage"
import { LeftRail } from "@/editor/LeftRail/LeftRail"
import { RightSidebar } from "@/editor/RightSidebar/RightSidebar"
import { useEditorState } from "@/editor/state/useEditorState"
import { TopBar } from "@/editor/TopBar/TopBar"

/** V1 "Classic" — the chosen direction. Three-region layout, mock-interactive. */
export function EditorV1() {
  const [state, dispatch] = useEditorState()

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
          onZoomIn={() => dispatch({ type: "nudgeZoom", delta: 25 })}
          onZoomOut={() => dispatch({ type: "nudgeZoom", delta: -25 })}
          onToggleRight={() => dispatch({ type: "toggleRight" })}
        />

        <div className="flex min-h-0 flex-1">
          <LeftRail
            activeTool={state.activeTool}
            foreground={state.foreground}
            onSelectTool={(tool) => dispatch({ type: "setTool", tool })}
          />
          <CanvasStage />
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
