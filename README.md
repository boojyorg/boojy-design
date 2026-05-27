# Boojy Design — web image editor

A web image editor built on the **V1 "Classic"** layout (spec v0.1.2): top bar, left tool
rail, canvas, and collapsible right sidebar.

> **Status: active side-project.** The V1 UI shell shipped and is live, and the design
> direction is confirmed. The Konva canvas engine has now landed: a raster **brush and
> eraser** paint real pixels on a 1280×800 page in **any colour**, with **undo/redo**,
> **image import** (open or drag-drop) and **PNG export** — all behind a clean seam
> (`src/editor/Canvas/CanvasStage.tsx` → `src/editor/Canvas/engine/`). The document model
> (layers) now lives in a Zustand `documentStore`; the rest of the shell state is still a
> local reducer, graduating store by store as each piece of work lands.

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · **Konva** (canvas engine) · Tailwind v4 ·
shadcn-style Radix primitives · react-colorful · dnd-kit · Lucide · Vitest + Testing Library
(+ @napi-rs/canvas for real-canvas pixel tests) · Storybook · Biome · pnpm.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the editor locally (Vite) |
| `pnpm test` | Run all tests (Vitest — jsdom shell + node real-canvas projects) |
| `pnpm test:coverage` | Tests with a coverage report |
| `pnpm typecheck` | Type-check only (`tsc -b --noEmit`) |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome auto-format |
| `pnpm storybook` | Component catalogue on :6006 |
| `pnpm build` | Type-check + production build |
| `pnpm build-storybook` | Static Storybook build |

## Layout

- `src/editor/` — the editor, by region (`TopBar/`, `LeftRail/`, `Canvas/`, `RightSidebar/`).
- `src/editor/Canvas/engine/` — the imperative Konva engine behind the canvas seam (brush/eraser, per-layer pixel buffers, viewport math).
- `src/editor/state/documentStore.ts` — Zustand store for the document model (layer stack + active layer).
- `src/editor/state/useEditorState.ts` — local reducer for the rest of the shell (tool, brush, zoom, panel chrome).
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
