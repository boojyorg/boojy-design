import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

/** 30×30 transparent icon button with chrome hover (top-bar default size). */
export function IconButton({ className, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "flex size-[30px] items-center justify-center rounded-md text-fg-dim transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  )
}
