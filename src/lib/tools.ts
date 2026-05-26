import { Brush, Eraser, Hand, type LucideIcon, MousePointer2, Shapes, Type } from "lucide-react"
import type { ToolId } from "@/editor/types"

export interface ToolDef {
  id: ToolId
  label: string
  shortcut: string
  icon: LucideIcon
  /** false = roadmap tool (v0.5) — shown but disabled in the MVP shell. */
  mvp: boolean
}

/** Left-rail tool order. Move + Text are v0.5 (dimmed); the rest are MVP. */
export const TOOLS: ToolDef[] = [
  { id: "select", label: "Move", shortcut: "V", icon: MousePointer2, mvp: false },
  { id: "brush", label: "Paint", shortcut: "B", icon: Brush, mvp: true },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser, mvp: true },
  { id: "shape", label: "Shape", shortcut: "R", icon: Shapes, mvp: true },
  { id: "text", label: "Text", shortcut: "T", icon: Type, mvp: false },
  { id: "hand", label: "Hand", shortcut: "H", icon: Hand, mvp: true },
]
