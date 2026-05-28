# Changelog

All notable changes to Boojy Design are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). (This is the app/product version —
the `.design` file-format version is tracked separately in `src/lib/designFile.ts`.)

## [Unreleased]

_Nothing yet._

## [0.4.0] — 2026-05-28

### Added

- **Live text layers** — pick the Text tool and click the canvas to place a text layer, then type
  directly on the canvas; blurring or switching tools commits the edit. Click an existing text
  layer with the Text tool (or double-click it from any tool) to re-edit, with the caret landing
  at the clicked character. The layers panel gains font-size and text-colour controls when a text
  layer is active. Text layers move, scale, and rotate with the Move tool like any other layer.
  Text stays live (never rasterised) — it serialises as metadata in `.design` files (no pixels)
  and composites into PNG export via `fillText`. Each commit is a single undo step.

This release closes the MVP. Font-family picker, alignment, and multi-line wrapping are post-MVP.

## [0.3.0] — 2026-05-28

### Added

- **Layer opacity** — each layer now has a 0–100% opacity slider in the layers panel, shown
  above the layer list whenever a non-Background layer is active. Opacity updates live as you
  drag and is fully undoable as a single undo step (⌘Z jumps to the pre-drag value, not through
  every intermediate position). Opacity is saved and restored in `.design` files and composited
  correctly in exported PNGs.

## [0.2.1] — 2026-05-28

### Added

- **Marquee flip** — Flip H and Flip V buttons appear in the top bar while the Marquee tool is
  active; they enable once a selection rect is drawn and disable when the selection is dismissed.
  Flips mirror the selected pixels within the rect in place, leaving pixels outside untouched.
  Works correctly with rotated and scaled layers.
- **Drag-to-float** — clicking and dragging inside an existing marquee selection cuts the selected
  pixels to a temporary floating overlay that follows the cursor. Releasing drops them as a new
  "Floated" layer at the destination, switches to the Move tool, and immediately shows the transform
  handles on the new layer. Both the cut and the paste are undoable as separate steps.

### Fixed

- Marquee Flip H/V buttons were permanently disabled — `hasMarqueeSelection` and the flip callbacks
  were declared on `TopBarProps` but not forwarded to `<ToolProperties>`.
- Move-tool transform handles did not appear after a float-drag drop — `notifyPixels` invalidated
  the content-box cache but never re-rendered the overlay; now calls `renderOverlay()`.
- Flipping a selection twice left faint residual lines — `selectionRect` stored raw floating-point
  `screenToDoc` coordinates, causing a non-integer flip-centre that bilinear-bleed edge pixels
  outside the clear zone. Fixed by snapping the rect to integer pixel boundaries in `updateSelection`
  and setting `imageSmoothingEnabled = false` in `copyRegion` and `flipRegion`.

## [0.2.0] — 2026-05-27

### Added

- **Marquee tool** (`M`) — rectangular selection with marching-ants animation. Draw a box, then:
  - **⌘C** copy the selected region of the active layer into an internal clipboard.
  - **⌘X** cut (copy + clear the region, undoable).
  - **⌫ Delete** clear the selected region (undoable).
  - **⌘V** paste as a new "Pasted" layer on top, offset 16 px — move it with the Move tool.
  - **Escape** or clicking without dragging clears the selection.
  - Switching tools clears the selection automatically.
  - Copy/clear are transform-aware: correctly handles rotated/scaled layers.

## [0.1.0] — 2026-05-27

First tagged release: the V1 "Classic" shell plus a working MVP paint loop on the Konva engine.

### Added

- **Canvas engine** — imperative Konva engine behind the `CanvasStage` seam; per-layer pixel
  buffers on the naive single-composite path (1280×800 page).
- **Brush & eraser** — raster paint in any colour, with size/hardness/opacity.
- **Foreground colour** — editable colour picker feeding every paint tool.
- **Shape tool** — drag a filled rectangle or ellipse onto the active layer (Shift = square/circle);
  rect/ellipse picker floats beside the rail.
- **Fill bucket** — contiguous flood fill from the clicked point, with a Tolerance slider; composites
  under anti-aliased edges to avoid a fringe ring.
- **Eyedropper** — sample the composited colour under the cursor into the foreground, then snap back
  to the previous tool.
- **Move tool** — non-destructive free transform: an 8-handle box (proportional corners / Shift =
  free, single-axis edges, rotate grip with 15° snap, drag-inside to move), rotation-aware cursors,
  arrow-key nudges. Pixels never leave their buffer.
- **Layers** — reorder (drag), rename, duplicate (with pixels), delete; live per-layer thumbnails in
  the panel.
- **Unified undo/redo** — one timeline across strokes *and* every layer op, including undo-delete
  with pixels intact (⌘Z / ⌘⇧Z).
- **Image import** — open or drag-drop an image as a new, fit-centred layer.
- **PNG export** — flatten and export the canvas (⌘E).
- **Save / open `.design` documents** — JSON holding layer metadata + each layer's pixels as an
  embedded base64 PNG, plus per-layer transforms (⌘S / ⌘O).
- **Canvas navigation** — scroll to pan, pinch / ⌘-scroll to zoom toward the cursor, Space-drag and
  the Hand tool to pan, a Chrome-like preset zoom ladder on the +/- controls, and ⌘0 fit / ⌘1 100%.
- **App version** — shown in the Design menu under "About Boojy Design".

[Unreleased]: https://github.com/tyrbujac/boojy-design/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/tyrbujac/boojy-design/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/tyrbujac/boojy-design/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/tyrbujac/boojy-design/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tyrbujac/boojy-design/releases/tag/v0.1.0
