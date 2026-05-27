import { Circle, type LucideIcon, Square } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { VectorKind } from "@/editor/types"
import { cn } from "@/lib/cn"

interface ShapeFlyoutProps {
  shapeKind: VectorKind
  onShapeKind: (kind: VectorKind) => void
}

const SHAPES: { kind: VectorKind; label: string; icon: LucideIcon }[] = [
  { kind: "rect", label: "Rectangle", icon: Square },
  { kind: "ellipse", label: "Ellipse", icon: Circle },
]

/**
 * The shape-kind picker — a detached floating panel shown while the Shape tool is active.
 * It's an elevated card (not docked to the rail), positioned by the caller, so toggling the
 * Shape tool never shifts the canvas. Buttons mirror the rail's icon-button styling.
 */
export function ShapeFlyout({ shapeKind, onShapeKind }: ShapeFlyoutProps) {
  return (
    <div
      role="toolbar"
      aria-label="Shape kind"
      aria-orientation="vertical"
      data-testid="shape-flyout"
      className="flex flex-col items-center gap-1 rounded-xl border border-divider bg-elevated p-1.5 shadow-xl"
    >
      {SHAPES.map(({ kind, label, icon: Icon }) => {
        const active = kind === shapeKind
        return (
          <Tooltip key={kind}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => onShapeKind(kind)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-[9px] transition-colors",
                  active ? "bg-accent-dim text-accent" : "text-fg-dim hover:bg-hover hover:text-fg",
                )}
              >
                <Icon size={20} strokeWidth={1.6} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
