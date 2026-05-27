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
 * ⌘O opens a document, ⌘S saves, ⌘E exports, ⌘Z/⌘⇧Z undo/redo, ⌘0 fits the page,
 * ⌘1 = 100%, B/E/R/H select tools, [ ] nudge brush size, +/- zoom, X swaps the
 * foreground/background colours, D resets them to black/white. Other modifier
 * combos and typing are ignored (so OS/browser shortcuts pass through).
 */
export function useKeyboardShortcuts(
  dispatch: Dispatch<EditorAction>,
  opts?: {
    onExport?: () => void
    onOpen?: () => void
    onSave?: () => void
    onUndo?: () => void
    onRedo?: () => void
    onZoomIn?: () => void
    onZoomOut?: () => void
    onZoomFit?: () => void
    onZoom100?: () => void
    onCopy?: () => void
    onCut?: () => void
    onPaste?: () => void
    onDelete?: () => void
  },
) {
  const onExport = opts?.onExport
  const onOpen = opts?.onOpen
  const onSave = opts?.onSave
  const onUndo = opts?.onUndo
  const onRedo = opts?.onRedo
  const onZoomIn = opts?.onZoomIn
  const onZoomOut = opts?.onZoomOut
  const onZoomFit = opts?.onZoomFit
  const onZoom100 = opts?.onZoom100
  const onCopy = opts?.onCopy
  const onCut = opts?.onCut
  const onPaste = opts?.onPaste
  const onDelete = opts?.onDelete
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
        // ⌘0 fit-to-screen, ⌘1 actual size — standard view shortcuts.
        if (key === "0" && !e.shiftKey) {
          e.preventDefault()
          onZoomFit?.()
          return
        }
        if (key === "1" && !e.shiftKey) {
          e.preventDefault()
          onZoom100?.()
          return
        }
        if (key === "c" && !e.shiftKey) {
          e.preventDefault()
          onCopy?.()
          return
        }
        if (key === "x" && !e.shiftKey) {
          e.preventDefault()
          onCut?.()
          return
        }
        if (key === "v" && !e.shiftKey) {
          e.preventDefault()
          onPaste?.()
          return
        }
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()
      const toolId = TOOL_KEYS[key]
      if (toolId) {
        dispatch({ type: "setTool", tool: toolId })
        return
      }
      if (key === "x") {
        dispatch({ type: "swapColors" })
        return
      }
      if (key === "d") {
        dispatch({ type: "resetColors" })
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        onDelete?.()
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
          onZoomIn?.()
          break
        case "-":
          onZoomOut?.()
          break
        default:
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    dispatch,
    onExport,
    onOpen,
    onSave,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onZoom100,
    onCopy,
    onCut,
    onPaste,
    onDelete,
  ])
}
