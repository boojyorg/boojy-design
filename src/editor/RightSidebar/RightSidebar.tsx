import type { Layer } from "@/editor/types"
import { cn } from "@/lib/cn"
import { LayersPanel } from "./LayersPanel"
import { PropertiesPanel } from "./PropertiesPanel"

interface RightSidebarProps {
  collapsed: boolean
  layers: Layer[]
  activeLayerId: string
  onSelectLayer: (id: string) => void
  onToggleLayer: (id: string) => void
  onAddLayer: () => void
  onDeleteLayer: () => void
}

/**
 * The outer wrapper always reserves 288px of layout (bg = canvas colour), so
 * the canvas never shifts when the panel collapses. Only the inner panel
 * slides off-screen (translate + fade). This is the behaviour the user asked
 * for explicitly: "when the right sidebar hides the canvas shouldn't move."
 */
export function RightSidebar({
  collapsed,
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleLayer,
  onAddLayer,
  onDeleteLayer,
}: RightSidebarProps) {
  return (
    <div
      data-testid="sidebar-reserved"
      className="relative w-72 shrink-0 overflow-hidden bg-editor"
    >
      <div
        data-testid="sidebar-panel"
        data-collapsed={collapsed}
        aria-hidden={collapsed}
        className={cn(
          "absolute inset-0 flex flex-col border-divider border-l bg-chrome transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.3,1)]",
          collapsed
            ? "pointer-events-none translate-x-full opacity-0"
            : "translate-x-0 opacity-100",
        )}
      >
        <PropertiesPanel />
        <LayersPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelect={onSelectLayer}
          onToggle={onToggleLayer}
          onAdd={onAddLayer}
          onDelete={onDeleteLayer}
        />
      </div>
    </div>
  )
}
