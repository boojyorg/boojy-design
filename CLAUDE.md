# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor built on the V1 "Classic" shell (top bar, left tool rail, canvas, right sidebar). The shell shipped and is confirmed; the Konva canvas engine has landed and the full MVP feature set is live. The app is tagged **v0.2.0** — see `CHANGELOG.md`.

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
* **`src/lib/tools.ts`** — tool registry with `mvp` flag. The lone non-MVP tool (Text) shows **dimmed with a tooltip**; shortcuts only fire for MVP tools.
* **`src/editor/types.ts`** — the layer model is intentionally thin. Transforms (`{x,y,scaleX,scaleY,rotation}`) live in the engine (`Map<layerId, Transform>` in `CanvasEngine`), not the model — "transforms are engine-phase." The one non-obvious metadata field is **`background?: boolean`** — the locked white Background layer pinned at the bottom, seeded white by the engine, guarded against delete/reorder/duplicate in `documentStore`.
* **Design tokens (Tailwind v4):** `src/theme/base.tokens.css` holds shared Boojy tokens; `src/theme/accent.design.css` holds the per-product accent (amber — swap to reskin). Components use utilities (`bg-chrome`, `text-fg-dim`, `bg-accent`), never inline hex.
* **Components:** `src/components/ui/` are shadcn-style Radix wrappers; `src/components/` are app primitives.

## Conventions & gotchas

* **TypeScript is strict** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) — use `import type` for type-only imports; handle `arr[i]` as possibly `undefined`.
* **Biome does not lint CSS** (`!**/*.css` in `biome.json`) — its parser can't read Tailwind v4's `@theme`.
* **Radix needs polyfills under jsdom.** `vitest.setup.ts` stubs `ResizeObserver` and pointer-capture APIs.
* **Tests target accessible queries** (roles, `aria-label`, `data-testid`). Prefer those over brittle DOM-shape assertions.
* **Two Vitest projects** (`vite.config.ts`): `dom` (jsdom, engine no-ops via `getContext` stub) and `node` (`tests/pixel/`, real `@napi-rs/canvas`). To pixel-test engine drawing, extract the algorithm into a pure **ctx-taking** function (see `flatten.ts`, `selection.ts`) and assert `getImageData`. Cast `@napi-rs` contexts to the DOM type in tests. When a helper needs to allocate a canvas (like `copyRegion`), take the output canvas as a **caller-supplied parameter** so node tests can pass `createCanvas` instead of `document.createElement`.
* **Multi-Model Tiering:** Default to **Sonnet 4-6** for standard work; **Haiku 4-5** for filesystem sweeps and minor edits; **Opus 4-7** only for heavy architectural pivots or complex rendering logic.
* **Automated Validation Hooks:** `.claude/settings.json` wires a `PostToolUse` hook (`.claude/hooks/post-edit-validation.sh`) that runs Biome auto-fix → `typecheck` → `vitest related` after every `.ts`/`.tsx` edit. Do not bypass it.
* **Keep the docs current.** Architecture or roadmap changes update `README.md` and `CLAUDE.md` in the same commit. A shippable release bumps `version` in `package.json` and adds a `CHANGELOG.md` entry.
* **App version** is `__APP_VERSION__` (Vite `define` from `package.json`) — distinct from the `.design` file-format version in `designFile.ts`.

## Engine decision (resolved)

Konva is the chosen engine — the brush hot path clears 60fps at 2K/50 layers on the naive single-composite path. Use the **naive path**; `layer.cache()` was counterproductive in the spike. Memory ceiling is unvalidated (~800MB for 50×2K); keep the 50-layer cap.

## Roadmap (sequence intentionally — confirm scope before starting a new item)

Shipped features (MVP cap = 8 features — the discipline lever, not a hard limit):

* **Brush & eraser** — raster paint; Shift = straight line snapped to 45°.
* **Shape tool** — drag-to-size rect/ellipse rasterized to the active layer; Shift = square/circle; picker floats beside the rail.
* **Eyedropper** — samples composited colour under cursor into foreground, then snaps back to the previous tool.
* **Fill bucket** — contiguous flood fill with tolerance; composites under anti-aliased edges ("fill behind") to avoid a fringe ring.
* **Move / free transform** — non-destructive 8-handle box (scale, rotate, move); transforms live in the engine, pixels never move in their buffer. Drag past opposite edge = mirror; Flip H/V buttons mirror in place. Arrow-key nudge. Auto-selects the topmost non-transparent layer on click.
* **Marquee** (`M`) — rectangular region selection with marching-ants animation; ⌘C copy / ⌘X cut / ⌫ delete / ⌘V paste-as-new-layer; transform-aware copy/clear via `copyRegion`/`clearRegion` in `selection.ts`; clipboard canvas is caller-allocated.
* **Layers** — drag-reorder, rename, duplicate-with-pixels, delete, live thumbnails. Pinned locked **Background** layer at the bottom.
* **Unified undo/redo** — one `Command` stack for strokes and every layer op, including undo-delete with pixels.
* **Persistence** — save/open `.design` (JSON + per-layer base64 PNG); Export PNG (flattened); Image import.
* **Viewport navigation** — scroll-to-pan, pinch/⌘-scroll zoom-toward-cursor, Space-drag, Hand tool, preset zoom ladder, ⌘0 fit / ⌘1 100%.

**Next:** remaining v0.5 tools. **Deferred:** Text tool (v0.5), blend modes (v0.5+), skew/shear (v1.0), lasso/elliptical marquee, paint masking within selection. Don't pile features on at once — keep changes small and shippable.
