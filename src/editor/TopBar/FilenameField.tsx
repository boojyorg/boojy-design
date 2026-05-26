/** Filename + unsaved-dot. Clicking would open rename / project settings (§5). */
export function FilenameField({ name, dirty }: { name: string; dirty: boolean }) {
  return (
    <button
      type="button"
      title="Rename / project settings"
      className="flex items-center gap-[7px] rounded-[7px] px-[11px] py-[7px] text-fg-dim transition-colors hover:bg-hover"
    >
      <span className="font-medium text-[15px] text-fg tracking-[-0.005em]">{name}</span>
      {dirty && (
        <span
          role="img"
          aria-label="Unsaved changes"
          className="text-[17px] text-accent leading-none"
        >
          •
        </span>
      )}
    </button>
  )
}
