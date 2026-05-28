# DREAMS.md — Boojy Design Intent Buffer & Devlog

## 1. 🎯 Active Engineering Target — v0.3 MVP

**Goal:** Ship two features to close out MVP. Work in this order.

### Step 1 — Layer opacity ✅

- [x] `opacity: number` (0–100) already in `Layer` type, `addLayer`, `pasteLayer`, `designFile` (serialize + deserialize)
- [x] `documentStore`: `setLayerOpacity(id, opacity)` added
- [x] Engine (`CanvasEngine`): already applied `node.image.opacity(layer.opacity / 100)` in `syncLayers`
- [x] Sidebar: opacity slider above layer list (hidden for Background); live drag via `onLiveOpacity` → `setLayerOpacity`; `onCommitOpacity` records one undo step with before captured via `onPointerDown` ref
- [x] `pnpm dev` walkthrough: drag opacity slider, verify compositing, undo/redo ✅

### Step 2 — Live text layers

- [ ] Add `kind: "raster" | "text"` discriminated union to `Layer`; text layers carry `{ content, fontFamily, fontSize, color }`
- [ ] `documentStore`: guards — text layers can't be painted on; `addTextLayer(at: {x,y})` action
- [ ] Engine (`CanvasEngine`): `syncLayers` creates `Konva.Text` node for text layers; integrates with existing transform system
- [ ] `CanvasStage`: text tool click-to-create flow; `<textarea>` overlay for in-canvas editing; double-click to re-edit; blur/tool-switch commits
- [ ] `EditorV1`: wire text tool keyboard shortcut (`T`), activate text tool, thread `onTextCommit` into undo timeline
- [ ] Sidebar: font size + color controls when active layer is text
- [ ] Thumbnail generation for text layers (render via `ctx.fillText` to small canvas)
- [ ] Save/open: text layers serialize as metadata (no base64 PNG)
- [ ] Export PNG (`exportPNG`): composite text layers via `ctx.fillText` during flatten
- [ ] `pnpm dev` walkthrough: place text, re-edit, move with Move tool, undo/redo, save + reopen

---

### Previously shipped

- [x] **v0.2.1:** Marquee flip H/V + drag-to-float — merged + tagged
- [x] **v0.2.1:** Brush cursor ring (live size preview, zoom-aware) — landed in `CanvasStage`

---

## 2. 🧪 Workspace Feedback Loops & Incident Logs

### 🛑 Manual UX & Testing Reports (User Injected)

- [ ] **UI Bug:** Add manual observations from `pnpm dev` walkthroughs here.

### 🚨 Automated Engine Incident Logs (Script Prepended)

<!-- The post-edit-validation hook automatically injects compiler/test errors beneath this line -->

---

## 3. 🗺️ Strategic Backlog & Architecture Scratchpad

### ⚠️ Known Gotchas

- **`viewportStore.zoom` is a percentage (0–100+), not a fraction.** Any screen-space calculation must use `zoom / 100`. Discovered 2026-05-28: brush-cursor circle rendered at 2250px because `brushSize * zoom` was used instead of `brushSize * (zoom / 100)`.

- **v0.4.0 session plan:** Layer opacity shipped as v0.3.0. Next: live text layers (v0.4.0 = MVP cap). See Step 2 checklist above.
- **Deferred post-MVP (confirmed 2026-05-28):** Lasso, font family picker, text alignment, blend modes, elliptical marquee, skew/shear, paint masking. Arrow-key nudge of marquee outline also deferred.
- **Text layers are always live** — no rasterize action. Text layer data serializes as metadata in `.design`; base64 PNG only for raster layers.
- **Float-drag undo model:** Two commands (cut → paste at final position). One ⌘Z removes the float layer (source has a hole); second ⌘Z restores source pixels. Acceptable MVP behaviour.
- **Cost note (2026-05-28):** Session 1 — $6.27. Session 2 — $10.01. Session 3 (brush cursor) — $2.70. Session 4 (v0.3 planning + layer opacity) — $2.02 (Sonnet-only, minimal subagents). Trend improving — earlier sessions were Opus-heavy subagent runs. Use `/compact` mid-task and `/clear` between tasks.
