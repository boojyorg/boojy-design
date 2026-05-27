import { ArrowDownUp } from "lucide-react"
import { ColorPopover } from "@/components/ColorPopover"

/**
 * Stacked FG/BG colour swatches at the rail's base, plus a swap control. Shape
 * grammar: squares = action tools (above), circles = colour properties (here).
 * Painting always uses the foreground; the swap button (and X) flips the two,
 * D resets to black/white.
 */
export function ColorSwatches({
  foreground,
  background,
  onForeground,
  onBackground,
  onSwap,
}: {
  foreground: string
  background: string
  onForeground: (color: string) => void
  onBackground: (color: string) => void
  onSwap: () => void
}) {
  return (
    <div className="my-1 flex flex-col items-center gap-1.5">
      <ColorPopover value={foreground} onChange={onForeground}>
        <button
          type="button"
          aria-label="Foreground color"
          className="size-[30px] rounded-full border-2 border-chrome shadow-[0_0_0_1.5px_var(--color-fg)]"
          style={{ backgroundColor: foreground }}
        />
      </ColorPopover>
      <ColorPopover value={background} onChange={onBackground}>
        <button
          type="button"
          aria-label="Background color"
          className="size-[30px] rounded-full border-2 border-chrome shadow-[0_0_0_1px_var(--color-divider)]"
          style={{ backgroundColor: background }}
        />
      </ColorPopover>
      <button
        type="button"
        aria-label="Swap foreground and background colors"
        onClick={onSwap}
        className="mt-0.5 flex size-5 items-center justify-center rounded text-fg-dim hover:bg-elevated hover:text-fg"
      >
        <ArrowDownUp size={13} strokeWidth={1.8} />
      </button>
    </div>
  )
}
