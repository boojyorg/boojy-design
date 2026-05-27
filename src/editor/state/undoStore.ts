import { create } from "zustand"
import { HistoryStack } from "@/editor/state/history"

/**
 * One undoable action. `undo` reverses it, `redo` re-applies it. Commands are
 * recorded *after* the action has already happened (log-after-apply), so neither
 * closure runs at record time — only on later undo/redo. A command may touch the
 * document store, the engine's pixels, or both; the store treats it as opaque.
 */
export interface Command {
  label: string
  undo: () => void
  redo: () => void
}

/**
 * The unified undo timeline. A single linear stack of commands spanning both
 * pixel strokes (emitted by the engine) and layer-metadata ops (built in the
 * chrome). Recording a new command truncates the redo branch — standard linear
 * history. Backed by the shared HistoryStack (cap + truncation already tested).
 *
 * The stack lives at module scope (not in the store object) so it isn't cloned on
 * every `set`; the store mirrors only the derived `canUndo`/`canRedo` flags that
 * the toolbar subscribes to.
 */
const stack = new HistoryStack<Command>()

interface UndoState {
  canUndo: boolean
  canRedo: boolean
  /** Log an already-applied command. */
  record: (command: Command) => void
  undo: () => void
  redo: () => void
  /** Drop the whole timeline (e.g. on engine teardown). */
  clear: () => void
}

export const useUndoStore = create<UndoState>()((set) => {
  const sync = () => set({ canUndo: stack.canUndo(), canRedo: stack.canRedo() })
  return {
    canUndo: false,
    canRedo: false,
    record: (command) => {
      stack.push(command)
      sync()
    },
    undo: () => {
      stack.undo()?.undo()
      sync()
    },
    redo: () => {
      stack.redo()?.redo()
      sync()
    },
    clear: () => {
      stack.clear()
      sync()
    },
  }
})
