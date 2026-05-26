import { Redo2, Undo2 } from "lucide-react"
import { IconButton } from "@/components/IconButton"
import type { ToolId } from "@/editor/types"
import { AppMenu } from "./AppMenu"
import { FilenameField } from "./FilenameField"
import { SidebarToggle } from "./SidebarToggle"
import { ToolProperties } from "./ToolProperties"
import { ZoomControl } from "./ZoomControl"

interface TopBarProps {
  tool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  zoom: number
  rightCollapsed: boolean
  onBrushSize: (v: number) => void
  onHardness: (v: number) => void
  onOpacity: (v: number) => void
  onForeground: (color: string) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleRight: () => void
  onExport: () => void
}

/** Vertical divider matching the chrome separators. */
function Divider({ height }: { height: number }) {
  return <div className="w-px bg-divider" style={{ height }} />
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-divider border-b bg-chrome pl-4">
      <AppMenu onExport={props.onExport} />
      <Divider height={28} />
      <FilenameField name="Untitled" dirty />

      <div className="flex gap-0.5">
        <IconButton aria-label="Undo">
          <Undo2 size={17} />
        </IconButton>
        <IconButton aria-label="Redo" className="text-fg-faint">
          <Redo2 size={17} />
        </IconButton>
      </div>

      <ZoomControl zoom={props.zoom} onZoomIn={props.onZoomIn} onZoomOut={props.onZoomOut} />

      <Divider height={26} />

      {/*
        Tool-props zone takes the spare space; below ~1300px the props scroll
        horizontally (scrollbar hidden) rather than pushing the right cluster /
        toggle off-screen. Core chrome stays intact at any width, and every
        prop stays reachable (trackpad/shift-wheel) instead of being clipped.
      */}
      <div className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto">
        <ToolProperties
          tool={props.tool}
          brushSize={props.brushSize}
          hardness={props.hardness}
          opacity={props.opacity}
          foreground={props.foreground}
          onBrushSize={props.onBrushSize}
          onHardness={props.onHardness}
          onOpacity={props.onOpacity}
          onForeground={props.onForeground}
        />
      </div>

      {/*
        Right cluster — 288px wide with a left border, so the divider lines up
        exactly with the right sidebar's left edge below. The toggle sits flush
        against that divider (left-aligned within the cluster) and stays put
        whether the sidebar is open or collapsed.
      */}
      <div className="flex h-full w-72 shrink-0 items-center justify-start border-divider border-l pl-2">
        <SidebarToggle collapsed={props.rightCollapsed} onToggle={props.onToggleRight} />
      </div>
    </header>
  )
}
