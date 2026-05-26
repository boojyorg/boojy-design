import { ChevronDown } from "lucide-react"
import { Logo } from "@/components/Logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function Shortcut({ children }: { children: string }) {
  return <span className="font-mono text-[11px] text-fg-faint">{children}</span>
}

/** "Design ▾" app menu. Export lives here (+ ⌘E) — never in the chrome. */
export function AppMenu({ onExport }: { onExport: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-[7px] px-[11px] py-[7px] outline-none transition-colors hover:bg-hover data-[state=open]:bg-hover">
        <Logo height={22} />
        <ChevronDown size={14} className="text-fg-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <span>New</span>
          <Shortcut>⌘N</Shortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span>Open…</span>
          <Shortcut>⌘O</Shortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onExport}>
          <span>Export…</span>
          <Shortcut>⌘E</Shortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span>Preferences</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span>About Boojy Design</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
