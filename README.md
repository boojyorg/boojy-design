# Boojy Design — V1 shell

A pixel-faithful build of the **V1 "Classic"** Boojy Design editor UI (spec v0.1.2):
top bar, left tool rail, canvas, and collapsible right sidebar.

> **Status: active side-project.** The V1 UI shell shipped and is live, and the design
> direction is confirmed. The Konva canvas engine has now landed: a raster **brush and
> eraser** paint real pixels on a 1280×800 page in **any colour**, with **undo/redo**,
> **image import** (open or drag-drop) and **PNG export** — all behind a clean seam
> (`src/editor/Canvas/CanvasStage.tsx` → `src/editor/Canvas/engine/`). State is a local
> reducer for now and graduates to Zustand as the full document model lands.

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

- `src/editor/` — the editor, by region (`TopBar/`, `LeftRail/`, `Canvas/`, `RightSidebar/`).
- `src/editor/Canvas/engine/` — the imperative Konva engine behind the canvas seam (brush/eraser, per-layer pixel buffers, viewport math).
- `src/editor/state/useEditorState.ts` — local reducer (graduates to Zustand with the document model).
- `src/components/` — reusable primitives (+ `ui/` shadcn-style Radix wrappers).
- `src/theme/base.tokens.css` — shared Boojy tokens; `accent.design.css` — the per-product amber (the single swap point for other Boojy products).

## Roadmap

Shipped: the Konva canvas engine — a raster **brush + eraser** (1280×800 page, per-layer
buffers, zoom-as-stage-scale), an editable **foreground colour** picker, **undo/redo** of
strokes (Cmd+Z / Cmd+Shift+Z), **image import** (Open… / drag-drop / ⌘O), **PNG export**
(Design menu or ⌘E), and **layer ops** — drag-to-reorder, inline rename, duplicate. That
rounds out the MVP paint loop. After MVP (v0.5+):
Move tool + raster transforms, Text, eyedropper, blend modes. Non-MVP tools already appear in
the rail, dimmed with a "coming in v0.5" tooltip. Sequenced, not piled on at once — the
8-feature MVP cap is the discipline lever.
