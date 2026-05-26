import type { ReactNode } from "react"

/** Uppercase section heading used by the right-sidebar panels. */
export function PanelHead({ children }: { children: ReactNode }) {
  return (
    <div className="font-semibold text-[11px] text-fg-faint uppercase tracking-[0.08em]">
      {children}
    </div>
  )
}
