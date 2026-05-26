import type { ReactNode } from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ColorPopoverProps {
  value: string
  onChange: (color: string) => void
  /** The trigger — a swatch button. Rendered via Radix `asChild`. */
  children: ReactNode
}

/** A foreground-colour picker (react-colorful) in a popover, shared by the top-bar
 *  chip and the left-rail swatch so both edit the same colour. */
export function ColorPopover({ value, onChange, children }: ColorPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="flex flex-col gap-2">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="flex items-center gap-1.5">
            <span className="text-fg-faint text-xs">Hex</span>
            <HexColorInput
              aria-label="Hex color"
              color={value}
              onChange={onChange}
              prefixed
              className="w-full rounded-md border border-divider bg-darkest px-2 py-1 font-mono text-fg text-xs uppercase outline-none focus:border-accent"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
