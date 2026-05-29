---
paths:
  - "src/editor/Canvas/**"
---

# Engine gotchas (Konva canvas + CanvasStage)

> Load-bearing rules for the canvas seam — migrated out of the old `dreams.md` §3 so they
> survive in git. Architecture overview is in `CLAUDE.md`; this is the per-edit footgun list.
> (Note: `paths:` conditional loading is unreliable in early-2026 Claude Code — treat this as
> organization, not guaranteed context savings.)

- **Naive composite path only.** Konva clears 60fps at 2K/50 layers on the single-composite path;
  `layer.cache()` was counterproductive in the spike. Keep the 50-layer cap (memory ceiling
  ~800MB for 50×2K is unvalidated).

- **`renderOverlay` gate must check both layer types.** It must test `node?.image.visible()`
  (raster) **AND** `textNodes.has(activeLayerId)` (text). Forget either and Move-tool transform
  handles silently fail to render for that one layer type.

- **`beginStroke`/`continueStroke`/`endStroke` text guard.** The select tool on a text layer has no
  raster `target`; all three need the `|| (tool === "select" && textNodes.has(strokeLayerId))`
  bypass, or Move/transform on text breaks.

- **Float-drag undo is two commands** (cut → paste at final position). One ⌘Z removes the floated
  layer; a second ⌘Z restores source pixels. Intentional MVP behaviour, not a bug.

- **Text layers are always live** — there is no rasterize action. Text serializes as metadata in
  `.design` (no base64 PNG); only raster layers carry pixels.

- **Hook tax on `CanvasEngine.ts` (~1540 lines).** Each edit triggers Biome reformat + typecheck +
  vitest, plus a mandatory re-read after reformat — budget ~3–4 round trips per logical change, and
  prefer batching multi-site edits. Logic now in the extracted modules (`text.ts`, `stroke.ts`,
  `thumbnail.ts`, `selection.ts`, …) is cheap to edit — work there when you can, not in the core.

- **`viewportStore.zoom` is a percentage (0–100+), not a fraction.** Any screen-space scaling must
  use `zoom / 100`; using `zoom` directly inflates sizes 100× (the brush-cursor-ring bug).
