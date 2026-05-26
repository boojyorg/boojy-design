import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { NumChip } from "@/components/NumChip"
import { PanelHead } from "@/components/PanelHead"
import { Slider } from "@/components/ui/slider"

function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-fg-dim">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/** Read-only slider (the deeper brush params are display-only in the shell). */
function StaticSlider({
  label,
  value,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  min?: number
  max?: number
}) {
  return (
    <div className="w-36">
      <Slider aria-label={label} value={[value]} min={min} max={max} onValueChange={() => {}} />
    </div>
  )
}

/** Top half of the right sidebar — secondary brush properties (§8 params). */
export function PropertiesPanel() {
  return (
    <div className="shrink-0 border-divider border-b px-[18px] py-4">
      <PanelHead>Properties</PanelHead>
      <div className="mt-3 flex flex-col gap-3">
        <PropRow label="Flow">
          <StaticSlider label="Flow" value={100} />
          <NumChip value={100} />
        </PropRow>
        <PropRow label="Spacing">
          <StaticSlider label="Spacing" value={8} min={1} max={50} />
          <NumChip value={8} />
        </PropRow>
        <PropRow label="Pressure">
          <StaticSlider label="Pressure" value={70} />
          <NumChip value={70} />
        </PropRow>
        <PropRow label="Stabilize">
          <StaticSlider label="Stabilize" value={40} />
          <NumChip value={40} />
        </PropRow>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12.5px] text-fg-dim">Blend</span>
          <div className="flex items-center gap-1.5 rounded-md border border-divider bg-panel px-2.5 py-1.5 text-fg text-xs">
            Normal <ChevronDown size={12} className="text-fg-faint" />
          </div>
        </div>
      </div>
    </div>
  )
}
