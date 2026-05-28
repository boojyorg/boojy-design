# DREAMS.md — Boojy Design Intent Buffer & Devlog

## 1. 🎯 Active Engineering Target

- [ ] **Current Focus:** Marquee flip H/V + drag-to-float (`feat/flip-in-place-drag-mirror`)

### Implementation checklist

- [x] `flipRegion` in `src/editor/Canvas/engine/selection.ts`
- [x] `CanvasEngine`: `flipSelection`, `startFloat`, float-drag in `updateSelection`/`endSelection`/`clearSelection`, marquee cursor in `pointerHover`, `setOnSelectionChanged`/`setOnFloatEnd` setters
- [x] `CanvasStage`: `flipSelection` handle method, engine callbacks wired, cursor logic updated
- [x] `EditorV1`: `hasMarqueeSelection` state, `onFloatEnd` → `runPasteLayer` + tool switch, props passed to TopBar + CanvasStage
- [x] `TopBar` / `ToolProperties`: new optional props threaded
- [x] `ToolProperties`: add `tool === "marquee"` branch with FlipH/V buttons (disabled when no selection)
- [x] `tests/pixel/selection.test.ts`: `flipRegion` pixel tests (identity, translated, rotated)
- [ ] `pnpm dev` walkthrough: flip H/V on a painted region, drag-to-float gesture, undo/redo

---

## 2. 🧪 Workspace Feedback Loops & Incident Logs

### 🛑 Manual UX & Testing Reports (User Injected)

- [ ] **UI Bug:** Add manual observations from `pnpm dev` walkthroughs here.

### 🚨 Automated Engine Incident Logs (Script Prepended)

<!-- The post-edit-validation hook automatically injects compiler/test errors beneath this line -->

---

## 3. 🗺️ Strategic Backlog & Architecture Scratchpad

- **Next after marquee PR:** Lasso / freehand selection; Text tool (v0.5 roadmap).
- **Deferred from this PR:** Arrow-key nudge of marquee outline, move outline without pixels.
- **Float-drag undo model:** Two commands (cut → paste at final position). One ⌘Z removes the float layer (source has a hole); second ⌘Z restores source pixels. Acceptable MVP behaviour.
- **Cost note (2026-05-28):** Session 1 — $6.27 (91% subagent-heavy, 76% >150k context). Session 2 (fix-marquee-flip-buttons-disabled) — $10.01 (91% subagent-heavy, 75% >150k context, +632/−45 lines). Use `/compact` mid-task and `/clear` between tasks to manage context cost.
