# Boojy Design — web image editor

A web image editor built on the **V1 "Classic"** layout (spec v0.1.2): top bar, left tool
rail, canvas, and collapsible right sidebar.

> **Status: active side-project.** The V1 UI shell shipped and is live, and the design
> direction is confirmed. The Konva canvas engine has now landed: a raster **brush and
> eraser** paint real pixels on a 1280×800 page in **any colour**, with **unified undo/redo**,
> **image import** (open or drag-drop), **PNG export**, and **save/open** of `.design`
> documents — all behind a clean seam
> (`src/editor/Canvas/CanvasStage.tsx` → `src/editor/Canvas/engine/`). The document model
> (layers) lives in a Zustand `documentStore` and the canvas viewport (zoom + pan) in a
> `viewportStore`; only tool/brush/panel-chrome state is still a local reducer.

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
- `src/editor/state/undoStore.ts` — Zustand undo/redo timeline (a stack of commands; see `commands.ts`).
- `src/editor/state/viewportStore.ts` — Zustand store for the canvas viewport (zoom + pan; pure math in `engine/viewport.ts`).
- `src/editor/state/useEditorState.ts` — local reducer for the rest of the shell (tool, brush, panel chrome).
- `src/lib/designFile.ts` — `.design` save/open format (layer metadata + embedded base64 PNGs).
- `src/components/` — reusable primitives (+ `ui/` shadcn-style Radix wrappers).
- `src/theme/base.tokens.css` — shared Boojy tokens; `accent.design.css` — the per-product amber (the single swap point for other Boojy products).

## Roadmap

Shipped: the Konva canvas engine — a raster **brush + eraser** (1280×800 page, per-layer
buffers), an editable **foreground colour** picker, **image import**
(Import image… / drag-drop), **PNG export** (Design menu or ⌘E), **layer ops** — drag-to-reorder,
inline rename, duplicate, delete — a **unified undo/redo** timeline (Cmd+Z / Cmd+Shift+Z)
where strokes and every layer op share one history (including undo-delete with pixels intact),
**save/open** of `.design` documents (⌘S / ⌘O — JSON with each layer's pixels embedded as a
base64 PNG), and a **Shape tool** — drag to draw a filled rectangle or ellipse on the active
layer (Shift constrains to a square/circle), undoable like any stroke; the rect/ellipse picker
floats in a panel beside the tool rail, and the rail icon shows the chosen shape. That rounds out the MVP
paint loop, plus an **eyedropper** (press `I`) that samples a colour from the canvas into the
foreground and snaps back to your previous tool, and a **fill** bucket (press `G`) that
flood-fills the clicked region of the active layer with the foreground (Tolerance slider for
match looseness), and a **Move tool** (press `V`) — a **free transform** with an 8-handle box:
**corners** scale width+height (proportional; Shift = free), **edges** scale one axis, a **grip**
rotates (Shift snaps to 15°), and dragging inside moves. It's **non-destructive** — it changes
where the layer is *drawn* without touching its pixels, so dragging off the page hides the overflow
but keeps it, and undo/redo step through each transform. Context-aware cursors (rotation-aware);
arrow keys nudge (10px holding Shift); export and `.design` files honour the transform.
The **Layers panel shows live thumbnails** — each layer's content, trimmed to fill the box,
refreshing as you edit (blank layers read empty). And **canvas navigation** that feels like a
real editor: **scroll to pan**, **pinch / ⌘-scroll to zoom toward the cursor**, hold **Space**
(or the **Hand** tool, `H`) to drag-pan, and **⌘0** to fit / **⌘1** for 100% (click the zoom %
to fit). Zoom + pan live in `viewportStore`; the view is per-session and isn't saved in
`.design`. After MVP (v0.5+): skew/flip,
Text, blend modes. The lone
non-MVP tool (Text) appears in the rail, dimmed with a "coming in v0.5" tooltip. Sequenced,
not piled on at once — the 8-feature MVP cap is the discipline lever.
