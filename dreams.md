# DREAMS.md — Boojy Design Intent Buffer & Devlog

## 1. 🎯 Active Engineering Target — Repo structure & quality pass (post-MVP)

**Goal (set 2026-05-28, for next session):** MVP is shipped (v0.4.0). Before adding more features, do a deliberate **structure + quality pass** to lower the per-edit cost, reduce merge pain, and tidy the codebase. This is housekeeping, not new features — confirm scope/sequencing at the start of the session before touching code.

> ⚠️ **Plan first.** This is a multi-file refactor touching the load-bearing engine. Use plan mode, agree the seams, and do it in small reviewable PRs (one concern each) — not one big-bang branch. Keep the `CanvasStage` → engine seam intact.

### Candidate work (prioritise at session start — roughly highest-leverage first)

- [ ] **Split `CanvasEngine.ts` (~1400 lines).** It is both the biggest cost driver (hook re-reads the whole file every edit; 31% of usage is >150k context) **and** the merge hotspot (this session's 8-file conflict centred on it). Proposed seams, extracted as pure/ctx-taking modules behind the engine: (a) text-node logic, (b) selection/region ops, (c) transform math, (d) stroke/paint hot path. Verify pixel tests still pass per extraction.
- [ ] **Clear the 2 standing lint warnings** — `noNonNullAssertion` at `CanvasEngine.ts:420` (`target!.canvas`) and `:803` (`target!.canvas`). Replace `target!` with a proper guard/destructure (these have ridden along as warnings since before this session).
- [ ] **Bundle size** — `pnpm build` warns the main chunk is >500 KB (≈637 KB / 197 KB gzip), Konva dominates. Decide: code-split (dynamic import the engine) vs. raise `chunkSizeWarningLimit` deliberately. Don't leave it as an unexplained warning.
- [ ] **Conventions sweep** — confirm `noUncheckedIndexedAccess` handling, `import type` usage, no inline hex (design tokens only), and that pure helpers have node/dom test coverage. Small, mechanical — good Haiku work.
- [ ] **Merge hygiene note** — the opacity duplication conflict happened because the branch outlived a `main` advance (#24 squash-merged the same feature). Going forward: merge/rebase `main` into long branches frequently, and squash-merge promptly so the same work doesn't land twice.

---

### ✅ Shipped — v0.4.0 MVP (live text layers + layer opacity)

#### Step 1 — Layer opacity ✅

- [x] `opacity: number` (0–100) already in `Layer` type, `addLayer`, `pasteLayer`, `designFile` (serialize + deserialize)
- [x] `documentStore`: `setLayerOpacity(id, opacity)` added
- [x] Engine (`CanvasEngine`): already applied `node.image.opacity(layer.opacity / 100)` in `syncLayers`
- [x] Sidebar: opacity slider above layer list (hidden for Background); live drag via `onLiveOpacity` → `setLayerOpacity`; `onCommitOpacity` records one undo step with before captured via `onPointerDown` ref
- [x] `pnpm dev` walkthrough: drag opacity slider, verify compositing, undo/redo ✅

#### Step 2 — Live text layers (engine + chrome)

- [x] Add `"text"` to `LayerType`; text fields (`textContent`, `fontSize`, `textColor`) on `Layer`
- [x] `documentStore`: `addTextLayer`, `setLayerText`, `setLayerFontSize`, `setLayerTextColor` actions
- [x] Engine (`CanvasEngine`): `syncLayers` creates `Konva.Text` node; full transform integration; `applyTransformToTextNode`, `renderTextToCanvas`, `setTextContent`, `screenToDocPoint`, `docToPagePos` public methods; `pixelHitLayer` + `activeContentBox` + `nudgeActiveLayer` text branches; thumbnail generation
- [x] Save/open: text layers serialize as metadata (no base64 PNG); `designFile.ts` updated
- [x] Export PNG: `renderTextToCanvas` composites text during `flattenLayers`
- [x] `CanvasStage`: text tool click-to-create; transparent `<textarea>` overlay; blur/tool-switch/Escape commits; text I-beam cursor
- [x] `EditorV1`: wire `onTextLayerCreate` / `onTextCommit`; undo on commit; font size + color live props; `onRequestTextTool`
- [x] `LayersPanel`: font size input + color picker when active layer is `"text"`; threaded through `RightSidebar` + stories
- [x] Test cleanup: replaced stale "Text tool is v0.5 placeholder" assertions with MVP equivalents

#### Step 3 — Hybrid UX model + walkthrough bug fixes

- [x] Visual fix: textarea `color: transparent` + `caretColor` so Konva.Text is the only rendered surface while typing
- [x] Move tool on text: loosened `!target` guards in `beginStroke`/`continueStroke`/`endStroke`; text layers now draggable + resizable via Move tool
- [x] Overlay handles: fixed `renderOverlay` gate to include `textNodes.has(activeLayerId)` — transform handles now render for text layers in Move tool
- [x] Engine: `hitTestTextLayer(clientX, clientY)` — bounding-box hit-test across all visible text layers (top-to-bottom); `measureTextCaretIndex(layerId, clientX)` — character-index lookup via `measureText`
- [x] T + click on existing text: rewrote `onPointerDown` to call `hitTestTextLayer` first; re-edits the hit layer with caret at clicked character (Photoshop model)
- [x] Dbl-click from any tool: `onDoubleClick` handler calls `hitTestTextLayer`; if hit, opens edit + auto-switches to T via `onRequestTextTool`
- [x] `pnpm dev` walkthrough: place text, re-edit with T, move + resize with V, dbl-click from V, undo/redo, save + reopen ✅

---

### Previously shipped

- [x] **v0.2.1:** Marquee flip H/V + drag-to-float — merged + tagged
- [x] **v0.2.1:** Brush cursor ring (live size preview, zoom-aware) — landed in `CanvasStage`

---

## 2. 🧪 Workspace Feedback Loops & Incident Logs

### 🛑 Manual UX & Testing Reports (User Injected)

- [ ] **UI Bug:** Add manual observations from `pnpm dev` walkthroughs here.

### 🚨 Automated Engine Incident Logs (Script Prepended)
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/tests/pixel/color.test.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

tests/pixel/color.test.ts(3,10): error TS6133: 'hexToRgba' is declared but its value is never read.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(1192,5): error TS2304: Cannot find name 'stampInto'.
src/editor/Canvas/engine/CanvasEngine.ts(1200,5): error TS2304: Cannot find name 'compositeStroke'.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(3,3): error TS6133: 'compositeOp' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(4,3): error TS6133: 'hardnessStops' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(8,3): error TS6133: 'strokeAlpha' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(1199,5): error TS2304: Cannot find name 'stampInto'.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(3,3): error TS6133: 'compositeOp' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(4,3): error TS6133: 'hardnessStops' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(8,3): error TS6133: 'strokeAlpha' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(1199,5): error TS2304: Cannot find name 'stampInto'.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(922,22): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
src/editor/Canvas/engine/CanvasEngine.ts(947,30): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
src/editor/Canvas/engine/CanvasEngine.ts(1325,39): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(922,22): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
src/editor/Canvas/engine/CanvasEngine.ts(947,30): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(16,24): error TS6133: 'drawText' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(922,22): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
src/editor/Canvas/engine/CanvasEngine.ts(947,30): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(16,10): error TS6133: 'caretIndexAt' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(16,24): error TS6133: 'drawText' is declared but its value is never read.
src/editor/Canvas/engine/CanvasEngine.ts(922,22): error TS2339: Property 'scratchCtx' does not exist on type 'CanvasEngine'.
 ELIFECYCLE  Command failed with exit code 2.
  ```
- [ ] **Fix TypeScript Typecheck Failure in `/Users/tyrbujac/Documents/Projects/boojy/boojy-design/src/editor/Canvas/engine/CanvasEngine.ts`**
  ```text
  
> boojy-design@0.4.0 typecheck /Users/tyrbujac/Documents/Projects/boojy/boojy-design
> tsc -b --noEmit

src/editor/Canvas/engine/CanvasEngine.ts(16,1): error TS6192: All imports in import declaration are unused.
 ELIFECYCLE  Command failed with exit code 2.
  ```

_None open. (Cleared 2026-05-28 — all prior `0.3.0` typecheck entries were intermediate dev errors, resolved on the merged v0.4.0 branch; `pnpm typecheck` green.)_

<!-- The post-edit-validation hook automatically injects compiler/test errors beneath this line -->

---

## 3. 🗺️ Strategic Backlog & Architecture Scratchpad

### ⚠️ Known Gotchas

- **`viewportStore.zoom` is a percentage (0–100+), not a fraction.** Any screen-space calculation must use `zoom / 100`. Discovered 2026-05-28: brush-cursor circle rendered at 2250px because `brushSize * zoom` was used instead of `brushSize * (zoom / 100)`.
- **Hook tax on large files:** Editing `CanvasEngine.ts` (1400+ lines) incurs Biome reformat + typecheck + vitest per edit, plus a mandatory re-read after reformat. Budget ~3–4 round trips per logical change. Prefer batching multi-site edits.
- **Text layer `renderOverlay` gate**: must check both `node?.image.visible()` (raster) AND `textNodes.has(activeLayerId)` — forgetting either hides Move handles for one type.
- **`beginStroke`/`continueStroke`/`endStroke` text guard**: select tool on a text layer has no raster `target`; all three guards need the `|| (tool === "select" && textNodes.has(strokeLayerId))` bypass.
- **v0.4.0 shipped (2026-05-28):** Layer opacity (v0.3.0, #24) + live text layers (v0.4.0, #25) both on `main`. MVP complete. `package.json` at 0.4.0; not git-tagged (v0.3.0 wasn't tagged either — only v0.2.1 exists).
- **Deferred post-MVP (confirmed 2026-05-28):** Lasso, font family picker, text alignment, blend modes, elliptical marquee, skew/shear, paint masking.
- **Text layers are always live** — no rasterize action. Text layer data serializes as metadata in `.design`; base64 PNG only for raster layers.
- **Float-drag undo model:** Two commands (cut → paste at final position). One ⌘Z removes the float layer; second ⌘Z restores source pixels. Acceptable MVP behaviour.
- **Cost note (2026-05-28):** Session 1 — $6.27. Session 2 — $10.01. Session 3 (brush cursor) — $2.70. Session 4 (layer opacity) — $2.02. Session 5 (text layers engine) — ~$8 est. Session 6 (text layers chrome + Hybrid UX) — $15.30. Driver: 62% of usage at >150k context (long CanvasEngine.ts edits). Use `/compact` mid-task when context hits 50%.
