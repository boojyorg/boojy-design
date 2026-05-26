# Boojy Design — V1 shell

A pixel-faithful build of the **V1 "Classic"** Boojy Design editor UI (spec v0.1.2):
top bar, left tool rail, placeholder canvas, and collapsible right sidebar.

> **This is a validation artifact, not production code.** There is no canvas
> engine — no Konva, no brush pipeline, no file format. The canvas is a static
> placeholder behind a clean seam (`src/editor/Canvas/CanvasStage.tsx`). The
> point is to sit with the real chrome in a browser before committing to the
> engine. What's disposable: the state wiring (`useEditorState`) and the canvas.
> What carries forward: the component library and the design tokens.

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
- `src/editor/state/useEditorState.ts` — disposable local reducer (no Zustand yet).
- `src/components/` — reusable primitives (+ `ui/` shadcn-style Radix wrappers).
- `src/theme/base.tokens.css` — shared Boojy tokens; `accent.design.css` — the per-product amber (the single swap point for other Boojy products).

## What's intentionally deferred

Move tool + raster transforms (v0.5), Text tool (v0.5), eyedropper (v0.5), and
the entire canvas engine (gated behind a 1-day Konva spike). Non-MVP tools are
shown in the rail but dimmed with a "coming in v0.5" tooltip.
