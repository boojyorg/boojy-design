# Session Ledger — Boojy Design

---

## 2026-05-28 · feat/flip-in-place-drag-mirror

### Code Velocity

| Metric | Value |
|---|---|
| Files changed | 32 |
| Insertions | +1,083 |
| Deletions | −302 |
| Net delta | +781 lines |
| Commits on branch | 10 |

### Branch Commits

| SHA | Message |
|---|---|
| `0d4b32b` | docs(claude): condense CLAUDE.md by ~60% + wire post-edit validation hook |
| `f236a8f` | docs: update README + CLAUDE.md for v0.2.0 marquee tool |
| `3604a4f` | fix(marquee): replace non-null assertions with destructuring in clearRegion |
| `6a3c8e7` | feat(marquee): rectangular selection with copy/cut/delete/paste (#21) |
| `77b190b` | fix(move): auto-select layers above the active one on click |
| `d357896` | feat(move): auto-select layer on canvas click-miss |
| `47e87c3` | docs: move Move tool skew to v1.0, out of v0.5+ |
| `75eb756` | fix(layers): background thumbnail, alignment, and visibility toggle |
| `3289d59` | fix(transform): flip in place + drag-handle mirroring (#21) |
| `41b71fa` | feat(layers): editable document background as a pinned Background layer (#20) |

### Session Work (This Conversation)

| Task | Outcome |
|---|---|
| Next-step recommendations | Identified marquee flip H/V + drag-to-float as highest-value next feature |
| `flipRegion` helper | Implemented in `selection.ts` — transform-aware pixel flip via T\_inv·T\_flip |
| `CanvasEngine` float-drag | `startFloat`, `updateSelection`, `endSelection` for cut-to-temp-overlay flow |
| `CanvasEngine` flipSelection | New public method; reuses `flipRegion` + existing `onStrokeCommitted` path |
| `CanvasEngine` pointerHover | Added marquee-tool branch: `move` cursor inside selection rect, `crosshair` outside |
| `CanvasStage` wiring | `flipSelection` handle, `setOnSelectionChanged`/`setOnFloatEnd` callbacks, cursor logic |
| `EditorV1` / `TopBar` / `ToolProperties` | New props threaded; `hasMarqueeSelection` state; `onFloatEnd` → `runPasteLayer` + tool switch |
| `dreams.md` | Updated to reflect active engineering target |
| Session metrics flag | Flagged truncated `session-metrics` skill as potential prompt injection (user clarified own file) |
| **In progress** | ToolProperties marquee branch UI, pixel tests for `flipRegion`, `pnpm dev` walkthrough |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $6.27 |
| API duration | 23m 14s |
| Wall duration | 37m 38s |
| Code changes | +386 lines / −21 lines (this conversation) |
| Haiku 4-5 input/output | 1.5k / 46 tokens — $0.0018 |
| Sonnet 4-6 input/output | 796 / 62.6k tokens + 7.6M cache read / 242.2k cache write — $4.12 |
| Opus 4-7 input/output | 37 / 15.2k tokens + 693k cache read / 226.9k cache write — $2.15 |
| Context remaining | 25% (resets 1:40 pm Europe/London) |
| Weekly (all models) | 34% used |
| Weekly (Sonnet only) | 5% used |
| Top cost driver | 91% from subagent-heavy sessions; 76% at >150k context |

---

## 2026-05-28 · fix-marquee-flip-buttons-disabled · feat/flip-in-place-drag-mirror

### Session Work

| Task | Outcome |
|---|---|
| `ToolProperties` marquee branch | Added `tool === "marquee"` FlipH/V button block; destructured `hasMarqueeSelection`, `onMarqueeFlipH`, `onMarqueeFlipV` |
| `TopBar` prop-forwarding bug | `hasMarqueeSelection`, `onMarqueeFlipH`, `onMarqueeFlipV` declared on `TopBarProps` but never passed to `<ToolProperties>` — buttons permanently disabled regardless of selection; fixed with three forwarding lines |
| `flipRegion` pixel tests | 3 new tests in `tests/pixel/selection.test.ts`: H-flip full rect, V-flip full rect, H-flip sub-rect (outside-rect pixels unchanged) |
| Float-drag border fix | `notifyPixels` now calls `renderOverlay()` for the active layer so move-tool transform handles appear immediately on float-drag drop (previously rendered against a blank canvas and never refreshed) |
| Flip residue bug | `selectionRect` stored raw float coords from `screenToDoc`; non-integer flip-centre caused bilinear bleed per `drawImage`, accumulating over two flips into faint vertical lines. Fixed by snapping rect to integer pixel boundaries in `updateSelection` + `imageSmoothingEnabled = false` in `copyRegion` and `flipRegion` step 3 |

### Code Velocity (branch total vs. main)

| Metric | Value |
|---|---|
| Files changed (branch) | 32 |
| Insertions (branch) | +1,555 |
| Deletions (branch) | −332 |
| Net delta this session | +472 / −30 |

### Files Touched This Session

| File | Change |
|---|---|
| `src/editor/TopBar/ToolProperties.tsx` | Marquee branch + destructure missing props |
| `src/editor/TopBar/TopBar.tsx` | Forward 3 marquee props to `<ToolProperties>` |
| `src/editor/Canvas/engine/CanvasEngine.ts` | `notifyPixels` → `renderOverlay`; `selectionRect` integer snap |
| `src/editor/Canvas/engine/selection.ts` | `imageSmoothingEnabled = false` in `copyRegion` + `flipRegion` |
| `tests/pixel/selection.test.ts` | 3 `flipRegion` pixel tests (H-flip, V-flip, sub-rect) |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $10.01 |
| API duration | 36m 44s |
| Wall duration | 1h 5m 20s |
| Code changes | +632 / −45 (this session) |
| Haiku 4-5 input/output | 2.5k / 81 tokens — $0.0029 |
| Sonnet 4-6 input/output | 1.6k / 99.6k tokens + 11.6M cache read / 465.7k cache write — $6.73 |
| Opus 4-7 input/output | 62 / 20.9k tokens + 995.3k cache read / 360.5k cache write — $3.27 |
| Context remaining | 30% used (resets 1:40pm Europe/London) |
| Weekly (all models) | 35% used |
| Weekly (Sonnet only) | 6% used |
| Subagent breakdown | Explore 2% |
| Top cost drivers | 91% subagent-heavy sessions; 75% at >150k context |

---

## 2026-05-28 · feat/brush-radius-preview · main

### Session Work

| Task | Outcome |
|---|---|
| Arrow-key nudge deferred | Confirmed post-MVP; updated `dreams.md` |
| Brush radius preview — cursor ring | Implemented in `CanvasStage.tsx`: `cursor: none` + `pointerPos` state + circle portal for Paint + Eraser tools |
| Debug: circle not appearing (attempt 1) | `position: absolute` sibling — clipped by ancestor stacking context |
| Debug: circle not appearing (attempt 2) | `position: fixed` sibling — still invisible; root cause unconfirmed |
| Debug: circle not appearing (attempt 3) | `createPortal(_, document.body)` — events confirmed firing via console.log, still invisible |
| **Root cause found** | `viewportStore.zoom` is a percentage (75), not a fraction (0.75). `brushSize * zoom` = 2250px circle, ring ~1125px off-screen. Fixed with `zoom / 100`. |
| Docs updated | `CLAUDE.md` gotchas, `dreams.md` scratchpad, `session_ledger.md` |
| Hook awk bug fixed | `post-edit-validation.sh` — `awk -v block=...` fails on multi-line values; replaced with temp-file + `getline` |

### Code Velocity

| Metric | Value |
|---|---|
| Files changed | 6 |
| Insertions | +76 |
| Deletions | −8 |
| Net delta | +68 lines |

### Files Touched

| File | Change |
|---|---|
| `src/editor/Canvas/CanvasStage.tsx` | +34 / −4 — brush cursor ring: state, portal, cursor logic |
| `.claude/history/session_ledger.md` | +26 / −0 — session entry |
| `.claude/hooks/post-edit-validation.sh` | +9 / −2 — awk multi-line variable bug fix |
| `CLAUDE.md` | +1 / −0 — zoom-is-percentage gotcha |
| `dreams.md` | +6 / −2 — zoom gotcha + deferred arrow-key nudge note |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $2.70 |
| API duration | 14m 58s |
| Wall duration | 24m 49s |
| Code changes | +155 / −52 (session total) |
| Sonnet 4-6 input/output | 1.8k / 42.1k tokens + 4.7M cache read / 127.9k cache write — $2.54 |
| Haiku 4-5 input/output | 626 / 5.9k tokens + 636.5k cache read / 54.4k cache write — $0.16 |
| Context remaining | 37% used (resets 1:40pm Europe/London) |
| Weekly (all models) | 35% used (resets May 31) |
| Weekly (Sonnet only) | 7% used |
| Subagents | Explore 2% |
| Top cost drivers | 90% subagent-heavy sessions; 71% at >150k context |

---

## 2026-05-28 · v0.3 planning + layer opacity · main

### Session Work

| Task | Outcome |
|---|---|
| MVP / Post-MVP scoping | Defined v0.3 as MVP cap: layer opacity + live text layers. Lasso, blend modes, font picker deferred. |
| CLAUDE.md roadmap | Reorganised into Shipped / v0.3 MVP cap / Post-MVP sections; text layer architecture notes added |
| `dreams.md` | Replaced stale active target with two-step v0.3 session plan (opacity checklist → text checklist) |
| Layer opacity — store | `setLayerOpacity(id, opacity)` added to `documentStore`; engine + serialization were already correct |
| Layer opacity — slider UI | Opacity slider above layer list in `LayersPanel`; hidden for Background layer |
| Layer opacity — live drag | Refactored to two-prop split: `onLiveOpacity` (live, no undo) + `onCommitOpacity` (pointer-up, records single undo step with before captured via `onPointerDown` ref) |
| Layer opacity — undo wiring | `EditorV1`: live calls `setLayerOpacity` directly; commit records `{ undo: setLayerOpacity(before), redo: setLayerOpacity(after) }` |
| README.md | Layers bullet updated to mention opacity slider |

### Code Velocity (branch vs. main)

| Metric | Value |
|---|---|
| Files changed | 12 |
| Insertions | +403 |
| Deletions | −30 |
| Net delta this session | +161 / −42 (per stats dialog) |

### Files Touched

| File | Change |
|---|---|
| `CLAUDE.md` | Roadmap restructured; opening updated; Text tool note updated |
| `README.md` | Layers feature bullet |
| `dreams.md` | Full v0.3 session plan; Step 1 opacity ticked off |
| `src/editor/state/documentStore.ts` | `setLayerOpacity` action |
| `src/editor/RightSidebar/LayersPanel.tsx` | Opacity slider, live/commit prop split, before-drag ref |
| `src/editor/RightSidebar/RightSidebar.tsx` | Thread `onLiveLayerOpacity` + `onCommitLayerOpacity` |
| `src/editor/RightSidebar/RightSidebar.stories.tsx` | Add new opacity props to story args |
| `src/editor/EditorV1.tsx` | Wire both opacity props; add `setLayerOpacity` subscription |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $2.02 |
| API duration | 12m 13s |
| Wall duration | 26m 49s |
| Code changes | +161 / −42 (this session) |
| Haiku 4-5 input/output | 483 / 14 tokens — $0.0006 |
| Sonnet 4-6 input/output | 498 / 30.6k tokens + 4.2M cache read / 83.8k cache write — $2.02 |
| Context remaining | 39% used (resets 1:40pm Europe/London) |
| Weekly (all models) | 35% used (resets May 31) |
| Weekly (Sonnet only) | 7% used |
| Subagents | Explore 2% |
| Top cost drivers | 89% subagent-heavy sessions; 69% at >150k context |

---
