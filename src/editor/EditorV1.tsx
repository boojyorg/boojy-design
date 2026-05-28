import { type ChangeEvent, useCallback, useMemo, useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CanvasStage, type CanvasStageHandle } from "@/editor/Canvas/CanvasStage"
import { IDENTITY } from "@/editor/Canvas/engine/transform"
import { DOC_HEIGHT, DOC_WIDTH } from "@/editor/Canvas/engine/types"
import { LeftRail } from "@/editor/LeftRail/LeftRail"
import { ShapeFlyout } from "@/editor/LeftRail/ShapeFlyout"
import { RightSidebar } from "@/editor/RightSidebar/RightSidebar"
import {
  type PixelPort,
  runDeleteLayer,
  runDuplicateLayer,
  runPasteLayer,
  runUndoable,
} from "@/editor/state/commands"
import { useDocumentStore } from "@/editor/state/documentStore"
import { newLayerId } from "@/editor/state/ids"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import { useUndoStore } from "@/editor/state/undoStore"
import { useEditorState } from "@/editor/state/useEditorState"
import { useViewportStore } from "@/editor/state/viewportStore"
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
  const setLayerOpacity = useDocumentStore((s) => s.setLayerOpacity)
  const addTextLayer = useDocumentStore((s) => s.addTextLayer)
  const setLayerText = useDocumentStore((s) => s.setLayerText)
  const setLayerFontSize = useDocumentStore((s) => s.setLayerFontSize)
  const setLayerTextColor = useDocumentStore((s) => s.setLayerTextColor)
  const canUndo = useUndoStore((s) => s.canUndo)
  const canRedo = useUndoStore((s) => s.canRedo)
  const record = useUndoStore((s) => s.record)
  const undo = useUndoStore((s) => s.undo)
  const redo = useUndoStore((s) => s.redo)
  const clearUndo = useUndoStore((s) => s.clear)
  const zoom = useViewportStore((s) => s.zoom)
  const nudgeZoom = useViewportStore((s) => s.nudgeZoom)
  const fitView = useViewportStore((s) => s.fitToScreen)
  const zoom100 = useViewportStore((s) => s.zoom100)
  const stageRef = useRef<CanvasStageHandle>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const designInputRef = useRef<HTMLInputElement>(null)

  // The engine's pixel ops the timeline needs, behind the CanvasStage seam.
  const pixelPort = useMemo<PixelPort>(
    () => ({
      captureLayerPixels: (id) => stageRef.current?.captureLayerPixels(id) ?? null,
      stashPixelRestore: (id, canvas) => stageRef.current?.stashPixelRestore(id, canvas),
      getLayerTransform: (id) => stageRef.current?.getLayerTransform(id) ?? IDENTITY,
      setLayerTransform: (id, transform) => stageRef.current?.setLayerTransform(id, transform),
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
      (id) => stageRef.current?.getLayerTransform(id) ?? IDENTITY,
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
        // Drop the previous document's transforms + thumbnails, then stash pixels + transforms for
        // the new layers; the layers effect's sync creates the nodes (pixel restore repaints thumbs).
        stageRef.current?.clearTransforms()
        useThumbnailStore.getState().clearThumbnails()
        for (const { layerId, canvas } of decoded)
          stageRef.current?.stashPixelRestore(layerId, canvas)
        for (const { layerId, transform } of parsed.transforms)
          stageRef.current?.setLayerTransform(layerId, transform)
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
  const onCopy = useCallback(() => stageRef.current?.copySelection(), [])
  const onCut = useCallback(() => stageRef.current?.cutSelection(), [])
  const onDelete = useCallback(() => stageRef.current?.deleteSelection(), [])
  const onPaste = useCallback(() => {
    const clip = stageRef.current?.getClipboard()
    if (!clip) return
    runPasteLayer(
      newLayerId(),
      clip,
      { x: 16, y: 16, scaleX: 1, scaleY: 1, rotation: 0 },
      "Pasted",
      pixelPort,
      record,
    )
  }, [pixelPort, record])

  // Text layer creation + commit
  const onTextLayerCreate = useCallback(
    (id: string, _docX: number, _docY: number) => {
      // Transform already pre-set in CanvasStage (engine.setLayerTransform) before this fires.
      addTextLayer(id)
    },
    [addTextLayer],
  )
  const onTextCommit = useCallback(
    (layerId: string, before: string, after: string) => {
      setLayerText(layerId, after)
      if (before !== after)
        record({
          label: "edit text",
          undo: () => setLayerText(layerId, before),
          redo: () => setLayerText(layerId, after),
        })
    },
    [setLayerText, record],
  )

  // Display-only live font size during a text scale drag — not stored in the document store,
  // so the store always holds the pre-drag original (needed for undo capture at commit time).
  const [liveTextFontSize, setLiveTextFontSize] = useState<number | null>(null)

  const onLiveTextScale = useCallback((_layerId: string, liveSize: number) => {
    setLiveTextFontSize(liveSize)
  }, [])

  const onTextScaleCommit = useCallback(
    (
      layerId: string,
      beforeTransform: typeof IDENTITY,
      afterTransform: typeof IDENTITY,
      bakedTransform: typeof IDENTITY,
    ) => {
      // Store was never updated live, so this is always the pre-drag original.
      const originalFontSize =
        useDocumentStore.getState().layers.find((l) => l.id === layerId)?.fontSize ?? 40
      const newFontSize = Math.max(
        1,
        Math.round(originalFontSize * Math.abs(afterTransform.scaleY)),
      )
      setLiveTextFontSize(null)
      setLayerFontSize(layerId, newFontSize)
      record({
        label: "resize text",
        undo: () => {
          setLayerFontSize(layerId, originalFontSize)
          stageRef.current?.setLayerTransform(layerId, beforeTransform)
        },
        redo: () => {
          setLayerFontSize(layerId, newFontSize)
          stageRef.current?.setLayerTransform(layerId, bakedTransform)
        },
      })
    },
    [setLayerFontSize, record],
  )

  // Marquee flip + float-drag
  const [hasMarqueeSelection, setHasMarqueeSelection] = useState(false)
  const onMarqueeFlipH = useCallback(() => stageRef.current?.flipSelection("h"), [])
  const onMarqueeFlipV = useCallback(() => stageRef.current?.flipSelection("v"), [])
  const onFloatEnd = useCallback(
    (
      clip: HTMLCanvasElement,
      transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number },
    ) => {
      runPasteLayer(newLayerId(), clip, transform, "Floated", pixelPort, record)
      dispatch({ type: "setTool", tool: "select" })
    },
    [pixelPort, record, dispatch],
  )

  useKeyboardShortcuts(dispatch, {
    onExport,
    onOpen: onOpenDocument,
    onSave,
    onUndo,
    onRedo,
    onZoomIn: () => nudgeZoom(1),
    onZoomOut: () => nudgeZoom(-1),
    onZoomFit: fitView,
    onZoom100: zoom100,
    onCopy,
    onCut,
    onPaste,
    onDelete,
  })

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
          zoom={zoom}
          rightCollapsed={state.rightCollapsed}
          onBrushSize={(value) => dispatch({ type: "setBrushSize", value })}
          onHardness={(value) => dispatch({ type: "setHardness", value })}
          onOpacity={(value) => dispatch({ type: "setOpacity", value })}
          onForeground={(color) => dispatch({ type: "setForeground", color })}
          onFillTolerance={(value) => dispatch({ type: "setFillTolerance", value })}
          onFlipH={() => stageRef.current?.flipActiveLayer("h")}
          onFlipV={() => stageRef.current?.flipActiveLayer("v")}
          hasMarqueeSelection={hasMarqueeSelection}
          onMarqueeFlipH={onMarqueeFlipH}
          onMarqueeFlipV={onMarqueeFlipV}
          onZoomIn={() => nudgeZoom(1)}
          onZoomOut={() => nudgeZoom(-1)}
          onZoomFit={fitView}
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
            secondaryColor={state.secondaryColor}
            shapeKind={state.shapeKind}
            onSelectTool={(tool) => dispatch({ type: "setTool", tool })}
            onForeground={(color) => dispatch({ type: "setForeground", color })}
            onSecondaryColor={(color) => dispatch({ type: "setSecondaryColor", color })}
            onSwapColors={() => dispatch({ type: "swapColors" })}
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
            layers={layers}
            activeLayerId={activeLayerId}
            hasMarqueeSelection={hasMarqueeSelection}
            onMarqueeSelectionChange={setHasMarqueeSelection}
            onFloatEnd={onFloatEnd}
            onRequestImageLayer={(name) => addLayer(name, "image")}
            onSampleColor={(hex) => dispatch({ type: "applySampledColor", color: hex })}
            onSelectLayer={(id) => selectLayer(id)}
            onTextLayerCreate={onTextLayerCreate}
            onTextCommit={onTextCommit}
            onTextScaleCommit={onTextScaleCommit}
            onLiveTextScale={onLiveTextScale}
            onRequestTextTool={() => dispatch({ type: "setTool", tool: "text" })}
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
            onLiveLayerOpacity={(id, opacity) => setLayerOpacity(id, opacity)}
            onCommitLayerOpacity={(id, before, after) => {
              if (before !== after)
                record({
                  label: "set opacity",
                  undo: () => setLayerOpacity(id, before),
                  redo: () => setLayerOpacity(id, after),
                })
            }}
            onLiveFontSize={(id, size) => setLayerFontSize(id, size)}
            liveLayerFontSize={liveTextFontSize ?? undefined}
            onTextColor={(id, color) => setLayerTextColor(id, color)}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
