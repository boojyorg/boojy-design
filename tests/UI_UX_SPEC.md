# Boojy Design — UI/UX Spec (Playwright-observed)

A reference of the editor's observed structure and interaction behaviour, captured by driving
the live app (`pnpm dev`) through the Playwright MCP browser. This documents *what the running
app actually does*, not the source — pair it with `CLAUDE.md`/`README.md` for internals.

- **Captured:** 2026-06-08 against `boojy-design@0.4.0` (Vite dev, `http://localhost:5174`).
- **Viewport:** 1920×1080.
- **Baseline artifacts:**
  - [`visual-snapshots/baseline-composition-master.png`](visual-snapshots/baseline-composition-master.png) — layer-order compositing
  - [`visual-snapshots/smiley-face-master.png`](visual-snapshots/smiley-face-master.png) — multi-tool composition (Shape→Ellipse + brush)

## Editor shell (V1 "Classic")

Four regions, matching the documented shell split:

| Region | Contents |
| --- | --- |
| **TopBar** (`banner`) | Logo / doc menu, document title + unsaved dot, Undo/Redo, zoom controls (`Zoom out`, `Fit to screen` %, `Zoom in`), the active tool's quick params (Size / Hardness / Opacity / Color for Paint), and a `Hide panels` toggle. |
| **LeftRail** (`navigation "Tools"`) | Move (V), Marquee (M), Paint (B), Eraser (E), Fill (G), Shape (R), Eyedropper (I), Text (T), Hand (H). Below: Foreground / Secondary colour swatches + a swap-colours button. |
| **Canvas** | The Konva stage. At 75% fit, the document occupied ~`(364,266)`–`(1322,866)` in the 1920×1080 viewport; document centre ≈ `(844,566)`. |
| **RightSidebar** | **Properties** (tool-specific: Flow / Spacing / Pressure / Stabilize / Blend for Paint) and **Layers** (per-layer opacity slider, the layer stack `list`, and `Add layer` / `Duplicate layer` / `Delete layer` buttons at the bottom). |

### Accessibility surface (good)
- Tools expose `button` roles with `"<Name> (<shortcut>)"` accessible names and a `pressed` state on the active tool.
- The layer stack is a `list` of `option` items; the active layer carries `selected`. Each row has a `Reorder`, a `Hide` (toggle, `pressed` = visible), and the layer name.
- Colour picker is a `dialog` with a 2-D `Color` slider, a `Hue` slider, and a `Hex color` textbox (round-trips a `#RRGGBB` value).
- Sliders are real `slider` roles with adjacent numeric read-outs.

## Verified interaction loop — z-index compositing

The baseline screenshot was produced by this sequence; each step behaved as expected.

1. **Shape tool → amber rectangle.** Selecting `Shape (R)` and dragging on the canvas
   (`~(744,466)`→`(944,666)`) stamped a filled rectangle in the document's default foreground
   amber (`#E89940` / `rgb(232,153,64)`) onto the active **Layer 1**. The layer thumbnail updated to amber.
2. **Add layer.** The RightSidebar `Add layer` (`+`) button created **Layer 2**, inserted *above*
   Layer 1 and auto-selected (it became the `selected` `option` at the top of the stack).
3. **Blue brush stroke on Layer 2.** Switching to `Paint (B)`, opening the foreground swatch
   (a `dialog`), and typing `#1E66F5` into the Hex field set the foreground to blue
   (confirmed `rgb(30,102,245)`). Dragging a diagonal stroke across the rectangle painted the
   line onto Layer 2. With Layer 2 on top, the blue line rendered **over** the amber rectangle.
4. **Reorder Layer 2 below Layer 1.** Dragging Layer 2's reorder handle down past Layer 1
   reordered the stack to `[Layer 1, Layer 2, Background]`. The canvas recomposited immediately:
   the amber rectangle now covers the **middle** of the blue stroke, leaving only the two line
   ends visible on either side.

