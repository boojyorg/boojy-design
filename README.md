# Boojy Design — V1 shell

A pixel-faithful build of the **V1 "Classic"** Boojy Design editor UI (spec v0.1.2):
top bar, left tool rail, placeholder canvas, and collapsible right sidebar.

> **Status: active side-project.** The V1 UI shell shipped and is live, and the design
> direction is confirmed — so this is now the foundation for an incrementally-built app,
> not a throwaway. There's no canvas engine *yet*: the canvas is a static placeholder
> behind a clean seam (`src/editor/Canvas/CanvasStage.tsx`), and Konva (confirmed by a
> perf spike) is the next thing in. State is a local reducer for now and graduates to
> Zustand as the engine lands.

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · Tailwind v4 · shadcn-style Radix
primitives · Lucide · Vitest + Testing Library · Storybook · Biome · pnpm.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the editor locally (Vite) |
| `pnpm test` | Run the interaction tests (Vitest + RTL) |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome auto-format |
| `pnpm storybook` | Component catalogue on :6006 |
| `pnpm build` | Type-check + production build |
| `pnpm build-storybook` | Static Storybook build |

## Layout

- `src/editor/` — the V1 shell, by region (`TopBar/`, `LeftRail/`, `Canvas/`, `RightSidebar/`).
- `src/editor/state/useEditorState.ts` — local reducer (graduates to Zustand with the engine).
- `src/components/` — reusable primitives (+ `ui/` shadcn-style Radix wrappers).
- `src/theme/base.tokens.css` — shared Boojy tokens; `accent.design.css` — the per-product amber (the single swap point for other Boojy products).

## Roadmap

Next: the canvas engine (Konva — spike-confirmed), then the MVP paint loop (raster
brush/eraser, image import, layers, PNG export). After MVP (v0.5+): Move tool + raster
transforms, Text, eyedropper, blend modes. Non-MVP tools already appear in the rail,
dimmed with a "coming in v0.5" tooltip. Sequenced, not piled on at once — the 8-feature
MVP cap is the discipline lever.
