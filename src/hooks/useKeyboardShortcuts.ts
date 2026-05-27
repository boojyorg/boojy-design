import { type Dispatch, useEffect } from "react"
import type { EditorAction } from "@/editor/state/useEditorState"
import type { ToolId } from "@/editor/types"
import { TOOLS } from "@/lib/tools"

// Single-key tool shortcuts, MVP tools only — so the keyboard map and the
// dimmed rail tell the same story (pressing V/T does nothing).
const TOOL_KEYS: Record<string, ToolId> = Object.fromEntries(
  TOOLS.filter((t) => t.mvp).map((t) => [t.shortcut.toLowerCase(), t.id]),
)

/**
 * Global editor shortcuts (disposable, like the rest of the shell state):
 * ⌘O opens a document, ⌘S saves, ⌘E exports, ⌘Z/⌘⇧Z undo/redo, B/E/R/H select
 * tools, [ ] nudge brush size, +/- zoom. Other modifier combos and typing are
 * ignored (so OS/browser shortcuts pass through).
 */
export function useKeyboardShortcuts(
  dispatch: Dispatch<EditorAction>,
  opts?: {
    onExport?: () => void
    onOpen?: () => void
    onSave?: () => void
    onUndo?: () => void
    onRedo?: () => void
  },
) {
  const onExport = opts?.onExport
  const onOpen = opts?.onOpen
  const onSave = opts?.onSave
  const onUndo = opts?.onUndo
  const onRedo = opts?.onRedo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore everything while typing, so e.g. ⌘Z in the filename/hex field does
      // native text undo rather than canvas undo. Checked first, before any shortcut.
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      // ⌘/Ctrl shortcuts — preventDefault to beat the browser's native bindings.
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase()
        if (key === "z") {
          e.preventDefault()
          if (e.shiftKey) onRedo?.()
          else onUndo?.()
          return
        }
        if (key === "e" && !e.shiftKey) {
          e.preventDefault()
          onExport?.()
          return
        }
        if (key === "o" && !e.shiftKey) {
          e.preventDefault()
          onOpen?.()
          return
        }
        if (key === "s" && !e.shiftKey) {
          e.preventDefault()
          onSave?.()
          return
        }
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return

      const toolId = TOOL_KEYS[e.key.toLowerCase()]
      if (toolId) {
        dispatch({ type: "setTool", tool: toolId })
        return
      }

      switch (e.key) {
        case "[":
          dispatch({ type: "nudgeBrushSize", delta: -5 })
          break
        case "]":
          dispatch({ type: "nudgeBrushSize", delta: 5 })
          break
        case "+":
        case "=":
          dispatch({ type: "nudgeZoom", delta: 25 })
          break
        case "-":
          dispatch({ type: "nudgeZoom", delta: -25 })
          break
        default:
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dispatch, onExport, onOpen, onSave, onUndo, onRedo])
}
