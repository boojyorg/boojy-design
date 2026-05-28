# Session Ledger — Boojy Design

---

## 2026-05-28 · v0.4.0 release — merge main, resolve conflicts, ship MVP · feat/layer-opacity → main

### Session Work

| Task | Outcome |
|---|---|
| Pre-PR conflict check | Found `main` had advanced: opacity already merged via #24 (`fc97264`), duplicating the branch's own opacity commit `8791167` |
| Merge `origin/main` | 8 files conflicted; resolved each by dropping duplicated opacity hunks, keeping text-only additions (documentStore, EditorV1, LayersPanel, RightSidebar(+stories), CanvasStage, CLAUDE.md, dreams.md) |
| Release v0.4.0 (never actually cut) | `package.json` 0.3.0 → 0.4.0; CHANGELOG 0.4.0 entry; README badge 0.2.1→0.4.0 + status + new Text feature bullet + fixed stale "Text coming in v0.5"; CLAUDE roadmap → MVP-complete |
| Chore | Dropped `opusplan` model pin from `.claude/settings.json` |
| PR #25 | Opened against `main`, CI green (Lint·Test·Build pass, preview deployed), squash-merged + branch deleted |
| Ledger / dreams hygiene | Added this entry; flipped dreams active-target → "MVP complete, no active target"; cleared stale `0.3.0` incident logs |

### Gates

| Gate | Result |
|---|---|
| typecheck | green |
| lint | exit 0 (2 pre-existing CanvasEngine non-null-assertion warnings, untouched) |
| test | 178 pass (26 files) |
| build | green |
| Manual walkthrough | text place/re-edit/move/resize/dbl-click/undo/save+reopen — passed (user-confirmed) |

### Notes

MVP is closed and `v0.4.0` is now git-tagged (tagging back on track; `v0.3.0` deliberately not backfilled). Releases are version-bumped in `package.json` + CHANGELOG and tagged from here on.

**Next session — repo structure & quality pass (NOT features).** Logged as the active target in `dreams.md` §1 and CLAUDE.md Roadmap. Goal: lower per-edit cost + merge pain before more features. Headline items: split `CanvasEngine.ts` (~1400 lines, top cost driver + merge hotspot) into pure/ctx-taking modules along seams; clear the 2 standing `noNonNullAssertion` warnings (CanvasEngine.ts ~420, ~803); resolve the >500 KB bundle warning; conventions sweep. Plan-mode first; small single-concern PRs; keep the `CanvasStage` → engine seam intact.

---

## 2026-05-28 · text resize baking + stretch + live size · feat/layer-opacity

### Session Work

| Task | Outcome |
|---|---|
| Text scale baking | `onMoveCommitted` intercepts scale gestures on text layers; bakes `|scaleY|` into `fontSize`, resets `scaleY` to ±1; `scaleX` preserves stretch ratio |
| Stretch support | Changed baked `scaleX` from `signX` → `after.scaleX / |after.scaleY|` so non-proportional horizontal resize survives |
| Live size number | `onPointerMove` reads engine transform after `continueStroke`; fires `onLiveTextScale` → `liveLayerFontSize` state → `LayersPanel` display override; store untouched during drag |
| Undo model | Single `⌘Z` step covers fontSize + transform together; original captured from store (never updated live) |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $20.35 |
| API duration | 1h 14m 41s |
| Wall duration | 2h 48m 53s |
| Code changes | +1136 / −844 (cumulative session incl. prior uncommitted text-layer work) |
| Haiku 4-5 input/output | 2.1k / 61 tokens — $0.0024 |
| Sonnet 4-6 input/output | 5.7k / 196.9k tokens + 29.6M cache read / 1.2M cache write — $16.31 |
| Opus 4-7 input/output | 25 / 13.9k tokens + 1.3M cache read / 489.8k cache write — $4.03 |
| Context remaining | 4% used (resets 6:40pm Europe/London) |
| Weekly (all models) | 38% used (resets May 31) |
| Weekly (Sonnet only) | 10% used |
| Top cost drivers | 74% subagent-heavy; 56% at >150k context (CanvasEngine.ts edits) |

---

## 2026-05-28 · text-layers chrome + Hybrid UX · main (unbranched)

### Session Work