**Result:** the z-index composition engine is correct. Raster pixels obey layer stack order —
the higher layer's opaque pixels occlude the lower layer's, recomposited live on reorder. This is
the Photoshop-style raster-on-active-layer model, not vector object stacking.

## Verified interaction loop — multi-tool composition (smiley face)

Produced `smiley-face-master.png`. Exercises tool switching, the Shape flyout, discrete brush
stamps, and a continuous freehand drag — all coordinate-plotted off the live canvas centre `(844,566)`.

1. **Face (Shape → Ellipse, Layer 1).** Selecting `Shape (R)` reveals a **flyout** with
   `Rectangle` (default) and `Ellipse`. Clicking `Ellipse`, then dragging bbox `(694,416)→(994,716)`
   stamped a ~300px amber circle (default foreground `#E89940`).
2. **Layer 2 added & active** (top of stack, auto-selected).
3. **Eyes (Paint, Layer 2, `#161616`).** Two discrete stamps symmetric about x=844 and above the
   centre: left `(794,516)`, right `(894,516)`.
4. **Smile (Paint, continuous drag).** A 25-point parabola — ends `(764,600)` & `(924,600)`,
   vertex `(844,660)`, `y = 660 − 60·t²` for `t∈[−1,1]` — traced as one click-and-drag, giving a
   smooth upward U.

**Result:** features composite cleanly over the face; the Layer 2 thumbnail shows only the
eyes+smile, confirming each draws onto the active layer.

## Behavioural notes for future automation

- **Canvas drawing is coordinate-based.** Konva listens to real pointer events, so shape/brush
  actions must be driven with `page.mouse.move/down/up` at viewport coordinates (via the
  Playwright `run_code_unsafe` tool), *not* element-targeted clicks/drags. Compute coordinates
  from the live `<canvas>` `getBoundingClientRect()` rather than hard-coding.
- **Foreground colour persists across tools** — the amber used by Shape and the blue set later
  are the same foreground swatch; set it once before the action that consumes it.
- **Shape flyout options aren't keyed by visible text** — after selecting `Shape (R)`, the
  Rectangle/Ellipse choices are `button[aria-label="Rectangle"]` / `button[aria-label="Ellipse"]`
  (they only appear while the Shape tool is active). Locate them by `aria-label`, not by position;
  observed at ~`(95,542)` and `(95,590)` but treat that as incidental.
- **Discrete brush stamps need a 1px nudge** — a zero-distance `mouse.down()`→`mouse.up()` can
  fail to register a stamp. After `down()`, do a tiny `move(x+1, y+1, {steps:2})` before `up()`
  so a single-click dot reliably paints (used for the eyes).
- **Reset the cursor off-canvas before the final screenshot** — the brush renders a live hover-ring
  outline at the pointer, which leaks into captures (it appeared at the smile's end-point). Move the
  mouse to a neutral chrome area (e.g. `(1750,750)`) and wait ~200ms before `take_screenshot` for a
  clean baseline.
- **Layer reorder needs a drag-activation nudge** — begin the drag, make a small (~7px) initial
  move to trip the drag threshold, then move to the target row before releasing. Verify the
  outcome by reading the `aria-label`s of the `[role="option"]` rows, not by pixels alone.
- **Port may differ.** `pnpm dev` falls back off `5173` if it's in use (observed `5174`); read the
  Vite banner for the actual URL.
- **The engine no-ops under jsdom**, so this visual loop is the only way to exercise live
  paint/render/compositing — automated unit tests cover pure logic only.

## Files

- `visual-snapshots/baseline-composition-master.png` — canonical end-state of the layer-order loop;
  use as the visual baseline for compositing/layer-order regressions.
- `visual-snapshots/smiley-face-master.png` — multi-tool composition baseline (Shape→Ellipse +
  brush eyes/smile); use for tool-switching / brush-dynamics regressions.
