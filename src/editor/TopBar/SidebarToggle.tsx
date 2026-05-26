import { cn } from "@/lib/cn"

/**
 * Right-sidebar collapse toggle. Uses the panel-collapse pictogram the user
 * picked ("keep current"): a chevron inside the right column flips direction.
 */
export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!collapsed}
      aria-label={collapsed ? "Show panels" : "Hide panels"}
      title={collapsed ? "Show panels" : "Hide panels"}
      className={cn(
        "flex size-[34px] items-center justify-center rounded-md transition-colors hover:bg-hover",
        collapsed ? "text-fg-faint" : "text-fg-dim",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="1.8" />
        <path d="M15 4v16" />
        {collapsed ? (
          <path d="M17 9l2 3-2 3" opacity="0.6" />
        ) : (
          <path d="M18 9l-2 3 2 3" opacity="0.6" />
        )}
      </svg>
    </button>
  )
}
