import { Minus, Plus } from "lucide-react"

interface ZoomControlProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  /** Click the percentage readout to fit the page to the viewport (⌘0). */
  onFit?: () => void
}

const stepBtn =
  "flex size-6 items-center justify-center rounded text-fg-dim transition-colors hover:bg-hover hover:text-fg"

export function ZoomControl({ zoom, onZoomIn, onZoomOut, onFit }: ZoomControlProps) {
  const readout = `${Math.round(zoom)}%`
  return (
    <div className="flex items-center gap-1 rounded-[7px] border border-divider bg-darkest p-0.5">
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={stepBtn}>
        <Minus size={14} />
      </button>
      {onFit ? (
        <button
          type="button"
          onClick={onFit}
          aria-label="Fit to screen"
          className="min-w-12 rounded text-center font-mono text-fg-dim text-xs transition-colors hover:bg-hover hover:text-fg"
        >
          {readout}
        </button>
      ) : (
        <div className="min-w-12 text-center font-mono text-fg-dim text-xs">{readout}</div>
      )}
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={stepBtn}>
        <Plus size={14} />
      </button>
    </div>
  )
}
