import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react"
import { type CSSProperties, useRef, useState } from "react"
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
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onMoveTo: (id: string, toIndex: number) => void
}

const footerBtn =
  "flex h-8 items-center justify-center rounded-md text-fg-dim transition-colors hover:bg-hover hover:text-fg"

interface RowProps {
  layer: Layer
  active: boolean
  editing: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onStartEdit: (id: string) => void
  onCommitName: (id: string, name: string) => void
  onCancelEdit: () => void
}

function SortableLayerRow({
  layer,
  active,
  editing,
  onSelect,
  onToggle,
  onStartEdit,
  onCommitName,
  onCancelEdit,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  })
  const style: CSSProperties = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div
        role="option"
        aria-label={layer.name}
        aria-selected={active}
        tabIndex={0}
        onClick={() => onSelect(layer.id)}
        onDoubleClick={() => onStartEdit(layer.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect(layer.id)
          } else if (e.key === "F2") {
            e.preventDefault()
            onStartEdit(layer.id)
          }
        }}
        className={cn(
          "mb-[3px] flex cursor-pointer items-center gap-2 rounded-[7px] border px-2 py-2 transition-colors",
          active ? "border-accent bg-accent-dim" : "border-transparent hover:bg-elevated",
        )}
      >
        <button
          type="button"
          aria-label={`Reorder ${layer.name}`}
          className="flex cursor-grab touch-none text-fg-faint hover:text-fg-dim"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        <button
          type="button"
          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
          aria-pressed={layer.visible}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(layer.id)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className={cn("flex p-0.5", layer.visible ? "text-fg" : "text-fg-faint")}
        >
          {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        <div className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-divider bg-panel">
          <LayerThumb layer={layer} />
        </div>

        {editing ? (
          <input
            type="text"
            // biome-ignore lint/a11y/noAutofocus: focus the field the moment rename begins.
            autoFocus
            defaultValue={layer.name}
            aria-label={`Rename ${layer.name}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Enter") e.currentTarget.blur()
              else if (e.key === "Escape") onCancelEdit()
            }}
            onBlur={(e) => onCommitName(layer.id, e.currentTarget.value)}
            className="min-w-0 flex-1 rounded border border-accent bg-darkest px-1 text-[13px] text-fg outline-none"
          />
        ) : (
          <span
            className={cn(
              "flex-1 truncate text-[13px]",
              active ? "font-medium text-fg" : "text-fg-dim",
            )}
          >
            {layer.name}
          </span>
        )}

        {layer.opacity < 100 && (
          <span className="font-mono text-[11px] text-fg-faint">{layer.opacity}</span>
        )}
      </div>
    </li>
  )
}

/** Bottom half of the right sidebar — the layer stack. */
export function LayersPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggle,
  onAdd,
  onDelete,
  onRename,
  onDuplicate,
  onMoveTo,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const cancelRef = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const commitName = (id: string, value: string) => {
    if (!cancelRef.current) onRename(id, value)
    cancelRef.current = false
    setEditingId(null)
  }
  const cancelEdit = () => {
    cancelRef.current = true
    setEditingId(null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const toIndex = layers.findIndex((l) => l.id === over.id)
      if (toIndex !== -1) onMoveTo(String(active.id), toIndex)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-[18px] pt-4 pb-2">
        <PanelHead>Layers</PanelHead>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul aria-label="Layers" className="scrollbar-thin flex-1 overflow-y-auto px-2">
            {layers.map((layer) => (
              <SortableLayerRow
                key={layer.id}
                layer={layer}
                active={layer.id === activeLayerId}
                editing={editingId === layer.id}
                onSelect={onSelect}
                onToggle={onToggle}
                onStartEdit={setEditingId}
                onCommitName={commitName}
                onCancelEdit={cancelEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

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
          onClick={() => onDuplicate(activeLayerId)}
          aria-label="Duplicate layer"
          className={cn(footerBtn, "px-3")}
        >
          <Copy size={16} />
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
