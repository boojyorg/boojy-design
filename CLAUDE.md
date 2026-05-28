# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor built on the V1 "Classic" shell (top bar, left tool rail, canvas, right sidebar). The app is tagged **v0.4.0** — see `CHANGELOG.md`. **v0.4.0 is the MVP cap and MVP is now complete** — live text layers shipped (walkthrough passed, merged). Post-MVP items (see Roadmap) need a fresh milestone plan before starting.

Two things that still shape any change:

* **The canvas is a seam.** `src/editor/Canvas/CanvasStage.tsx` mounts the imperative Konva engine (`src/editor/Canvas/engine/CanvasEngine.ts`); all canvas/engine logic lives behind that seam — don't scatter it through the chrome.
* **State is split across Zustand stores.** `documentStore` (layer stack + active layer), `undoStore` (a `Command` stack — see `commands.ts`; strokes *and* layer ops share one timeline), `thumbnailStore` (layerId → dataURL, fed by `onLayerPixelsChanged`), `viewportStore` (zoom + pan; **not** persisted). These are module singletons — tests reset them in `vitest.setup.ts`; any new store needs the same. Only tool, brush params, colours, and panel chrome remain in the local `useReducer` (`useEditorState.ts`).

## Commands

```bash
pnpm dev              # run the editor (Vite) — the user runs this; don't auto-start it
pnpm test             # Vitest run — both projects (dom = jsdom, node = real-canvas pixel)
pnpm test:watch       # Vitest watch
pnpm test:coverage    # Vitest run with v8 coverage (no enforced threshold)
pnpm typecheck        # tsc -b --noEmit (type-check only; also the pre-commit gate)
pnpm lint             # Biome check (lint + format + import order)
pnpm format           # Biome auto-fix
pnpm build            # tsc -b (typecheck) + vite build
pnpm storybook        # component catalogue on :6006
pnpm build-storybook  # static Storybook build (CI runs this)
```

CI runs lint + test + build + build-storybook, then deploys to Cloudflare Pages (preview per PR, production on `main`; secret-guarded).

## Shipping workflow

1. **Branch** (never commit straight to `main`).
2. **Green the local gates:** `pnpm test`, `pnpm typecheck`, `pnpm lint` (+ `pnpm build` for non-trivial changes).
3. **Commit, push, open a PR.**
4. **Merge once CI is green** (squash + delete branch).

Two load-bearing rules:

* **CI-green is the gate, not local `pnpm test`.** CI also runs build + build-storybook; a change can pass `pnpm test` yet fail CI on a lint nit or Storybook break.
* **Canvas / engine / visual features need a `pnpm dev` walkthrough *before* merge.** The engine no-ops under jsdom, so automated tests cover pure logic but never live drag, paint, or render.

## Architecture

* **`src/editor/`** — shell split by region: `TopBar/`, `LeftRail/`, `Canvas/`, `RightSidebar/`. `EditorV1.tsx` is the composition root — owns the shell reducer, reads stores, wraps layer ops in undo commands, orchestrates save/open; regions are otherwise presentational.
* **`src/lib/tools.ts`** — tool registry with `mvp` flag. All tools including Text are now MVP; shortcuts fire for all active tools.
* **`src/editor/types.ts`** — the layer model is intentionally thin. Transforms (`{x,y,scaleX,scaleY,rotation}`) live in the engine (`Map<layerId, Transform>` in `CanvasEngine`), not the model — "transforms are engine-phase." Non-obvious metadata fields: **`background?: boolean`** — the locked white Background layer pinned at the bottom; **`textContent`, `fontSize`, `textColor`** — text-layer-only fields, serialized as metadata (no pixels). Text layers use a `Konva.Text` node in the engine and a `<textarea>` overlay in `CanvasStage` for live editing.
* **Design tokens (Tailwind v4):** `src/theme/base.tokens.css` holds shared Boojy tokens; `src/theme/accent.design.css` holds the per-product accent (amber — swap to reskin). Components use utilities (`bg-chrome`, `text-fg-dim`, `bg-accent`), never inline hex.
* **Components:** `src/components/ui/` are shadcn-style Radix wrappers; `src/components/` are app primitives.

## Conventions & gotchas

* **TypeScript is strict** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) — use `import type` for type-only imports; handle `arr[i]` as possibly `undefined`.
* **Biome does not lint CSS** (`!**/*.css` in `biome.json`) — its parser can't read Tailwind v4's `@theme`.
* **Radix needs polyfills under jsdom.** `vitest.setup.ts` stubs `ResizeObserver` and pointer-capture APIs.
* **Tests target accessible queries** (roles, `aria-label`, `data-testid`). Prefer those over brittle DOM-shape assertions.
* **Two Vitest projects** (`vite.config.ts`): `dom` (jsdom, engine no-ops via `getContext` stub) and `node` (`tests/pixel/`, real `@napi-rs/canvas`). To pixel-test engine drawing, extract the algorithm into a pure **ctx-taking** function (see `flatten.ts`, `selection.ts`) and assert `getImageData`. Cast `@napi-rs` contexts to the DOM type in tests. When a helper needs to allocate a canvas (like `copyRegion`), take the output canvas as a **caller-supplied parameter** so node tests can pass `createCanvas` instead of `document.createElement`.
* **Automated Validation Hooks:** `.claude/settings.json` wires a `PostToolUse` hook (`.claude/hooks/post-edit-validation.sh`) that runs Biome auto-fix → `typecheck` → `vitest related` after every `.ts`/`.tsx` edit. Do not bypass it.
* **Keep the docs current.** Architecture or roadmap changes update `README.md` and `CLAUDE.md` in the same commit. A shippable release bumps `version` in `package.json` and adds a `CHANGELOG.md` entry.
* **App version** is `__APP_VERSION__` (Vite `define` from `package.json`) — distinct from the `.design` file-format version in `designFile.ts`.
* **Memory Synchronization Rule:** Active workspace targets, unresolved terminal compilation failures, and manual UI testing bugs are centralized inside `dreams.md`. At the start of every session, read `dreams.md` to establish target context. Upon resolving an issue, update the corresponding markdown task checkbox from `- [ ]` to `- [x]`.
* **`viewportStore.zoom` is a percentage (0–100+), not a fraction (0–1).** Any screen-space scaling must use `zoom / 100`. Using `zoom` directly inflates sizes by 100×.

