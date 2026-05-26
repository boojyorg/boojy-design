/**
 * Pure, DOM-free undo/redo stack. Generic over an opaque entry type so it can be
 * unit-tested without canvases (the engine specialises it to pixel snapshots).
 * Linear history: pushing a new entry after an undo truncates the redo branch.
 */
export class HistoryStack<T> {
  private readonly cap: number
  private undoStack: T[] = []
  private redoStack: T[] = []

  constructor(cap = 24) {
    this.cap = Math.max(1, cap)
  }

  /** Record a new entry; clears the redo branch and drops the oldest if over cap. */
  push(entry: T): void {
    this.undoStack.push(entry)
    this.redoStack = []
    if (this.undoStack.length > this.cap) this.undoStack.shift()
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Move the latest entry onto the redo branch and return it (undefined if empty). */
  undo(): T | undefined {
    const entry = this.undoStack.pop()
    if (entry === undefined) return undefined
    this.redoStack.push(entry)
    return entry
  }

  /** Move the latest redone entry back onto the undo branch and return it. */
  redo(): T | undefined {
    const entry = this.redoStack.pop()
    if (entry === undefined) return undefined
    this.undoStack.push(entry)
    return entry
  }

  /** Drop every entry (both directions) matching the predicate. */
  prune(shouldRemove: (entry: T) => boolean): void {
    this.undoStack = this.undoStack.filter((e) => !shouldRemove(e))
    this.redoStack = this.redoStack.filter((e) => !shouldRemove(e))
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
