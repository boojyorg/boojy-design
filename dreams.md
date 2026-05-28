# DREAMS.md — Boojy Design Intent Buffer & Devlog

## 1. 🎯 Active Engineering Target — quality pass DONE; next = engine stateful tail / CanvasStage

**Status (2026-05-28):** The post-MVP structure & quality pass is **complete and up as a stacked PR set (#26→#27→#28), pending #26's `pnpm dev` walkthrough + merge.** All four candidate items below landed. See the checklist for the record; the two follow-on targets are below it.

> ⚠️ **Lesson banked:** these were shipped as a *stack* (each PR branched off the previous), not parallel branches off `main` — because PR #28 and the lint fix both touch `CanvasEngine.ts`, and parallel-off-`main` would have hit exactly the cross-branch conflict this §1 used to warn about. Retarget each base down to `main` as the one below merges. This is now codified in `CLAUDE.md` → Shipping workflow.

### Next targets (each its own milestone — plan-mode first)

- [ ] **Engine stateful tail (~600 lines).** Marquee/float, free-transform gesture, and overlay/hit-test rendering still live in `CanvasEngine.ts` (1539 lines). This is where the remaining size + per-edit cost actually sits. It is stateful Konva orchestration — extract via **controller classes holding engine refs**, NOT pure functions (pure extraction was right for text/stroke/thumbnail; it's wrong here). Higher regression risk → walkthrough per step.
- [ ] **Split `CanvasStage.tsx` (726 lines).** Second-biggest file: ref-heavy (12+ refs for stable callbacks across tool switches), mixing pointer dispatch + text editing + pan + engine lifecycle. Separate from the engine; its own plan.

### Completed — the quality pass (record)

> Honest outcome: the pure-extraction approach moved `CanvasEngine.ts` only ~100 lines (1636→1539). The win is **per-edit cost on the extracted concerns** (you now edit 50–240 line modules, not the whole engine), not raw file size. Don't read "split" as "the engine is small now."

- [x] **Split `CanvasEngine.ts`** (was 1636 lines → ~1530). Pure/ctx-taking extractions behind the engine: `text.ts` (measure/caret/draw text), `stroke.ts` (`stampInto`/`compositeStroke` hot path), `thumbnail.ts` (`drawRasterThumbnail`/`drawTextThumbnail`), `color.ts` (`hexToRgba` moved in), plus a private `compositeToCanvas()` shared by export/sample. New pixel tests: `text.test.ts`, `stroke.test.ts`, extended `thumbnail.test.ts` + `color.test.ts`. **Stateful Konva orchestration (marquee/float, free-transform gesture, overlay/hit-test) intentionally left in the engine** — extracting it into ref-holding classes would break the pure-function pattern. 194-test suite stays green; **canvas walkthrough still required before merge** (engine no-ops under jsdom).
- [x] **Cleared the 2 standing lint warnings** — `target!.canvas` in `beginStroke`/`endStroke` narrowed with explicit `if (!target) return` guards after the select branch. `pnpm lint` is warning-free.
- [x] **Bundle size — resolved.** `vite.config.ts` `manualChunks` splits Konva into its own vendor chunk: Konva ≈181 KB (gzip 54.5), app ≈454 KB (gzip 143) — both under 500 KB, warning gone. Chose the vendor split over lazy-loading because the app *is* the editor (no routes to defer behind); the win is cache hit-rate across deploys, not initial load.
- [x] **Conventions sweep — done.** Added `DEFAULT_TEXT_COLOR` to `src/editor/types.ts` and replaced the `#000000` text default in `documentStore`, `designFile`, `CanvasEngine` (Konva.Text create + update), `LayersPanel` and `CanvasStage`. `noUncheckedIndexedAccess` + `import type` already correct (verified, no churn). Remaining inline hex is intentional: `CanvasArt.tsx` SVG *content*, and engine UI constants (`SELECT_ACCENT`, marquee dark line) Konva can't read Tailwind tokens for. All new pure helpers have node tests.
- [x] **Merge hygiene** — banked as the stacked-PR practice (see the lesson above + `CLAUDE.md` Shipping workflow). Original trigger: the opacity duplication conflict, where a branch outlived a `main` advance (#24 squash-merged the same feature). Still true: merge/rebase `main` into long branches frequently and squash-merge promptly.

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

_None open. (Cleared 2026-05-28 — the engine-split session's transient typecheck entries were all intermediate mid-edit states from the multi-file extraction, resolved per commit; `pnpm typecheck`, `pnpm test`, `pnpm lint` all green.)_

<!-- The post-edit-validation hook automatically injects compiler/test errors beneath this line -->

---

## 3. 🗺️ Strategic Backlog & Architecture Scratchpad

### ⚠️ Known Gotchas

- **`viewportStore.zoom` is a percentage (0–100+), not a fraction.** Any screen-space calculation must use `zoom / 100`. Discovered 2026-05-28: brush-cursor circle rendered at 2250px because `brushSize * zoom` was used instead of `brushSize * (zoom / 100)`.
- **Hook tax on large files:** Editing `CanvasEngine.ts` (still ~1540 lines after the pure-extraction split) incurs Biome reformat + typecheck + vitest per edit, plus a mandatory re-read after reformat. Budget ~3–4 round trips per logical change. Prefer batching multi-site edits. Logic now in the extracted modules (`text.ts`, `stroke.ts`, `thumbnail.ts`, etc.) is cheap to edit — work there when you can, not in the engine core.
- **Refactor noise in §2:** the post-edit-validation hook logs *transient* mid-edit typecheck failures into §2 during multi-file refactors (import added before its use, symbol mid-move). They're intermediate states, not real incidents — clear §2 back to `_None open_` once gates are green again.
- **Vite 8 = rolldown; bundle splitting:** `vite.config.ts` splits Konva into its own vendor chunk via `build.rollupOptions.output.manualChunks`. `manualChunks` still works under rolldown — ignore the build warning's suggestion to use `rolldownOptions`/`advancedChunks`. Keep app + Konva chunks each under 500 KB.
- **Text layer `renderOverlay` gate**: must check both `node?.image.visible()` (raster) AND `textNodes.has(activeLayerId)` — forgetting either hides Move handles for one type.
- **`beginStroke`/`continueStroke`/`endStroke` text guard**: select tool on a text layer has no raster `target`; all three guards need the `|| (tool === "select" && textNodes.has(strokeLayerId))` bypass.
- **v0.4.0 shipped (2026-05-28):** Layer opacity (v0.3.0, #24) + live text layers (v0.4.0, #25) both on `main`. MVP complete. `package.json` at 0.4.0; not git-tagged (v0.3.0 wasn't tagged either — only v0.2.1 exists).
- **Deferred post-MVP (confirmed 2026-05-28):** Lasso, font family picker, text alignment, blend modes, elliptical marquee, skew/shear, paint masking.
- **Text layers are always live** — no rasterize action. Text layer data serializes as metadata in `.design`; base64 PNG only for raster layers.
- **Float-drag undo model:** Two commands (cut → paste at final position). One ⌘Z removes the float layer; second ⌘Z restores source pixels. Acceptable MVP behaviour.
- **Cost note (2026-05-28):** Session 1 — $6.27. Session 2 — $10.01. Session 3 (brush cursor) — $2.70. Session 4 (layer opacity) — $2.02. Session 5 (text layers engine) — ~$8 est. Session 6 (text layers chrome + Hybrid UX) — $15.30. Session 7 (engine split quality pass) — $21.92. Drivers this session: **45% subagent-heavy** (Explore fan-out — 3 parallel agents in planning) + **38% at >150k context** (the engine is large even when cached). Levers for next time: be sparing with Explore fan-out (one well-scoped agent often beats three), `/compact` mid-task at ~50% context, and prefer editing the small extracted modules over re-reading the whole engine.
