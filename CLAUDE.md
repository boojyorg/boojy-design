# CLAUDE.md

Local guidance for Boojy Design. **Suite-wide process/conventions live in the root
`~/Documents/Projects/boojy/CLAUDE.md`** (memory model, changelog/release, branch discipline,
context-hygiene, working prefs); this file is the app-specific architecture, stack, and gotchas.

## What this is (read first)

Boojy Design is a web image editor built on the V1 "Classic" shell (top bar, left tool rail, canvas, right sidebar). The app is tagged **v0.4.0** — see `CHANGELOG.md`. **v0.4.0 is the MVP cap and MVP is now complete** — live text layers shipped (walkthrough passed, merged). Post-MVP items (see `docs/ROADMAP.md` + `docs/BACKLOG.md`) need a fresh milestone plan before starting; the 2026-06-08 architecture & visual review (`docs/reviews/2026-06-08-architecture-visual-review.md`) logged the findings — including two high-priority correctness items (text-undo gaps, unbounded layer memory) — into `docs/BACKLOG.md`, and should feed that triage.

Two things that still shape any change:

* **The canvas is a seam.** `src/editor/Canvas/CanvasStage.tsx` mounts the imperative Konva engine (`src/editor/Canvas/engine/CanvasEngine.ts`); all canvas/engine logic lives behind that seam — don't scatter it through the chrome.
* **State is split across Zustand stores.** `documentStore` (layer stack + active layer), `undoStore` (a `Command` stack — see `commands.ts`; strokes *and* layer ops share one timeline), `thumbnailStore` (layerId → dataURL, fed by `onLayerPixelsChanged`), `viewportStore` (zoom + pan; **not** persisted). These are module singletons — tests reset them in `vitest.setup.ts`; any new store needs the same. Only tool, brush params, colours, and panel chrome remain in the local `useReducer` (`useEditorState.ts`).

## Commands

```bash
pnpm dev              # run the editor (Vite)
pnpm test             # Vitest run — both projects (dom = jsdom, node = real-canvas pixel)
pnpm test:watch       # Vitest watch
pnpm test:visual      # Playwright visual-regression — live headless Chromium vs stored master PNG
pnpm test:coverage    # Vitest run with v8 coverage (no enforced threshold)
pnpm typecheck        # tsc -b --noEmit (type-check only; also the pre-commit gate)
pnpm lint             # Biome check (lint + format + import order)
pnpm format           # Biome auto-fix
pnpm build            # tsc -b (typecheck) + vite build
pnpm storybook        # component catalogue on :6006
pnpm build-storybook  # static Storybook build (CI runs this)
```

CI runs lint + test + build + build-storybook, then deploys to Cloudflare Pages (preview per PR, production on `main`; secret-guarded).

## Shipping (repo-specific)

General branch discipline + release flow → root `CLAUDE.md`. Local gates: `pnpm test`, `pnpm typecheck`, `pnpm lint` (+ `pnpm build` for non-trivial changes). Three load-bearing rules on top:

