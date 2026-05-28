# Boojy Design — web image editor

[![CI](https://github.com/tyrbujac/boojy-design/actions/workflows/ci.yml/badge.svg)](https://github.com/tyrbujac/boojy-design/actions/workflows/ci.yml)
[![version](https://img.shields.io/badge/version-0.2.1-E89940)](./CHANGELOG.md)

A web image editor built on the **V1 "Classic"** layout: top bar, left tool rail, canvas, and a
collapsible right sidebar.

> **Status: active side-project (v0.2.1).** The UI shell is live and the design direction is
> confirmed. The Konva canvas engine has landed and the MVP paint loop works — paint, shapes, fill,
> layers, transform, selection, undo/redo, import/export, and `.design` save/open — all behind a
> clean seam (`CanvasStage` → `Canvas/engine/`).

## Features

- **Paint** — raster brush & eraser in any colour (size · hardness · opacity; **Shift** = a
  straight line snapped to 45°); a flood-**fill** bucket with a tolerance slider; an
  **eyedropper** that samples the colour under the cursor.
- **Colours** — foreground + secondary swatches in the rail; **X** swaps them, **D** resets to
  black/white. (Painting always uses the foreground; the secondary is a colour-memory slot.)
- **Shapes** — drag a filled rectangle or ellipse onto the active layer (Shift → square/circle).
- **Move / transform** — a non-destructive 8-handle free transform: proportional corners (Shift =
  free), single-axis edges, a rotate grip (15° snap), drag-inside to move; rotation-aware cursors and
  arrow-key nudges. Drag any handle **past the opposite edge to mirror** the layer; **Flip H / Flip V**
  buttons in the top bar mirror in place about the content centre. Pixels never leave their buffer.
- **Layers** — add, reorder (drag), rename, duplicate (with pixels), delete, toggle visibility,
  adjust **opacity** (0–100% slider in the sidebar, undoable), with a live thumbnail per layer.
  Every document opens with a locked white **Background** layer pinned at the bottom (recolour it
  by filling it; it saves/exports like any layer).
- **Undo/redo** — one unified timeline across strokes *and* every layer op (incl. undo-delete with
  pixels intact): ⌘Z / ⌘⇧Z.
- **Document** — import images (open or drag-drop), save/open `.design` files (⌘S / ⌘O), export
  PNG (⌘E).
- **Marquee** — drag a rectangle to select a region (`M`); marching-ants animation tracks the
  selection. **⌘C** copy · **⌘X** cut · **⌫** delete the selected pixels (all undoable) ·
  **⌘V** paste as a new layer · **Flip H/V** buttons in the top bar mirror the selection in place ·
  **drag inside the selection** to lift pixels as a floating overlay and drop them as a new layer
  at the destination (switches to Move tool with handles active; both steps undoable). Escape or
  an empty click clears the selection; switching tools clears it automatically.
- **Navigation** — scroll to pan · pinch / ⌘-scroll to zoom toward the cursor · Space-drag or the
  Hand tool to pan · a preset zoom ladder on +/- · ⌘0 fit / ⌘1 100%.

## Architecture

The chrome is presentational; all canvas work lives behind one seam, and state is split across
small Zustand stores.

```
  Chrome  (TopBar · LeftRail · RightSidebar)      presentational — props only
     │
     ├─ documentStore    layer stack + active layer       ┐
     ├─ undoStore        one undo/redo timeline            │  Zustand
     ├─ viewportStore    zoom + pan                        │  (module singletons)
     └─ useEditorState   tool · brush · chrome (reducer)   ┘
     │
     ▼
  CanvasStage   ── the seam: the only bridge to the engine
     │  imperative calls; per-pixel edits never round-trip through React
     ▼
  CanvasEngine (Konva)   ── per-layer pixel buffers · single-composite render
     brush · eraser · shape · fill · eyedropper · move/transform · flatten/export
```

Key paths: `src/editor/` (regions), `src/editor/Canvas/engine/` (the engine + pure math —
`viewport.ts`, `transform.ts`, `flatten.ts`, `fill.ts`, `selection.ts`), `src/editor/state/`
(the stores), `src/lib/designFile.ts` (the `.design` format), `src/theme/` (Tailwind v4 tokens
— swap `accent.design.css` to reskin for another Boojy product).

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · **Konva** · Tailwind v4 · shadcn-style Radix primitives ·
react-colorful · dnd-kit · Lucide · Vitest + Testing Library (+ @napi-rs/canvas for real-canvas pixel
tests) · Storybook · Biome · pnpm.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the editor locally (Vite) |
| `pnpm test` | Run all tests (jsdom shell + node real-canvas projects) |
| `pnpm test:coverage` | Tests with a coverage report |
| `pnpm typecheck` | Type-check only (`tsc -b --noEmit`) |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome auto-format |
| `pnpm storybook` | Component catalogue on :6006 |
| `pnpm build` | Type-check + production build |
| `pnpm build-storybook` | Static Storybook build |

## What's next

- **Text tool** — present in the rail, dimmed (`coming in v0.5`).
- **Blend modes** (per-layer).
- **Marquee: paint masking** — constrain brush/fill/eraser to the selected region (deferred from v0.2).
- Later: lasso selection, gradients, and tiling for larger documents.
- Move **skew** (shear) deferred to v1.0.

Features are sequenced deliberately — an 8-feature MVP cap is the discipline lever, not a hard limit.
Full history in [CHANGELOG.md](./CHANGELOG.md).

## Project health

- **Tests:** 175 across two Vitest projects — `dom` (jsdom shell/wiring, engine no-ops) and `node`
  (real `@napi-rs/canvas` pixel tests for the engine math, incl. `selection.test.ts`).
- **CI:** every push/PR runs lint → test → build → build-storybook, then deploys to Cloudflare Pages
  (preview per PR, production on `main`; secret-guarded).
- **Gates:** Biome (lint/format/import order), strict TypeScript, pre-commit (lint + typecheck) and
  pre-push (test) hooks, Dependabot weekly.
- **Known limits:** naive single-composite render with a 50-layer cap; memory ceiling unvalidated
  (~800 MB estimated at 50 × 2K); tiling / dirty-rect tracking deferred; transforms cover
  scale + rotate + flip; skew deferred.
