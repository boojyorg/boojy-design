import { FlipHorizontal2, FlipVertical2 } from "lucide-react"
import { type ComponentProps, forwardRef, type ReactNode } from "react"
import { ColorPopover } from "@/components/ColorPopover"
import { IconButton } from "@/components/IconButton"
import { NumChip } from "@/components/NumChip"
import { Slider } from "@/components/ui/slider"
import type { ToolId } from "@/editor/types"

interface ToolPropertiesProps {
  tool: ToolId
  brushSize: number
  hardness: number
  opacity: number
  foreground: string
  fillTolerance: number
  hasMarqueeSelection?: boolean
  onBrushSize: (v: number) => void
  onHardness: (v: number) => void
  onOpacity: (v: number) => void
  onForeground: (color: string) => void
  onFillTolerance: (v: number) => void
  onFlipH: () => void
  onFlipV: () => void
  onMarqueeFlipH?: () => void
  onMarqueeFlipV?: () => void
}

function ToolProp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-[9px]">
      <span className="font-medium text-fg-faint text-xs">{label}</span>
      {children}
    </div>
  )
}

function PropSlider({
  label,
  value,
  min = 0,
  max = 100,
  width,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  width: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ width }}>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
      />
    </div>
  )
}

const ColorChip = forwardRef<HTMLButtonElement, { color: string } & ComponentProps<"button">>(
  function ColorChip({ color, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label="Foreground color"
        className="h-[22px] w-[26px] rounded-[5px] border border-divider"
        style={{ backgroundColor: color }}
        {...props}
      />
    )
  },
)

/**
 * The "Smart Tools" zone — top-bar centre that swaps with the active tool.
 * This is the visible payoff of the §5 promise.
 */
export function ToolProperties({
  tool,
  brushSize,
  hardness,
  opacity,
  foreground,
  fillTolerance,
  hasMarqueeSelection,
  onBrushSize,
  onHardness,
  onOpacity,
  onForeground,
  onFillTolerance,
  onFlipH,
  onFlipV,
  onMarqueeFlipH,
  onMarqueeFlipV,
}: ToolPropertiesProps) {
  if (tool === "brush" || tool === "eraser") {
    return (
      <div className="flex items-center gap-[18px]" data-testid="tool-props">
        <ToolProp label="Size">
          <PropSlider
            label="Size"
            value={brushSize}
            min={1}
            max={500}
            width={100}
            onChange={onBrushSize}
          />
          <NumChip value={brushSize} />
        </ToolProp>
        <ToolProp label="Hardness">
          <PropSlider label="Hardness" value={hardness} width={84} onChange={onHardness} />
          <NumChip value={hardness} />
        </ToolProp>
        <ToolProp label="Opacity">
          <PropSlider label="Opacity" value={opacity} width={84} onChange={onOpacity} />
          <NumChip value={opacity} />
        </ToolProp>
        {tool === "brush" && (
          <ToolProp label="Color">
            <ColorPopover value={foreground} onChange={onForeground}>
              <ColorChip color={foreground} />
            </ColorPopover>
          </ToolProp>
        )}
      </div>
    )
  }

  if (tool === "fill") {
    return (
      <div className="flex items-center gap-[18px]" data-testid="tool-props">
        <ToolProp label="Tolerance">
          <PropSlider
            label="Tolerance"
            value={fillTolerance}
            width={100}
            onChange={onFillTolerance}
          />
          <NumChip value={fillTolerance} />
        </ToolProp>
        <ToolProp label="Color">
          <ColorPopover value={foreground} onChange={onForeground}>
            <ColorChip color={foreground} />
          </ColorPopover>
        </ToolProp>
      </div>
    )
  }

  if (tool === "shape") {
    // The rect/ellipse picker lives in the floating ShapeFlyout; only Fill here.
    return (
      <div className="flex items-center gap-3" data-testid="tool-props">
        <ToolProp label="Fill">
          <ColorPopover value={foreground} onChange={onForeground}>
            <ColorChip color={foreground} />
          </ColorPopover>
        </ToolProp>
      </div>
    )
  }

  if (tool === "marquee") {
    return (
      <div className="flex items-center gap-1" data-testid="tool-props">
        <IconButton
          aria-label="Flip horizontal"
          disabled={!hasMarqueeSelection}
          onClick={onMarqueeFlipH}
        >
          <FlipHorizontal2 size={16} />
        </IconButton>
        <IconButton
          aria-label="Flip vertical"
          disabled={!hasMarqueeSelection}
          onClick={onMarqueeFlipV}
        >
          <FlipVertical2 size={16} />
        </IconButton>
      </div>
    )
  }

  if (tool === "select") {
    return (
      <div className="flex items-center gap-1" data-testid="tool-props">
        <IconButton aria-label="Flip horizontal" onClick={onFlipH}>
          <FlipHorizontal2 size={16} />
        </IconButton>
        <IconButton aria-label="Flip vertical" onClick={onFlipV}>
          <FlipVertical2 size={16} />
        </IconButton>
      </div>
    )
  }

  const hint =
    tool === "hand"
      ? "Drag to pan · scroll to zoom"
      : tool === "eyedropper"
        ? "Click the canvas to pick a colour"
        : "Text tool — coming in v0.5"

  return (
    <span className="text-fg-faint text-xs italic" data-testid="tool-props">
      {hint}
    </span>
  )
}
