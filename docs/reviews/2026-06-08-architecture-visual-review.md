# Architecture & Visual Regression Review — 2026-06-08

- **Date:** 2026-06-08
- **Branch / commit:** `test/visual-regression-runner` @ `42f6a98`
- **Scope:** `src/editor/EditorV1.tsx` + the four Zustand stores, code-vs-`tests/UI_UX_SPEC.md` drift, and a live headless visual-regression run (`pnpm test:visual`).
- **Method:** multi-agent workflow — 3 analytical finders + 1 live visual runner, then every finding adversarially re-verified (default = refute) against source. 33 agents, **29 findings → 28 confirmed, 1 refuted**.
- **Status:** read-only review. No code changed.

## Verdict in one paragraph

The app is structurally healthy where it counts: immutable store updates, granular selectors, a unified undo timeline that composes strokes + layer ops correctly, and clean test-reset hygiene. The findings cluster into **two real risk areas** worth acting on, plus a long tail of maintainability + documentation drift. Risk area one: **the undo timeline has three holes around text** — creating a text layer, changing its colour, and editing font-size from the sidebar all write to the store with *no recorded command*, so an unrelated ⌘Z can silently revert them (data-loss-shaped). Risk area two: **memory is doubly unbounded** — the documented 50-layer cap is enforced nowhere, and deleting a layer orphans its thumbnail in the cache forever. Everything else is "fix when you're nearby." The visual baseline passed and the assertion is sound (not trivially green).

## Priority order

| # | Issue | Severity | Type |
|---|-------|----------|------|
| 1 | Text create / text-colour / sidebar font-size bypass the undo timeline (3 findings) | **High** | Correctness |
| 2 | "coming in v0.5" hint shown for the shipped Text tool | **High** | UX / drift |
| 3 | 50-layer cap enforced nowhere + thumbnails orphaned on delete | Medium | Memory |
| 4 | Layer rows use `role=option` inside a plain `<ul>` (invalid ARIA) | Medium | a11y |
| 5 | Open path: no in-flight guard, errors swallowed; dirty-dot is hardcoded | Medium | Robustness |
| — | God-component trajectory, leaky PixelPort seam, latent footguns | Low | Maintainability |
| — | ~7 spec/doc-drift items | Low | Docs |

---

## 1 · Architecture health

### Correctness hazards (fix first)

- **Three undo gaps around text** — `onTextLayerCreate` → `addTextLayer` (`EditorV1.tsx:148`), `onTextColor` → `setLayerTextColor` (`:356`), and `onLiveFontSize` → `setLayerFontSize` (`:354`) all mutate `documentStore` directly with no `record()`. Every *other* layer op routes through `runUndoable`/`runDeleteLayer`/etc. Because commands are whole-document mementos, these unrecorded writes get silently rolled back by an unrelated ⌘Z. Fix = the existing live+commit pattern (mirror `onCommitLayerOpacity`). The canvas-drag font path (`onTextScaleCommit`) already does this correctly — only the *sidebar* entry points are unguarded.
- **Memory, doubly unbounded** — the documented **50-layer cap is enforced nowhere** (`addLayer`/`addTextLayer`/`pasteLayer`/`duplicateLayer` all prepend unconditionally), and **deleting a layer never prunes its thumbnail** (`removeThumbnail` only fires when pixels go blank, not on layer destruction — `thumbnailStore.ts:22`). Verifiers downgraded these from *high* to *medium*: they need deliberate user churn and degrade perf rather than crash — but they **gate any milestone that raises layer counts.** (Thumbnail leak scope: raster/paste/duplicate layers only; text layers carry no thumbnail.)

### Structural / maintainability (low)

