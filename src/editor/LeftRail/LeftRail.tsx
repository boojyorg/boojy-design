import { Circle, Square } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ToolId, VectorKind } from "@/editor/types"
import { cn } from "@/lib/cn"
import { TOOLS } from "@/lib/tools"
import { ColorSwatches } from "./ColorSwatches"

interface LeftRailProps {
  activeTool: ToolId
  foreground: string
  background: string
  /** The Shape tool's rail icon morphs to show this (square / circle). */
  shapeKind: VectorKind
  onSelectTool: (tool: ToolId) => void
  onForeground: (color: string) => void
  onBackground: (color: string) => void
  onSwapColors: () => void
}

export function LeftRail({
  activeTool,
  foreground,
  background,
  shapeKind,
  onSelectTool,
  onForeground,
  onBackground,
  onSwapColors,
}: LeftRailProps) {
  return (
    <nav
      aria-label="Tools"
      className="flex w-14 shrink-0 flex-col items-center gap-[3px] border-divider border-r bg-chrome py-2.5"
    >
      {TOOLS.map((tool) => {
        // The Shape button reflects the chosen primitive; every other tool keeps its icon.
        const Icon = tool.id === "shape" ? (shapeKind === "ellipse" ? Circle : Square) : tool.icon
        const active = tool.id === activeTool
        const label = tool.mvp
          ? `${tool.label} (${tool.shortcut})`
          : `${tool.label} — coming in v0.5`

        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                aria-disabled={tool.mvp ? undefined : true}
                onClick={() => {
                  if (tool.mvp) onSelectTool(tool.id)
                }}
                className={cn(
                  // No colour transition: the active highlight must land the instant you click,
                  // not fade in over ~150ms (which reads as lag). Hover snaps too — fine for a rail.
                  "flex size-11 items-center justify-center rounded-[9px]",
                  active ? "bg-accent-dim text-accent" : "text-fg-dim",
                  tool.mvp ? "hover:bg-elevated hover:text-fg" : "cursor-not-allowed opacity-40",
                )}
              >
                <Icon size={21} strokeWidth={1.6} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        )
      })}

      <div className="flex-1" />
      <div className="my-1.5 h-px w-7 bg-divider" />
      <ColorSwatches
        foreground={foreground}
        background={background}
        onForeground={onForeground}
        onBackground={onBackground}
        onSwap={onSwapColors}
      />
    </nav>
  )
}
