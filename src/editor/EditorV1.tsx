import { type ChangeEvent, useCallback, useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CanvasStage, type CanvasStageHandle } from "@/editor/Canvas/CanvasStage"
import { LeftRail } from "@/editor/LeftRail/LeftRail"
import { RightSidebar } from "@/editor/RightSidebar/RightSidebar"
import { useDocumentStore } from "@/editor/state/documentStore"
import { newLayerId } from "@/editor/state/ids"
import { useEditorState } from "@/editor/state/useEditorState"
import { TopBar } from "@/editor/TopBar/TopBar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

/** V1 "Classic" — the chosen direction. Three-region layout, mock-interactive. */
export function EditorV1() {
  const [state, dispatch] = useEditorState()
  const layers = useDocumentStore((s) => s.layers)
  const activeLayerId = useDocumentStore((s) => s.activeLayerId)
  const selectLayer = useDocumentStore((s) => s.selectLayer)
  const toggleLayer = useDocumentStore((s) => s.toggleLayer)
  const addLayer = useDocumentStore((s) => s.addLayer)
  const deleteActiveLayer = useDocumentStore((s) => s.deleteActiveLayer)
  const renameLayer = useDocumentStore((s) => s.renameLayer)
  const moveLayer = useDocumentStore((s) => s.moveLayer)
  const duplicateLayer = useDocumentStore((s) => s.duplicateLayer)
  const stageRef = useRef<CanvasStageHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const onExport = useCallback(() => stageRef.current?.exportPNG(), [])
  const onUndo = useCallback(() => stageRef.current?.undo(), [])
  const onRedo = useCallback(() => stageRef.current?.redo(), [])
  const onOpen = useCallback(() => fileInputRef.current?.click(), [])
  const onImportFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) stageRef.current?.importImage(file, file.name)
    e.target.value = "" // let the same file be re-imported
  }, [])
  const onDuplicateLayer = useCallback(
    (id: string) => {
      // Generate the new id here so the engine can copy pixels into it after the reducer
      // adds the layer (stash first, then dispatch — same ordering as image import).
      const dupId = newLayerId()
      stageRef.current?.stashDuplicate(id, dupId)
      duplicateLayer(id, dupId)
    },
    [duplicateLayer],
  )
  useKeyboardShortcuts(dispatch, { onExport, onUndo, onRedo, onOpen })

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-editor font-sans text-[13px] text-fg">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImportFile}
        />
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
          onOpen={onOpen}
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
            layers={layers}
            activeLayerId={activeLayerId}
            onHistoryChange={setHistory}
            onRequestImageLayer={(name) => addLayer(name, "image")}
          />
          <RightSidebar
            collapsed={state.rightCollapsed}
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={(id) => selectLayer(id)}
            onToggleLayer={(id) => toggleLayer(id)}
            onAddLayer={() => addLayer()}
            onDeleteLayer={() => deleteActiveLayer()}
            onRenameLayer={(id, name) => renameLayer(id, name)}
            onDuplicateLayer={onDuplicateLayer}
            onMoveLayer={(id, toIndex) => moveLayer(id, toIndex)}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