| Task | Outcome |
|---|---|
| `tests/editor.test.tsx` | Replaced stale "Text is v0.5 placeholder" tests with "T activates Text" + "T shortcut" |
| `CanvasStage.tsx` — textarea overlay | Transparent `<textarea>` + caretColor; T-cursor; blur / Escape / tool-switch commit |
| `CanvasStage.tsx` — onPointerDown text branch | Rewrote: calls `hitTestTextLayer`; re-edits hit layer at caret; creates new layer on miss |
| `CanvasStage.tsx` — onDoubleClick | Any-tool dbl-click opens edit + auto-switches to T via `onRequestTextTool` |
| `EditorV1.tsx` | Wire `addTextLayer`, `setLayerText`, `setLayerFontSize`, `setLayerTextColor`, `onTextLayerCreate`, `onTextCommit`, `onRequestTextTool` |
| `LayersPanel.tsx` | Font size number input + color picker below opacity slider when active layer is `"text"` |
| `RightSidebar.tsx` / stories | Thread optional `onLiveFontSize?` + `onTextColor?`; add noop args to stories |
| Fix: visual double-render | `color: "transparent"` on textarea; removed duplicate `caretColor` key |
| Fix: Move tool on text | Loosened three `!target` guards in `beginStroke`/`continueStroke`/`endStroke` for select+textNode |
| Fix: overlay handles missing | `renderOverlay` gate: added `textNodes.has(activeLayerId)` alongside `node?.image.visible()` |
| Engine: `hitTestTextLayer` | Bounding-box hit-test across all visible text layers, top-to-bottom |
| Engine: `measureTextCaretIndex` | Character-index lookup via `measureText` for caret placement on click |
| `dreams.md` | Cleaned 280-line noise incident log; added Step 3 Hybrid UX checklist; updated cost note |

### Code Velocity (branch vs. main)

| Metric | Value |
|---|---|
| Files changed | 19 |
| Insertions | +1,149 |
| Deletions | −76 |

### Token & Cost Telemetry

| Metric | Value |
|---|---|
| Session cost (USD) | $15.30 |
| API duration | 59m 8s |
| Wall duration | 2h 16m 41s |
| Haiku 4-5 | 1.0k / 30 tokens — $0.0012 |
| Sonnet 4-6 | 5.7k / 150.9k tokens + 24.7M cache read / 799.5k cache write — $12.67 |
| Opus 4-7 | 17 / 10.7k tokens + 850.4k cache read / 309.6k cache write — $2.63 |
| Context remaining | 40% (resets 1:40pm Europe/London) |
| Weekly (all models) | 37% used |
| Weekly (Sonnet only) | 9% used |
| Top cost driver | 62% at >150k context — long CanvasEngine.ts edit tail |

### Pace note

Plan-mode pauses worked well — two plan/approve cycles shaped the Hybrid UX decision before coding. Hook tax on `CanvasEngine.ts` (1400+ lines) is the main per-edit cost; smaller files were faster. Next session: branch, `pnpm dev` walkthrough, PR, tag v0.4.0.

---

## 2026-05-28 · text-layers engine foundation · (branch pending)

### Session Work

| Task | Outcome |
|---|---|
| `types.ts` | Added `"text"` to `LayerType`; `textContent`, `fontSize`, `textColor` optional fields on `Layer` |
| `documentStore.ts` | `addTextLayer`, `setLayerText`, `setLayerFontSize`, `setLayerTextColor` actions |
| `designFile.ts` | Text layer serialize/parse: `pixels: null` + metadata; `isSerializedLayer` accepts `"text"`; `parseDesign` restores text fields |
| `tools.ts` | Text tool enabled (`mvp: true`); was v0.5 placeholder |
| `CanvasEngine.ts` | `TextNode` interface + `textNodes` Map; `syncLayers` text branch (Konva.Text); transform integration; `applyTransformToTextNode`, `renderTextToCanvas` private methods; `pixelHitLayer` + `activeContentBox` + `nudgeActiveLayer` text branches; thumbnail generation; public: `setTextContent`, `screenToDocPoint`, `docToPagePos` |
| **Pending** | `CanvasStage` text tool UI, `EditorV1` wiring, `LayersPanel` font/color controls, `pnpm dev` walkthrough, PR |

### Code Velocity (branch vs. main)

| Metric | Value |
|---|---|
| Files changed | 18 |
| Insertions | +685 |
| Deletions | −53 |
| Net delta | +632 lines |

### Pace note

Hook tax on `CanvasEngine.ts` (1200+ lines): every edit triggered Biome reformat → typecheck → vitest, plus a mandatory re-read after reformat. ~3–4 round trips per logical change. Intermediate TS errors accumulated in `dreams.md` noise — cleaned at session end. Smaller files next.

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
