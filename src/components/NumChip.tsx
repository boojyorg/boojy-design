/** Small monospace value chip used beside top-bar sliders. */
export function NumChip({ value }: { value: number | string }) {
  return (
    <div className="min-w-8 rounded border border-divider bg-darkest px-[7px] py-[3px] text-center font-mono text-fg text-xs">
      {value}
    </div>
  )
}
