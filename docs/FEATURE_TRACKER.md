# Boojy Design — Feature Tracker

What's built vs not. **✅ shipped · 🚧 in progress · ⬜ planned.** Tick in the **same commit as
`CHANGELOG.md`** when a feature ships — never as a separate ritual. Prose tour → `FEATURES.md`;
ordering → `ROADMAP.md`.

## Core editing
- ✅ Brush & eraser — raster paint; Shift = 45°-snapped line; zoom-aware cursor ring
- ✅ Shape tool — drag rect/ellipse; Shift = square/circle
- ✅ Fill bucket — contiguous flood fill with tolerance; fill-behind anti-aliased edges
- ✅ Eyedropper — samples composited colour, snaps back to previous tool
- ✅ Move / free transform — 8-handle box, mirror, arrow-key nudge
- ✅ Marquee selection — copy / cut / paste-as-layer / flip / drag-to-float
- ⬜ Lasso / freehand selection
- ⬜ Elliptical marquee
- ⬜ Paint masking within selection

## Layers
- ✅ Reorder, rename, duplicate-with-pixels, delete, live thumbnails, locked Background
- ✅ Layer opacity (0–100%, saved in `.design` + composited in export)
- ⬜ Blend modes (multiply / screen / overlay — significant engine work)

## Text
- ✅ Live text layers — place / re-edit, font size + colour, metadata-serialized
- ⬜ Font family picker
- ⬜ Alignment (left / center / right)
- ⬜ Multi-line wrapping

## Transform
- ✅ Move / scale / rotate, Flip H/V, arrow-key nudge
- ⬜ Skew / shear (v1.0)

## File / viewport
- ✅ Save / open `.design`, PNG export (flattened), image import
- ✅ Viewport navigation — pan, zoom-to-cursor, Hand tool, zoom ladder, fit / 100%
- ✅ Unified undo/redo — one `Command` stack for strokes + every layer op
