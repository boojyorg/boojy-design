import { Circle, Square } from "lucide-react"
import { Fragment } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ToolId, VectorKind } from "@/editor/types"
import { cn } from "@/lib/cn"
import { TOOLS } from "@/lib/tools"
import { ColorSwatches } from "./ColorSwatches"

// Tools that open a new visual group — a divider is rendered before each.
const GROUP_STARTS = new Set<ToolId>(["brush", "hand"])

interface LeftRailProps {
  activeTool: ToolId
  foreground: string
  secondaryColor: string
  /** The Shape tool's rail icon morphs to show this (square / circle). */
  shapeKind: VectorKind
  onSelectTool: (tool: ToolId) => void
  onForeground: (color: string) => void
  onSecondaryColor: (color: string) => void
  onSwapColors: () => void
}

export function LeftRail({
  activeTool,
  foreground,
  secondaryColor,
  shapeKind,
  onSelectTool,
  onForeground,
  onSecondaryColor,
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
          <Fragment key={tool.id}>
            {GROUP_STARTS.has(tool.id) && (
              <div className="my-1 h-px w-7 bg-divider" aria-hidden="true" />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  aria-disabled={tool.mvp ? undefined : true}
                  onPointerDown={(e) => {
                    // Fire on pointer-down so the highlight commits before Radix Tooltip
                    // processes its own pointer events (which can force an intermediate render).
                    if (e.button === 0 && tool.mvp) onSelectTool(tool.id)
                  }}
                  onClick={() => {
                    // Keyboard path (Enter/Space fires click without pointer-down).
                    if (tool.mvp) onSelectTool(tool.id)
                  }}
                  className={cn(
                    // No colour transition: the active highlight must land the instant you click,
                    // not fade in over ~150ms (which reads as lag). Hover snaps too — fine for a rail.
                    "flex size-11 items-center justify-center rounded-[9px]",
                    active
                      ? "bg-accent-dim text-accent"
                      : tool.mvp
                        ? "text-fg-dim hover:bg-elevated hover:text-fg"
                        : "text-fg-dim cursor-not-allowed opacity-40",
                  )}
                >
                  <Icon size={21} strokeWidth={1.6} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          </Fragment>
        )
      })}

      <div className="flex-1" />
      <div className="my-1.5 h-px w-7 bg-divider" />
      <ColorSwatches
        foreground={foreground}
        secondaryColor={secondaryColor}
        onForeground={onForeground}
        onSecondaryColor={onSecondaryColor}
        onSwap={onSwapColors}
      />
    </nav>
  )
}
