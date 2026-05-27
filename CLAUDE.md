# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor, built incrementally as an **active side-project**.
This repo began as the **V1 "Classic" UI shell** — a pixel-faithful build of the chosen
layout (top bar, left tool rail, canvas area, right sidebar) with mock interactivity. That
shell shipped and is live, and the design direction is **confirmed**, so this is now the
**foundation for an actively-developed app**, not a throwaway. The Konva canvas engine has
landed and the **MVP paint loop is in place** — paint/erase in any colour across layers
(reorder/rename/duplicate), undo/redo, image import, PNG export — all behind the canvas seam
(see "Engine decision" and "Roadmap" below). The document model has graduated to a Zustand
`documentStore`, undo/redo is a **unified timeline** (`undoStore`) — strokes *and* every layer
op (incl. undo-delete with pixels) on one stack — documents **save/open** as `.design`
files (`src/lib/designFile.ts`), the **Shape tool** draws filled rect/ellipse (drag to
size, Shift = square/circle) onto the active layer, the **Move tool** is a **free transform** —
non-destructive move + scale + rotate (an 8-handle box) via a per-layer engine transform (pixels
never leave the buffer) — the **Layers panel shows live pixel thumbnails** per layer (fed by an
engine `onLayerPixelsChanged` signal → `thumbnailStore`), and **canvas navigation** (pan +
zoom-to-cursor) lives in `viewportStore`. The app is tagged **v0.1.0** — the first release (see
`CHANGELOG.md`). Next: the remaining v0.5 tools.

Two things that still shape any change:
- **The canvas is a seam.** `src/editor/Canvas/CanvasStage.tsx` mounts the imperative Konva
  engine (`src/editor/Canvas/engine/CanvasEngine.ts`); all canvas/engine logic lives behind
  that seam — don't scatter it through the chrome.
- **State is graduating from one reducer to Zustand stores.** The document model (layer
  stack + active layer) lives in `src/editor/state/documentStore.ts`, the undo timeline
  in `src/editor/state/undoStore.ts` (a stack of `Command`s — see `commands.ts`), the
  layer-preview cache in `src/editor/state/thumbnailStore.ts` (layerId → dataURL, fed by the
  engine — see Layers panel below), and the **canvas viewport** (zoom **+ pan**) in
  `src/editor/state/viewportStore.ts`. That was the last planned store — only **tool, brush
  params, colours (foreground + secondary; X swaps, D resets — `secondaryColor` is a painting
  colour-memory, *not* the document background), and panel chrome** remain in the local `useReducer`
  (`src/editor/state/useEditorState.ts`). The viewport store is the single source of truth for
  the view (`{zoom, panX, panY}` + the reported container size); `CanvasStage` applies it to the
  engine (`setView`) and routes navigation gestures back to it, with the *pure* view math in
  `engine/viewport.ts`. **View state is deliberately NOT persisted** in `.design` — it's
  per-session. **These stores are module singletons**, so tests reset them in `vitest.setup.ts`
  — any new store needs the same.

## Commands

```bash
pnpm dev              # run the editor (Vite) — the user runs this; don't auto-start it
pnpm test             # Vitest run — both projects (dom = jsdom, node = real-canvas pixel)
pnpm test:watch       # Vitest watch
pnpm test:coverage    # Vitest run with v8 coverage (no enforced threshold)
pnpm exec vitest run -t "selects a tool"   # run a single test by name
pnpm typecheck        # tsc -b --noEmit (type-check only; also the pre-commit gate)
pnpm lint             # Biome check (lint + format + import order)
pnpm format           # Biome auto-fix
pnpm build            # tsc -b (typecheck) + vite build
pnpm storybook        # component catalogue on :6006
pnpm build-storybook  # static Storybook build (CI runs this)
```