## Engine decision (resolved)

Konva is the chosen engine — the brush hot path clears 60fps at 2K/50 layers on the naive single-composite path. Use the **naive path**; `layer.cache()` was counterproductive in the spike. Memory ceiling is unvalidated (~800MB for 50×2K); keep the 50-layer cap.

## Roadmap (sequence intentionally — confirm scope before starting a new item)

### Shipped (v0.1–v0.2.1)

* **Brush & eraser** — raster paint; Shift = straight line snapped to 45°. Live brush-size cursor ring (white + black shadow, zoom-aware).
* **Layer opacity** — 0–100% slider in the layers panel; live during drag; single undo step per gesture; saved in `.design` and composited in PNG export.
* **Shape tool** — drag-to-size rect/ellipse rasterized to the active layer; Shift = square/circle; picker floats beside the rail.
* **Eyedropper** — samples composited colour under cursor into foreground, then snaps back to the previous tool.
* **Fill bucket** — contiguous flood fill with tolerance; composites under anti-aliased edges ("fill behind") to avoid a fringe ring.
* **Move / free transform** — non-destructive 8-handle box (scale, rotate, move); transforms live in the engine, pixels never move in their buffer. Drag past opposite edge = mirror; Flip H/V buttons mirror in place. Arrow-key nudge. Auto-selects the topmost non-transparent layer on click.
* **Marquee** (`M`) — rectangular region selection with marching-ants animation; ⌘C copy / ⌘X cut / ⌫ delete / ⌘V paste-as-new-layer; **Flip H/V** buttons in the top bar; **drag-to-float** cuts selected pixels to a temp overlay, drops as a new "Floated" layer on release (tool auto-switches to Move, both steps undoable); transform-aware copy/clear/flip via `copyRegion`/`clearRegion`/`flipRegion` in `selection.ts`.
* **Layers** — drag-reorder, rename, duplicate-with-pixels, delete, live thumbnails. Pinned locked **Background** layer at the bottom.
* **Unified undo/redo** — one `Command` stack for strokes and every layer op, including undo-delete with pixels.
* **Persistence** — save/open `.design` (JSON + per-layer base64 PNG); Export PNG (flattened); Image import.
* **Viewport navigation** — scroll-to-pan, pinch/⌘-scroll zoom-toward-cursor, Space-drag, Hand tool, preset zoom ladder, ⌘0 fit / ⌘1 100%.

### v0.4.0 — MVP cap (shipped — MVP complete)

* **Live text layers** — shipped. Click canvas to place; type; blur/tool-switch commits. Click an existing text layer with the Text tool to re-edit. Font size + color controls in the layers panel. Konva.Text node in the engine; `<textarea>` overlay in CanvasStage. Text serializes as metadata in `.design` (no pixels). Export composites via `ctx.fillText`. Undo captures whole content before/after commit. Font family picker, alignment, multi-line wrapping are post-MVP.

### Next up — Repo structure & quality pass (not a feature; plan before starting)

Post-MVP housekeeping to lower per-edit cost and merge pain before more features land. Do it in small, single-concern PRs, plan-mode first, keeping the `CanvasStage` → engine seam intact. Full checklist in `dreams.md` §1. Status:

* **Engine split — pure extractions done.** `CanvasEngine.ts` is now ~1530 lines (was 1636). Pure/ctx-taking logic lives in helper modules the engine delegates to: `text.ts` (measure/caret/draw), `stroke.ts` (`stampInto`/`compositeStroke` hot path), `thumbnail.ts` (`drawRasterThumbnail`/`drawTextThumbnail`), plus a shared `compositeToCanvas()` for export/sample. The stateful Konva orchestration (marquee/float, free-transform gesture, overlay/hit-test) intentionally stays in the engine.
* **Lint warnings — cleared.** The 2 `noNonNullAssertion` `target!` sites in `beginStroke`/`endStroke` are now narrowed with explicit guards; `pnpm lint` is warning-free.
* **Resolve the >500 KB bundle warning** — code-split the engine or raise the limit deliberately. *(pending)*
* **Conventions sweep** — indexed-access safety, `import type`, no inline hex, helper test coverage. *(pending)*

### Post-MVP features (deferred — don't start without a new milestone plan)

* Lasso / freehand selection
* Text formatting: font family picker, alignment (left/center/right), multi-line
* Blend modes (multiply, screen, overlay — significant engine work)
* Elliptical marquee
* Skew / shear (v1.0)
* Paint masking within selection

* **Context Hygiene Gate:** Monitor session capacity metrics continuously. When context utilization crosses 50% (or total warm cache reads cross 500k tokens), immediately pause active tool loops, notify the user, summarize the architecture vector delta, and automatically execute the `/compact` command.
