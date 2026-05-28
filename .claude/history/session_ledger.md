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
