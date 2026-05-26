# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor, built incrementally as an **active side-project**.
This repo began as the **V1 "Classic" UI shell** — a pixel-faithful build of the chosen
layout (top bar, left tool rail, canvas area, right sidebar) with mock interactivity. That
shell shipped and is live, and the design direction is **confirmed**, so this is now the
**foundation for an actively-developed app**, not a throwaway. The Konva canvas engine has
now landed — a raster brush and eraser paint real pixels behind the canvas seam (see
"Engine decision" below); the MVP paint loop continues from there.

Two things that still shape any change:
- **The canvas is a seam.** `src/editor/Canvas/CanvasStage.tsx` mounts the imperative Konva
  engine (`src/editor/Canvas/engine/CanvasEngine.ts`); all canvas/engine logic lives behind
  that seam — don't scatter it through the chrome.
- **State is a local reducer for now.** All editor state is one `useReducer`
  (`src/editor/state/useEditorState.ts`). It graduates to the planned Zustand stores
  (document / undo / viewport) *as* engine + document state lands — introduce those with
  that work, not as a speculative refactor of the current shell.

## Commands

```bash
pnpm dev              # run the editor (Vite) — the user runs this; don't auto-start it
pnpm test             # Vitest run (jsdom)
pnpm test:watch       # Vitest watch
pnpm exec vitest run -t "selects a tool"   # run a single test by name
pnpm lint             # Biome check (lint + format + import order)
pnpm format           # Biome auto-fix
pnpm build            # tsc -b (typecheck) + vite build
pnpm storybook        # component catalogue on :6006
pnpm build-storybook  # static Storybook build (CI runs this)
```

CI (`.github/workflows/ci.yml`) runs lint + test + build + build-storybook, then deploys
to Cloudflare Pages — preview per PR, production on push to `main`. Both deploys are
secret-guarded (skip gracefully without `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).

## Architecture

- **`src/editor/`** — the shell, split by region: `TopBar/` (incl. `ToolProperties`, the
  dynamic per-tool zone), `LeftRail/`, `Canvas/`, `RightSidebar/`. `EditorV1.tsx` owns the
  reducer and passes state + handlers down; regions are otherwise presentational.
- **`src/lib/tools.ts`** — the tool registry. Each tool has an `mvp` flag. Non-MVP tools
  (Move, Text) are shown **dimmed with a "coming in v0.5" tooltip**, and keyboard shortcuts
  (`src/hooks/useKeyboardShortcuts.ts`) act on MVP tools only. Keep the rail and the
  shortcut map telling the same story.
- **`src/editor/types.ts`** — the layer model is intentionally thin (no `transform`,
  `bitmap`, or blend mode). Those are engine-phase; don't add them to make the shell "more
  real."
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
  the README's status + roadmap.

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
eraser paint to per-layer buffers on the naive single-composite path (1280×800 page, zoom
drives the Konva stage scale). Pure stamp/viewport math is unit-tested; the engine
capability-guards on `getContext` and no-ops under jsdom, so the shell tests stay green
without a canvas mock. Keep scope MVP-disciplined (see Roadmap).

## Roadmap (sequence intentionally — confirm scope before starting a new item)

Rough order, MVP first — **shipped:** canvas engine (Konva, brush hot path) + raster
brush/eraser + editable foreground colour + PNG export (menu / ⌘E) + undo/redo (strokes only;
engine-owned snapshot stack, layer ops not yet on the timeline) + image import (Open… /
drag-drop / ⌘O, fit-centered new layer, not undoable). **Next:** layer ops (reorder / rename /
duplicate); the document/layer model + Zustand stores graduate alongside these (and undo
widens to a unified timeline then).
Then v0.5+: Move/transform tool, Text tool, eyedropper, blend modes, persistence/`.design`
file format. These aren't forbidden — they're sequenced. Don't pile features onto the shell
all at once; the **8-feature MVP cap** is the discipline lever. As a side-project this sits
behind Igni / Boojy Audio / DELE — keep changes small and shippable.
