import { useDocumentStore } from "@/editor/state/documentStore"
import type { Command } from "@/editor/state/undoStore"
import type { Layer } from "@/editor/types"

/**
 * Command factories for the unified undo timeline. Each turns a user intent into a
 * recorded {@link Command}, capturing whatever it needs to reverse and replay itself.
 *
 * Metadata ops use a memento: snapshot the (small) document slice before and after,
 * and undo/redo just restore the relevant snapshot — the engine re-syncs from the
 * `layers` array, so no per-op inverse logic. Pixel-bearing ops (delete/duplicate)
 * additionally capture a layer's pixels and replay them through the {@link PixelPort}.
 */

interface DocumentSnapshot {
  layers: Layer[]
  activeLayerId: string
  nextLayerNum: number
}

/** The pixel operations the timeline needs from the engine, via the CanvasStage handle. */
export interface PixelPort {
  /** Clone a layer's current pixels, or null if it has no node (e.g. under jsdom). */
  captureLayerPixels: (layerId: string) => HTMLCanvasElement | null
  /** Queue a pixel snapshot to paint into a layer once its node next exists (after a sync). */
  stashPixelRestore: (layerId: string, canvas: HTMLCanvasElement) => void
}

function snapshot(): DocumentSnapshot {
  const { layers, activeLayerId, nextLayerNum } = useDocumentStore.getState()
  return { layers, activeLayerId, nextLayerNum }
}

/** Restore a document slice (shallow-merge keeps the store's action fns intact). */
function restore(s: DocumentSnapshot): void {
  useDocumentStore.setState(s)
}

/** The store updates immutably, so an unchanged op leaves every field referentially equal. */
function sameDoc(a: DocumentSnapshot, b: DocumentSnapshot): boolean {
  return (
    a.layers === b.layers &&
    a.activeLayerId === b.activeLayerId &&
    a.nextLayerNum === b.nextLayerNum
  )
}

/**
 * Run a pure-metadata mutation and, if it actually changed the document, record it as
 * one undo step. For rename/move/visibility/add — the engine re-renders from `layers`,
 * so no pixel work. No-ops (empty rename, same-index move, protected last layer) record
 * nothing, so ⌘Z never lands on a step that does nothing visible.
 */
export function runUndoable(
  label: string,
  mutate: () => void,
  record: (command: Command) => void,
): void {
  const before = snapshot()
  mutate()
  const after = snapshot()
  if (sameDoc(before, after)) return
  record({ label, undo: () => restore(before), redo: () => restore(after) })
}

/**
 * Delete the active layer, undoable *with its pixels*. Captures the doomed layer's
 * pixels before removal; undo stashes them then restores the metadata so the
 * layers-effect repaints them into the resurrected node.
 */
export function runDeleteLayer(port: PixelPort, record: (command: Command) => void): void {
  const before = snapshot()
  const deletedId = before.activeLayerId
  const pixels = port.captureLayerPixels(deletedId) // clone before the node is destroyed
  useDocumentStore.getState().deleteActiveLayer()
  const after = snapshot()
  if (sameDoc(before, after)) return // last layer is protected — nothing happened
  record({
    label: "delete layer",
    undo: () => {
      // Stash first so the sync that `restore` triggers repaints into the new node.
      if (pixels) port.stashPixelRestore(deletedId, pixels)
      restore(before)
    },
    redo: () => restore(after),
  })
}

/**
 * Duplicate a layer (copy above the source, activated), undoable. Snapshots the
 * source's pixels *now* and replays that snapshot on every (re)do, so redo is
 * deterministic even if the source is painted on or removed afterwards.
 */
export function runDuplicateLayer(
  sourceId: string,
  newId: string,
  port: PixelPort,
  record: (command: Command) => void,
): void {
  const before = snapshot()
  const pixels = port.captureLayerPixels(sourceId)
  if (pixels) port.stashPixelRestore(newId, pixels)
  useDocumentStore.getState().duplicateLayer(sourceId, newId)
  const after = snapshot()
  if (sameDoc(before, after)) return // source missing — nothing happened
  record({
    label: "duplicate layer",
    undo: () => restore(before), // removes the copy → its node is destroyed
    redo: () => {
      if (pixels) port.stashPixelRestore(newId, pixels)
      restore(after)
    },
  })
}
