import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { PanelHead } from "@/components/PanelHead"
import { LayerThumb } from "@/editor/LayerThumb"
import type { Layer } from "@/editor/types"
import { cn } from "@/lib/cn"

interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onAdd: () => void
  onDelete: () => void
}

const footerBtn =
  "flex h-8 items-center justify-center rounded-md text-fg-dim transition-colors hover:bg-hover hover:text-fg"

/** Bottom half of the right sidebar — the layer stack. */
export function LayersPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggle,
  onAdd,
  onDelete,
}: LayersPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-[18px] pt-4 pb-2">
        <PanelHead>Layers</PanelHead>
      </div>

      <ul aria-label="Layers" className="scrollbar-thin flex-1 overflow-y-auto px-2">
        {layers.map((layer) => {
          const active = layer.id === activeLayerId
          return (
            <li key={layer.id}>
              <div
                role="option"
                aria-label={layer.name}
                aria-selected={active}
                tabIndex={0}
                onClick={() => onSelect(layer.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(layer.id)
                  }
                }}
                className={cn(
                  "mb-[3px] flex cursor-pointer items-center gap-2.5 rounded-[7px] border px-2.5 py-2 transition-colors",
                  active ? "border-accent bg-accent-dim" : "border-transparent hover:bg-elevated",
                )}
              >
                <button
                  type="button"
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  aria-pressed={layer.visible}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(layer.id)
                  }}
                  className={cn("flex p-0.5", layer.visible ? "text-fg" : "text-fg-faint")}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <div className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-divider bg-panel">
                  <LayerThumb layer={layer} />
                </div>

                <span
                  className={cn(
                    "flex-1 truncate text-[13px]",
                    active ? "font-medium text-fg" : "text-fg-dim",
                  )}
                >
                  {layer.name}
                </span>

                {layer.opacity < 100 && (
                  <span className="font-mono text-[11px] text-fg-faint">{layer.opacity}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-1 border-divider border-t p-2.5">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add layer"
          className={cn(footerBtn, "flex-1")}
        >
          <Plus size={17} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete layer"
          className={cn(footerBtn, "px-3 text-fg-faint")}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
