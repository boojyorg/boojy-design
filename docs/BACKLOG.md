# Boojy Design — Backlog

Unscheduled / someday. Non-feature tasks (bugs, QoL, chores) land here as they arise; pull an item
into `dreams.md` when it becomes the active target. Ordered milestones → `ROADMAP.md`.

From the [2026-06-08 architecture & visual review](reviews/2026-06-08-architecture-visual-review.md)
(28 confirmed findings; `file:line` cited against `42f6a98`):

**High — correctness / UX**
- [ ] **Text edits bypass the undo timeline (3 entry points).** `addTextLayer` (`EditorV1.tsx:148`),
  `setLayerTextColor` (`:356`), `setLayerFontSize` from the sidebar (`:354`) mutate `documentStore`
  with no `record()`, so an unrelated ⌘Z silently reverts them. Fix = the live+commit pattern
  (mirror `onCommitLayerOpacity`). Canvas-drag font path already records correctly.
- [ ] **Text tool top-bar hint still says "coming in v0.5"** (`ToolProperties.tsx:203-214`) for a
  shipped tool — the left rail says it works, so the app contradicts itself. Replace with a real
  hint or text quick-params.

**Medium**
- [ ] **Memory is doubly unbounded.** The documented 50-layer cap is enforced nowhere (all four
  insert actions prepend unconditionally); deleting a layer never prunes its thumbnail
  (`thumbnailStore.ts:22`, raster/paste/duplicate only). Gates any milestone that raises layer
  counts. Fix = `MAX_LAYERS` guard at the insert boundary + evict thumbnail on layer removal.
- [ ] **Layer rows: `role=option` inside a plain `<ul>`** (invalid ARIA nesting). Add
  `role="listbox"` to the `<ul>` (already has `aria-label`).
- [ ] **Open path robustness** (`EditorV1.tsx:97-125`): no in-flight guard (overlapping opens race
  during decode; `clearUndo()` can wipe intervening work) and parse failures are swallowed (no
  toast; wrong-version vs corrupt indistinguishable). Add a load-generation guard + surface errors.
- [ ] **Unsaved dot is hardcoded** (`TopBar.tsx:58` `dirty`) — always lies. Derive from the undo
  position / a save token, or drop it.

**Low — maintainability**
- [ ] `EditorV1` god-component trajectory: extract `usePersistence` / `useTextLayerController` /
  `useClipboardCommands` hooks.
- [ ] Latent footguns: half-formalized `PixelPort` seam; region inline-closures + no `React.memo`
  (measure first); `setBrushSize` skips `clampSize`; `viewportStore.reset()` aliases `INITIAL`;
  undocumented transform-vs-memento contract; dead `HistoryStack.prune()`; unbranded zoom-percent.

**Doc-only drift** (no code change) — see the review §3: Properties panel isn't "tool-specific"
(`UI_UX_SPEC.md:31`); reorder threshold is 4px not ~7px (`:98`); "fit-to-screen settles to 75%" is a
static initial (`:30` + `draw-smiley.ts:34`); stamp-nudge is a Playwright quirk; eyedropper samples
the white composite; stale "v0.5/dimmed" comments + dead disabled-tool code in `tools.ts`/`LeftRail`.

Deferred **features** are tracked as ⬜ in `FEATURE_TRACKER.md` (lasso, text formatting, blend
modes, elliptical marquee, skew/shear, paint masking) — they're capabilities, not loose tasks, so
they live in one home there rather than being duplicated here.