* **CI-green is the gate, not local `pnpm test`.** CI also runs build + build-storybook; a change can pass `pnpm test` yet fail CI on a lint nit or Storybook break.
* **Canvas / engine / visual features need a `pnpm dev` walkthrough *before* merge.** The engine no-ops under jsdom, so Vitest covers pure logic but never live drag, paint, or render. `pnpm test:visual` (Playwright, `tests/visual/`) now *automates the regression half* — it replays the documented smiley-face sequence in real headless Chromium and pixel-diffs the **`canvas-stage` element** (centre editor column, *not* the full viewport — so toolbar/panel restyles can't break it) against `tests/visual-snapshots/smiley-face-master.png` (<1% budget; ~0% run-to-run since the master is self-captured). Regenerate the master after an intentional canvas change with `UPDATE_MASTER=1 pnpm test:visual`. It needs a dev server (reuses your `:5173`, else spawns one) + the Chromium download, so it's **not in CI** and **not in `pnpm test`** — run it locally for canvas changes. It catches *regressions of the known composition*; a genuinely new visual still needs the manual walkthrough (and a fresh master).
* **Stack PRs that touch the same file.** When a milestone needs several single-concern PRs that edit the same module or the docs (e.g. the quality pass: #26→#27→#28), branch each off the previous and stack them — parallel branches off `main` collide on that file. Retarget each base down to `main` as the one below it squash-merges.
  * **Merging a stack — order matters, and don't `--delete-branch` early.** Deleting a PR's base branch **auto-closes** any child PR stacked on it (and a closed PR can't be reopened once its base is gone). So either (a) retarget every child's base to `main` *first*, then merge bottom-up, or (b) merge bottom-up and only `--delete-branch` once nothing is stacked on it. After each squash-merge, the merged work lands on `main` as a *new* commit, so rebase the next branch with `git rebase --onto main <old-base-sha>` before its PR (otherwise its diff re-shows the lower changes). Learned the hard way: a careless `--delete-branch` on #26 closed #27/#28 and forced reopening them as #29/#30.

## Architecture

* **`src/editor/`** — shell split by region: `TopBar/`, `LeftRail/`, `Canvas/`, `RightSidebar/`. `EditorV1.tsx` is the composition root — owns the shell reducer, reads stores, wraps layer ops in undo commands, orchestrates save/open; regions are otherwise presentational.
* **`src/lib/tools.ts`** — tool registry with `mvp` flag. All tools including Text are now MVP; shortcuts fire for all active tools.
* **`src/editor/types.ts`** — the layer model is intentionally thin. Transforms (`{x,y,scaleX,scaleY,rotation}`) live in the engine (`Map<layerId, Transform>` in `CanvasEngine`), not the model — "transforms are engine-phase." Non-obvious metadata fields: **`background?: boolean`** — the locked white Background layer pinned at the bottom; **`textContent`, `fontSize`, `textColor`** — text-layer-only fields, serialized as metadata (no pixels). Text layers use a `Konva.Text` node in the engine and a `<textarea>` overlay in `CanvasStage` for live editing. The shared text-layer default fill is **`DEFAULT_TEXT_COLOR`** here — single source; the store, persistence, engine and colour picker all import it (don't re-hardcode `#000000`).
* **`src/editor/Canvas/engine/`** — the engine is **hub-and-spoke**: `CanvasEngine.ts` (~1540 lines) owns the Konva Stage + per-layer pixel/text/transform state and delegates to pure / ctx-taking helper modules, each with a `tests/pixel/` test — `brush.ts`, `stroke.ts` (`stampInto`/`compositeStroke` hot path), `text.ts` (measure/caret/`drawText`), `thumbnail.ts` (`contentBounds` + draw helpers), `transform.ts`, `selection.ts`, `flatten.ts`, `shape.ts`, `fill.ts`, `color.ts`, `viewport.ts`. **Don't assume the engine is "small" because it was split** — the win is that the extracted concerns are cheap to edit (50–240 line files), not raw size. The **stateful Konva orchestration still inside `CanvasEngine.ts` (marquee/float, free-transform gesture, overlay/hit-test, ~600 lines) is the next split target** and needs the controller-class approach, not pure extraction.
* **Design tokens (Tailwind v4):** `src/theme/base.tokens.css` holds shared Boojy tokens; `src/theme/accent.design.css` holds the per-product accent (amber — swap to reskin). Components use utilities (`bg-chrome`, `text-fg-dim`, `bg-accent`), never inline hex.
* **Components:** `src/components/ui/` are shadcn-style Radix wrappers; `src/components/` are app primitives.

## Conventions & gotchas

* **TypeScript is strict** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`) — use `import type` for type-only imports; handle `arr[i]` as possibly `undefined`.
* **Biome does not lint CSS** (`!**/*.css` in `biome.json`) — its parser can't read Tailwind v4's `@theme`.
* **Radix needs polyfills under jsdom.** `vitest.setup.ts` stubs `ResizeObserver` and pointer-capture APIs.
* **Tests target accessible queries** (roles, `aria-label`, `data-testid`). Prefer those over brittle DOM-shape assertions.
* **Two Vitest projects** (`vite.config.ts`): `dom` (jsdom, engine no-ops via `getContext` stub) and `node` (`tests/pixel/`, real `@napi-rs/canvas`). To pixel-test engine drawing, extract the algorithm into a pure **ctx-taking** function (see `flatten.ts`, `selection.ts`) and assert `getImageData`. Cast `@napi-rs` contexts to the DOM type in tests. When a helper needs to allocate a canvas (like `copyRegion`), take the output canvas as a **caller-supplied parameter** so node tests can pass `createCanvas` instead of `document.createElement`.
* **Automated Validation Hook:** `.claude/settings.json` wires a `PostToolUse` hook (`.claude/hooks/post-edit-validation.sh`) that runs Biome auto-fix → `typecheck` → `vitest related` after every `.ts`/`.tsx` edit. Do not bypass it. During a multi-file refactor it may flag _transient_ mid-edit typecheck failures (an import added one edit before its use, a symbol mid-relocation) — those are intermediate states, not real incidents; they clear once the change's gates are green again.
* **Bundle (Vite 8 = rolldown):** Konva is isolated into its own vendor chunk via `build.rollupOptions.output.manualChunks` in `vite.config.ts` (keeps both chunks under the 500 KB warn limit; cache survives app-code redeploys). `manualChunks` still works under rolldown — no need for the `rolldownOptions`/`advancedChunks` API the warning suggests.
* **`FEATURES.md`** is the plain-language, recruiter/user-facing feature tour (ASCII mockups, no `src/` paths) — jargon-free; internals belong in `README.md`/`CLAUDE.md`. When a feature ships, update **both** `FEATURES.md` (prose) and `docs/FEATURE_TRACKER.md` (status). (General keep-docs-current rule → root.)
* **App version** is `__APP_VERSION__` (Vite `define` from `package.json`) — distinct from the `.design` file-format version in `designFile.ts`.
* **`viewportStore.zoom` is a percentage (0–100+), not a fraction (0–1).** Any screen-space scaling must use `zoom / 100`. Using `zoom` directly inflates sizes by 100×.

## Engine decision (resolved)

Konva is the chosen engine — the brush hot path clears 60fps at 2K/50 layers on the naive single-composite path. Use the **naive path**; `layer.cache()` was counterproductive in the spike. Memory ceiling is unvalidated (~800MB for 50×2K); keep the 50-layer cap.
