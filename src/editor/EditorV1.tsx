import { type ChangeEvent, useCallback, useMemo, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CanvasStage, type CanvasStageHandle } from "@/editor/Canvas/CanvasStage"
import { DOC_HEIGHT, DOC_WIDTH } from "@/editor/Canvas/engine/types"
import { LeftRail } from "@/editor/LeftRail/LeftRail"
import { ShapeFlyout } from "@/editor/LeftRail/ShapeFlyout"
import { RightSidebar } from "@/editor/RightSidebar/RightSidebar"
import {
  type PixelPort,
  runDeleteLayer,
  runDuplicateLayer,
  runUndoable,
} from "@/editor/state/commands"
import { useDocumentStore } from "@/editor/state/documentStore"
import { newLayerId } from "@/editor/state/ids"
import { useUndoStore } from "@/editor/state/undoStore"
import { useEditorState } from "@/editor/state/useEditorState"
import { TopBar } from "@/editor/TopBar/TopBar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { decodeDataUrlToCanvas, parseDesign, serializeDesign } from "@/lib/designFile"
import { downloadBlob } from "@/lib/download"
import { toDesignFilename } from "@/lib/filename"

/** V1 "Classic" — the chosen direction. Three-region layout, mock-interactive. */
export function EditorV1() {
  const [state, dispatch] = useEditorState()
  const layers = useDocumentStore((s) => s.layers)
  const activeLayerId = useDocumentStore((s) => s.activeLayerId)
  const selectLayer = useDocumentStore((s) => s.selectLayer)
  const toggleLayer = useDocumentStore((s) => s.toggleLayer)
  const addLayer = useDocumentStore((s) => s.addLayer)
  const renameLayer = useDocumentStore((s) => s.renameLayer)
  const moveLayer = useDocumentStore((s) => s.moveLayer)
  const canUndo = useUndoStore((s) => s.canUndo)
  const canRedo = useUndoStore((s) => s.canRedo)
  const record = useUndoStore((s) => s.record)
  const undo = useUndoStore((s) => s.undo)
  const redo = useUndoStore((s) => s.redo)
  const clearUndo = useUndoStore((s) => s.clear)
  const stageRef = useRef<CanvasStageHandle>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const designInputRef = useRef<HTMLInputElement>(null)

  // The engine's pixel ops the timeline needs, behind the CanvasStage seam.
  const pixelPort = useMemo<PixelPort>(
    () => ({
      captureLayerPixels: (id) => stageRef.current?.captureLayerPixels(id) ?? null,
      stashPixelRestore: (id, canvas) => stageRef.current?.stashPixelRestore(id, canvas),
    }),
    [],
  )

  const onExport = useCallback(() => stageRef.current?.exportPNG(), [])
  const onUndo = useCallback(() => undo(), [undo])
  const onRedo = useCallback(() => redo(), [redo])

  // Save: read the document slice + each layer's pixels from the engine → JSON → download.
  const onSave = useCallback(() => {
    const { layers: docLayers, activeLayerId: active, nextLayerNum } = useDocumentStore.getState()
    const json = serializeDesign(
      { layers: docLayers, activeLayerId: active, nextLayerNum },
      (id) => stageRef.current?.captureLayerPixels(id) ?? null,
      { width: DOC_WIDTH, height: DOC_HEIGHT },
    )
    downloadBlob(new Blob([json], { type: "application/json" }), toDesignFilename("Untitled"))
  }, [])

  // Image import (its own hidden input) and document open (.design).
  const onImportImage = useCallback(() => imageInputRef.current?.click(), [])
  const onOpenDocument = useCallback(() => designInputRef.current?.click(), [])

  const onImageFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) stageRef.current?.importImage(file, file.name)
    e.target.value = "" // let the same file be re-imported
  }, [])

  // Open a .design: parse → decode each layer's pixels → stash them, then swap in the new
  // document (the layers effect repaints into fresh nodes) and reset history. A malformed
  // or old-version file throws in parseDesign; we fail silently (log only) by design.
  const onDesignFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      try {
        const parsed = parseDesign(await file.text())
        const decoded = await Promise.all(
          parsed.pixels.map(async (p) => ({
            layerId: p.layerId,
            canvas: await decodeDataUrlToCanvas(p.dataUrl),
          })),
        )
        for (const { layerId, canvas } of decoded)
          stageRef.current?.stashPixelRestore(layerId, canvas)
        useDocumentStore.setState(parsed.snapshot)
        clearUndo()
      } catch (err) {
        console.error("Could not open .design file", err)
      }
    },
    [clearUndo],
  )

  const onDuplicateLayer = useCallback(
    (id: string) => runDuplicateLayer(id, newLayerId(), pixelPort, record),
    [pixelPort, record],
  )
  useKeyboardShortcuts(dispatch, { onExport, onOpen: onOpenDocument, onSave, onUndo, onRedo })

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-editor font-sans text-[13px] text-fg">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageFile}
        />
        <input
          ref={designInputRef}
          type="file"
          accept=".design,application/json"
          className="hidden"
          onChange={onDesignFile}
        />
        <TopBar
          tool={state.activeTool}
          brushSize={state.brushSize}
          hardness={state.hardness}
          opacity={state.opacity}
          foreground={state.foreground}
          fillTolerance={state.fillTolerance}
          zoom={state.zoom}
          rightCollapsed={state.rightCollapsed}
          onBrushSize={(value) => dispatch({ type: "setBrushSize", value })}
          onHardness={(value) => dispatch({ type: "setHardness", value })}
          onOpacity={(value) => dispatch({ type: "setOpacity", value })}
          onForeground={(color) => dispatch({ type: "setForeground", color })}
          onFillTolerance={(value) => dispatch({ type: "setFillTolerance", value })}
          onZoomIn={() => dispatch({ type: "nudgeZoom", delta: 25 })}
          onZoomOut={() => dispatch({ type: "nudgeZoom", delta: -25 })}
          onToggleRight={() => dispatch({ type: "toggleRight" })}
          onExport={onExport}
          onOpen={onOpenDocument}
          onSave={onSave}
          onImportImage={onImportImage}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        <div className="relative flex min-h-0 flex-1">
          <LeftRail
            activeTool={state.activeTool}
            foreground={state.foreground}
            shapeKind={state.shapeKind}
            onSelectTool={(tool) => dispatch({ type: "setTool", tool })}
            onForeground={(color) => dispatch({ type: "setForeground", color })}
          />
          {state.activeTool === "shape" && (
            <div className="-translate-y-1/2 absolute top-1/2 left-[66px] z-20">
              <ShapeFlyout
                shapeKind={state.shapeKind}
                onShapeKind={(kind) => dispatch({ type: "setShapeKind", kind })}
              />
            </div>
          )}
          <CanvasStage
            ref={stageRef}
            tool={state.activeTool}
            brushSize={state.brushSize}
            hardness={state.hardness}
            opacity={state.opacity}
            foreground={state.foreground}
            shapeKind={state.shapeKind}
            fillTolerance={state.fillTolerance}
            zoom={state.zoom}
            layers={layers}
            activeLayerId={activeLayerId}
            onRequestImageLayer={(name) => addLayer(name, "image")}
            onSampleColor={(hex) => dispatch({ type: "applySampledColor", color: hex })}
          />
          <RightSidebar
            collapsed={state.rightCollapsed}
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={(id) => selectLayer(id)}
            onToggleLayer={(id) => runUndoable("toggle visibility", () => toggleLayer(id), record)}
            onAddLayer={() => runUndoable("add layer", () => addLayer(), record)}
            onDeleteLayer={() => runDeleteLayer(pixelPort, record)}
            onRenameLayer={(id, name) =>
              runUndoable("rename layer", () => renameLayer(id, name), record)
            }
            onDuplicateLayer={onDuplicateLayer}
            onMoveLayer={(id, toIndex) =>
              runUndoable("reorder layer", () => moveLayer(id, toIndex), record)
            }
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