- `EditorV1` (362 lines) is trending toward a god-component — ~22 selectors + persistence + the full text-layer lifecycle + clipboard/marquee wiring. Reads cleanly *today*; fix = extract `usePersistence` / `useTextLayerController` / `useClipboardCommands` hooks (the same controller direction CLAUDE.md already calls for in `CanvasEngine`). Not urgent.
- **Open path** (`:97-125`) has no in-flight guard — two overlapping opens race during the decode `await`, and `clearUndo()` can wipe intervening work. Parse failures are swallowed to `console.error` (no toast; wrong-version and corrupt files are indistinguishable). *(Verifier note: the mid-mutation interleave in the original evidence is impossible — the mutation block is synchronous; the real race windows are the two `await`s during decode.)*
- **The unsaved dot lies** — `TopBar.tsx:58` hardcodes `dirty`; no real dirty/save tracking. Shows "unsaved" even on a pristine, just-saved doc. (Deriving a real flag needs `HistoryStack` to expose its index/a save token — `undoStore` only exposes `canUndo`/`canRedo`.)
- Latent footguns (no live bug, cheap to harden): `PixelPort` is a half-formalized seam (~17 calls still reach `stageRef` directly); region props are inline closures with no `React.memo` (re-render cascade on brush-drag — measure before fixing); `setBrushSize` skips the `clampSize` the nudge path applies (only reachable by a future programmatic caller — the live slider is bounded); `viewportStore.reset()` aliases the shared `INITIAL` object; the transform-vs-memento contract is undocumented (precedent already exists in `onTextScaleCommit`/`runPasteLayer`); `HistoryStack.prune()` is dead code; the zoom-percentage convention is unbranded.

### Verified sound (no action)

Immutable updates everywhere, granular selectors, the memento-doc + engine-replay-pixels command split, and `vitest.setup.ts` fully resets all four singletons.

## 2 · Visual baseline compliance

**Green and genuine.** `pnpm test:visual` → `1 passed (3.4s)`, reused `:5173`, master committed at `42f6a98`, working tree clean.

The assertion **could actually fail** on a real regression — not vacuous: two independent buffers (live `canvas.screenshot()` vs the committed 1576×1028 master, 68.8% non-white content), `pixelmatch` with a real AA threshold (0.1) and a real <1% budget (~16,201 px), a **dimension guard before the diff**, the `UPDATE_MASTER` branch env-gated and returning *before* the diff (a normal run can't self-bless), and element-scoped to `canvas-stage`.

**Main maintenance hazard:** the replay coordinates are viewport-absolute and load-bearing — they only line up at the pinned 1920×1080 *and* the static 75% zoom. Any change to default zoom, rail widths, or canvas centering shifts the whole drawing (the 1% budget would correctly catch it, but as a brittle failure). Settling uses fixed `waitForTimeout`s — fine on a warm dev server, theoretically under-settles on a cold first compile. Not flaky-by-timeout today.

## 3 · Spec drift & recommended UX optimizations

### Code fixes (user-visible)

- 🔴 **Text tool top-bar hint reads "Text tool — coming in v0.5"** (`ToolProperties.tsx:203-214`) for a shipped MVP tool — and the left rail correctly says it works, so the app contradicts itself. Replace with a real hint or text size/colour quick-params.
- **Layer rows:** `role=option` inside a plain `<ul>` is invalid ARIA nesting. Add `role="listbox"` to the `<ul>` (it already has `aria-label`) — one line, makes the spec's "list of option items" correct.
- Open failure → non-blocking toast (distinguish wrong-version vs corrupt); dirty-dot → derive from undo position/save token (or drop it); optionally enforce the layer cap with a disabled `+`/Paste at 50 so the limit is *visible*, not silent.

### Doc-only updates (no code change)

- Properties panel is static/decorative, **not** "tool-specific for Paint" → fix `UI_UX_SPEC.md:31`.
- Reorder threshold is **4px** (dnd-kit `distance:4`), not ~7px → `UI_UX_SPEC.md:98`.
- "fit-to-screen settles to 75%" → it's a **static 75% initial, nothing auto-fits** → `UI_UX_SPEC.md:30` + `draw-smiley.ts:34`.
- 1px stamp-nudge is a **Playwright pointer quirk**, not an engine limit (the engine stamps on pointer-down).
- Eyedropper samples the **white-backed composite** (transparent → white) — add a line.
- Stale "v0.5 / dimmed" comments + dead disabled-tool code in `tools.ts` / `LeftRail.tsx` — clean up.

### Verified accurate (no action)

Tool roster/shortcuts, zoom/shape-flyout/colour-picker aria-labels, canvas-stage testid, the amber/eye colours, eyedropper compositing, and the brush-ring `zoom/100` fix all check out.

## False positive dropped

> `duplicateLayer`/`pasteLayer` don't bump `nextLayerNum`. **Refuted** — the description is factually correct but the finding self-admits "no correctness bug"; display names needn't be unique, so it's a note, not a defect.

---

*Generated by a multi-agent review workflow (audit → adversarial verification). Findings cite `file:line` against commit `42f6a98`; line numbers may drift as the branch evolves.*
