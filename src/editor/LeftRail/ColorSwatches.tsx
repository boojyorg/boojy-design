import { ArrowDownUp } from "lucide-react"
import { ColorPopover } from "@/components/ColorPopover"

/**
 * Stacked foreground / secondary colour swatches at the rail's base, plus a swap control.
 * Shape grammar: squares = action tools (above), circles = colour properties (here).
 * Painting always uses the foreground; the swap button (and X) flips the two, D resets to
 * black/white. The "secondary" colour is a painting colour-memory — distinct from the
 * document's Background layer.
 */
export function ColorSwatches({
  foreground,
  secondaryColor,
  onForeground,
  onSecondaryColor,
  onSwap,
}: {
  foreground: string
  secondaryColor: string
  onForeground: (color: string) => void
  onSecondaryColor: (color: string) => void
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
      <ColorPopover value={secondaryColor} onChange={onSecondaryColor}>
        <button
          type="button"
          aria-label="Secondary color"
          className="size-[30px] rounded-full border-2 border-chrome shadow-[0_0_0_1px_var(--color-divider)]"
          style={{ backgroundColor: secondaryColor }}
        />
      </ColorPopover>
      <button
        type="button"
        aria-label="Swap foreground and secondary colors"
        onClick={onSwap}
        className="mt-0.5 flex size-5 items-center justify-center rounded text-fg-dim hover:bg-elevated hover:text-fg"
      >
        <ArrowDownUp size={13} strokeWidth={1.8} />
      </button>
    </div>
  )
}
