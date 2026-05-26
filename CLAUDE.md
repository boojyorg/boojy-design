# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor, built incrementally as an **active side-project**.
This repo began as the **V1 "Classic" UI shell** — a pixel-faithful build of the chosen
layout (top bar, left tool rail, canvas area, right sidebar) with mock interactivity. That
shell shipped and is live, and the design direction is **confirmed**, so this is now the
**foundation for an actively-developed app**, not a throwaway. There's no canvas engine
*yet*; building it (Konva — see "Engine decision" below) is the next step.

Two things that still shape any change:
- **The canvas is a seam.** `src/editor/Canvas/CanvasStage.tsx` renders a static
  placeholder today; the Konva engine plugs in *there*. Keep canvas/engine logic behind
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

## Engine decision (resolved)

The perf spike (`../konva-spike`) **passed** — **Konva is the chosen engine**. The brush
hot path clears 60fps at 2K/50 layers even with a naive single-composite redraw (Firefox
~9ms). Build notes for when the engine starts:
- Use the **naive single-composite path**; `layer.cache()` is **not** needed up front and
  was counterproductive in the spike (huge init/toggle cost). Reserve it for a measured ceiling.
- Pixi was tested and offers no advantage — stay on Konva (single dependency).
- The **memory ceiling is unvalidated** (the spike's heap metric missed canvas backing
  stores, ~800MB for 50×2K). Keep the 50-layer cap; tiling/dirty-tracking is later.

**The engine is now in active development** — the project is no longer parked until July;
it's being built incrementally as a side-project. Start with the brush hot path on the
naive composite (notes above), and keep scope MVP-disciplined (see Roadmap).

## Roadmap (sequence intentionally — confirm scope before starting a new item)

Rough order, MVP first: canvas engine (Konva, **brush hot path first**) → document/layer
model + Zustand stores → raster brush/eraser → image import → layer ops → PNG export.
Then v0.5+: Move/transform tool, Text tool, eyedropper, blend modes, persistence/`.design`
file format. These aren't forbidden — they're sequenced. Don't pile features onto the shell
all at once; the **8-feature MVP cap** is the discipline lever. As a side-project this sits
behind Igni / Boojy Audio / DELE — keep changes small and shippable.