CI (`.github/workflows/ci.yml`) runs lint + test + build + build-storybook, then deploys
to Cloudflare Pages — preview per PR, production on push to `main`. Both deploys are
secret-guarded (skip gracefully without `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).

## Shipping workflow

Default fast path once a change is ready — keep it light, don't add ceremony:

1. **Branch** (never commit straight to `main`).
2. **Green the local gates:** `pnpm test`, `pnpm typecheck`, `pnpm lint` (+ `pnpm build` for
   anything non-trivial). Run them yourself — the pre-commit hook (lint+typecheck) and pre-push
   hook (test) are a backstop, not the check.
3. **Commit, push, open a PR.**
4. **Merge once CI is green** (squash + delete branch) — no need to ask for the merge each time.

Two load-bearing rules:

- **CI-green is the gate, not local `pnpm test`.** CI runs lint + test + build + build-storybook;
  local `pnpm test` alone is weaker (a change can pass it yet fail CI on a lint/format/import-order
  nit or a Storybook break). Wait for CI, then merge.
- **Canvas / engine / visual features need a `pnpm dev` walkthrough *before* merge.** The engine
  no-ops under jsdom, so automated tests cover the *pure logic* (stamp/transform/flatten/fill math,
  persistence round-trips) but never the live drag, paint, clip, or render. Non-visual work
  (state, chrome, persistence format, pure helpers) is fully covered by CI and can merge on green
  without a walkthrough.

## Architecture

- **`src/editor/`** — the shell, split by region: `TopBar/` (incl. `ToolProperties`, the
  dynamic per-tool zone), `LeftRail/`, `Canvas/`, `RightSidebar/`. `EditorV1.tsx` is the
  composition root — it owns the shell reducer, reads the document/undo stores, wraps layer
  ops in undo commands (`commands.ts`), and orchestrates save/open; regions are otherwise
  presentational. The Layers panel's `LayerThumb` shows a live pixel preview: the engine fires
  `onLayerPixelsChanged` after a buffer edit, `CanvasStage` turns it into a downscaled dataURL
  (`getLayerThumbnail` — trims to the layer's content bounds via `thumbnail.ts`/`contentBounds`,
  scaled to fill) in `thumbnailStore`, and the row reads it (a **blank layer shows an empty box** —
  no thumbnail). Note: pixel edits otherwise *don't* reach React — this signal is the one bridge,
  so reuse it rather than adding new ones.
- **`src/lib/tools.ts`** — the tool registry. Each tool has an `mvp` flag. The lone non-MVP
  tool (Text) is shown **dimmed with a "coming in v0.5" tooltip**, and keyboard shortcuts
  (`src/hooks/useKeyboardShortcuts.ts`) act on MVP tools only. Keep the rail and the
  shortcut map telling the same story.
- **`src/editor/types.ts`** — the layer model is intentionally thin (no `transform`,
  `bitmap`, or blend mode). Those are engine-phase; don't add them to make the shell "more
  real." The **Move tool's free transform upholds this**: a layer's `{x,y,scaleX,scaleY,rotation}`
  lives in the **engine** (a `Map<layerId, Transform>` in `CanvasEngine`, see `transform.ts`), *not*
  as a field on the model — "transforms are engine-phase." Non-uniform scale; skew/flip deferred.
  The one piece of *metadata* it does carry beyond the obvious is **`background?: boolean`** — the
  document's pinned **Background** layer: a real (locked) raster layer at the bottom of the stack,
  white by default, that can't be deleted / reordered / duplicated. The engine seeds its buffer
  white once on node creation (`syncLayers`); the Layers panel pins + locks its row; `documentStore`
  guards the delete/move/duplicate ops; it persists in `.design` like any layer (additive flag).
  **Distinct from the rail's `secondaryColor`** — that's a painting colour slot, this is the paper.
- **Design tokens (Tailwind v4, CSS-first):** `src/theme/base.tokens.css` holds the
  **shared** Boojy tokens (surfaces, text, semantics) in an `@theme` block;
  `src/theme/accent.design.css` holds the **per-product accent** (amber). Reskinning to
  another Boojy product = swap that one file. **Components use Tailwind utilities
  (`bg-chrome`, `text-fg-dim`, `bg-accent`), never inline hex** — change a value in the
  token file, not in a component.
- **Components:** `src/components/ui/` are shadcn-style Radix wrappers (Slider, Tooltip,
  DropdownMenu); `src/components/` are app primitives (Logo, NumChip, IconButton, PanelHead).

## Conventions & gotchas

- **TypeScript is strict** with `noUncheckedIndexedAccess` and `verbatimModuleSyntax` — use
  `import type` for type-only imports, and handle `arr[i]` as possibly `undefined`.
- **Biome does not lint CSS** (`!**/*.css` in `biome.json`): its parser can't read Tailwind
  v4's `@theme`. Don't re-enable it expecting CSS to format.
- **Radix needs polyfills under jsdom.** `vitest.setup.ts` stubs `ResizeObserver` and the
  pointer-capture APIs — without them every render that includes a Slider throws.
- **Tests target accessible queries** (roles, `aria-label`, `aria-selected`, `data-testid`
  on structural nodes like `sidebar-reserved`/`canvas-stage`). Prefer extending those over
  brittle class/DOM-shape assertions.
- **Two Vitest projects** (`vite.config.ts`): `dom` (jsdom — the shell/wiring tests, where
  the engine no-ops via the `getContext` stub) and `node` (`tests/pixel/**`, real
  `@napi-rs/canvas`, no setup stub). `pnpm test` runs both. To pixel-test engine drawing,
  extract the algorithm into a pure **ctx-taking** function (e.g. `flatten.ts`, `draw.ts`,
  `fit.ts`) and assert `getImageData` — don't try to instantiate the Konva-coupled engine in
  node. Cast the `@napi-rs` context to the DOM `CanvasRenderingContext2D` in tests.
- **Hooks + scripts:** `simple-git-hooks` runs `lint`+`typecheck` on pre-commit, `test` on
  pre-push (`pnpm prepare` installs them). Standalone `pnpm typecheck` (`tsc -b --noEmit`)
  and `pnpm test:coverage` (v8, no threshold) exist. Dependabot watches npm + actions weekly.
- **Keep the docs current.** When a change shifts project status, architecture, or roadmap
  (a new engine capability, a removed stub, a sequencing change), update `README.md` and
  this `CLAUDE.md` in the *same* change — don't let them drift from the code. The most
  stale-prone bits are the "What this is" / "Engine decision" / "Roadmap" sections here and
  the README's status + roadmap. A **shippable release** also bumps `version` in `package.json`
  and adds a `CHANGELOG.md` entry (Keep a Changelog format).
- **App version.** Surfaced in the Design menu via `__APP_VERSION__` — a Vite `define`
  (`vite.config.ts`) read from `package.json`, the single source of truth (bump there; the UI
  follows). It's **distinct** from the `.design` *file-format* version (`designFile.ts` `VERSION`).

## Engine decision (resolved)

The perf spike (`../konva-spike`) **passed** — **Konva is the chosen engine**. The brush
hot path clears 60fps at 2K/50 layers even with a naive single-composite redraw (Firefox
~9ms). Build notes the engine follows:
- Use the **naive single-composite path**; `layer.cache()` is **not** needed up front and
  was counterproductive in the spike (huge init/toggle cost). Reserve it for a measured ceiling.
- Pixi was tested and offers no advantage — stay on Konva (single dependency).
- The **memory ceiling is unvalidated** (the spike's heap metric missed canvas backing
  stores, ~800MB for 50×2K). Keep the 50-layer cap; tiling/dirty-tracking is later.

**The engine is in active development.** The brush hot path has shipped — a raster brush +
eraser paint to per-layer buffers on the naive single-composite path (1280×800 page; zoom
**and pan** drive the content layer's scale + position via `setView`). Pure stamp/viewport
math is unit-tested; the engine
capability-guards on `getContext` and no-ops under jsdom, so the shell tests stay green
without a canvas mock. Keep scope MVP-disciplined (see Roadmap).

## Roadmap (sequence intentionally — confirm scope before starting a new item)

Rough order, MVP first — **shipped:** canvas engine (Konva, brush hot path) + raster
brush/eraser (**hold Shift** = straight line from the press point to the cursor, snapped to
45° — `snapTo45` in `brush.ts`; `continueStroke` redraws the line each move like the shape
preview, anchored at `strokeOrigin`; pointer-move-driven, so no stationary-Shift toggle) +
editable foreground colour + PNG export (menu / ⌘E) + image import (Import
image… / drag-drop, fit-centered new layer; **not undoable** — adds a layer outside the
timeline) + layer ops (drag-reorder via dnd-kit, inline rename, duplicate-with-pixels, delete) +
a pinned, locked white **Background** layer (`Layer.background`; see the `types.ts` note above)
+ document model in Zustand (`documentStore`) + **unified undo/redo** (`undoStore`, a `Command`
stack — see `commands.ts`): strokes and every layer op share one linear timeline, including
**undo-delete** (the deleted layer's pixels are captured and replayed); plain layer selection
is deliberately *not* on the timeline + **persistence** — save/open `.design` files (⌘S / ⌘O,
`src/lib/designFile.ts`): JSON holding layer metadata + each layer's pixels as an embedded
base64 PNG; opening resets the undo timeline. **The menu's verbs:** Open… (⌘O) = a `.design`
document; Import image… = a bitmap layer; Save (⌘S) = `.design`; Export… (⌘E) = flattened PNG.
Plus the **Shape tool** (`shape.ts`): filled rect/ellipse rasterized to the active layer,
drag-to-size with a live preview, Shift constrains to a square/circle, undoable like a stroke
(it reuses the brush's snapshot→preview→commit path); shapes fill solid (no per-shape opacity
— use layer opacity). The rect/ellipse **picker is a floating panel** (`ShapeFlyout`, a detached
elevated card shown vertically-centred beside the rail while Shape is active — it floats, so the
canvas never shifts); the rail's Shape icon morphs to the chosen primitive, and only **Fill** stays
in the top bar. Plus the **Eyedropper** (`color.ts` + `CanvasEngine.sampleColorAt`): a rail tool
(`I`) that samples the visible composited colour under the cursor into the foreground (flattening
like export), then snaps back to the previous tool (`previousTool` + the `applySampledColor`
action); off-page clicks are no-ops. Plus the **Fill** tool (`fill.ts` + `CanvasEngine.fillAt`):
a rail bucket (`G`) that contiguous-flood-fills the active layer from the clicked point with the
foreground, a 0–100 **Tolerance** slider (top bar) controlling match looseness; active-layer-only,
undoable via the same commit path as a stroke. To avoid a fringe ring on soft strokes the fill
**composites the colour *under* the anti-aliased edge** ("fill behind"): it marches out from the
flood into the feather, blending the fill beneath each `0<alpha<255` pixel and halting at the
solid core and the transparent exterior. Plus the **Move tool** = a **free transform**
(`CanvasEngine`'s `select` branch of begin/continue/endStroke + `nudgeActiveLayer`; geometry in
`transform.ts`): a rail tool (`V`) that **non-destructively** moves, **scales** and **rotates** the
active layer via an **8-handle box** — corners scale W+H (proportional, **Shift** = free per-axis),
edge midpoints scale one axis, a grip rotates (Shift snaps 15°), and dragging inside the box moves.
It sets a per-layer **affine transform** `{x, y, scaleX, scaleY, rotation}` (`getLayerTransform`/
`setLayerTransform`, an engine-side `Map`) and applies it to the Konva image, so **pixels never
move inside their buffer**. The box wraps the layer's content (reuses `contentBounds`); a press
`hitTest`s the grip/handles/interior to pick rotate/scale(index 0–7)/move. **Cursors** are
handle-aware and *rotation-aware* (`resizeCursor` remaps `ns/ew/nesw/nwse` by 45° sectors; grip =
grab/grabbing) — the engine sets `container.style.cursor` on hover (`pointerHover`), so CanvasStage
leaves the cursor unset for `select`. Scale is **clamped positive (no flip)**. Drag off-page and
back and the hidden part survives; off-page pixels are *clipped to the page* (the content layer is
`clip`-bounded) on screen and in export, but kept in the buffer. Arrow keys nudge (1px, 10px with
Shift). Undoable via a cheap **transform command** (before/after `{x,y,scaleX,scaleY,rotation}`, no
pixel clone) — `setOnMoveCommitted` → `undoStore`. Because the buffer stays in its own local space,
paint ops are unchanged except the *input point* is run through `invert(transform, …)`
(brush/shape/fill), and **composite reads go through a transform-aware `flattenLayers`** (eyedropper,
export). The transform is saved in `.design` (additive `transform` field — legacy `scale`/`offsetX`
`/offsetY` still read), copied on duplicate, and restored on undo-delete (the `Map` entry outlives
the destroyed node; `syncLayers`
re-applies it). The selection box + 8 handles draw on a **screen-space overlay** layer so they stay
a constant size under zoom. Plus **viewport navigation** (`viewportStore` + `engine/viewport.ts`):
**scroll-to-pan**, **pinch / ⌘-scroll zoom-toward-cursor** (both arrive as `ctrlKey` wheel events),
**Space-drag** pan from any tool, the **Hand tool** (`H`) panning, and **⌘0 fit** / **⌘1 100%** (the
zoom % readout is a fit button); buttons + `+`/`-` step a **preset zoom ladder** (`ZOOM_STOPS`,
Chrome-like — finer near 100%) around the viewport centre, while pinch/scroll stays continuous. Zoom **+ pan**
live in `viewportStore` (the last reducer field to graduate); the math is pure + node-tested; view
state is **not** persisted. **Next:** the remaining v0.5 tools below. Then v0.5+: Move *skew / flip*
(negative scale), Text tool, blend modes. These aren't forbidden —
they're sequenced. Don't pile features onto the shell
all at once; the **8-feature MVP cap** is the discipline lever. As a side-project this sits
behind Igni / Boojy Audio / DELE — keep changes small and shippable.
