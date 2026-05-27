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

interface AppMenuProps {
  /** Open a .design document. */
  onOpen: () => void
  /** Save the document to a .design file. */
  onSave: () => void
  /** Import an image as a new layer. */
  onImportImage: () => void
  /** Export the flattened canvas as a PNG. */
  onExport: () => void
}

/** "Design ▾" app menu. Document ops (Open/Save), then image in/out (Import/Export),
 *  each with its menu-only keyboard shortcut — never duplicated in the chrome. */
export function AppMenu({ onOpen, onSave, onImportImage, onExport }: AppMenuProps) {
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
        <DropdownMenuItem onSelect={onOpen}>
          <span>Open…</span>
          <Shortcut>⌘O</Shortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSave}>
          <span>Save</span>
          <Shortcut>⌘S</Shortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onImportImage}>
          <span>Import image…</span>
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
