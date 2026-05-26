# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is (read first)

Boojy Design is a web image editor. This repo is the **V1 "Classic" UI shell** — a
pixel-faithful build of the chosen layout (top bar, left tool rail, canvas area,
right sidebar) with **mock interactivity only**. It is a **validation artifact, not
production**: there is no canvas engine (no Konva, no brush pipeline, no file
format). Treat it as throwaway until the engine is greenlit.

Two consequences that should shape any change:
- **The canvas is a seam, not a feature.** `src/editor/Canvas/CanvasStage.tsx` renders
  a static placeholder. The real rendering engine plugs in *there* and the surrounding
  chrome should not need to change. Don't scatter canvas/engine logic elsewhere.
- **State is deliberately disposable.** All editor state is one `useReducer`
  (`src/editor/state/useEditorState.ts`). **Do not add Zustand, persistence, or a
  document schema** — those are engine-phase and will replace this hook wholesale.

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

## Deferred (do not build without an explicit ask)

The canvas engine (Konva — gated behind a 1-day perf spike: 50 layers @ 2K, ≥60fps brush),
Zustand stores, real persistence/file format, the Move/transform tool, eyedropper, and the
Text tool are all **v0.5+ / engine-phase**. Adding any of them to the shell is scope creep.
