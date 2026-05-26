import { ColorPopover } from "@/components/ColorPopover"

/**
 * Stacked FG/BG colour swatches at the rail's base. Shape grammar:
 * squares = action tools (above), circles = colour properties (here).
 */
export function ColorSwatches({
  foreground,
  onForeground,
}: {
  foreground: string
  onForeground: (color: string) => void
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
      <button
        type="button"
        aria-label="Background color"
        className="size-[30px] rounded-full border-2 border-chrome bg-white shadow-[0_0_0_1px_var(--color-divider)]"
      />
    </div>
  )
}
