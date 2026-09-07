# Boojy Design — Backlog

The one planning file. Development is currently paused: the app is a working preview (v0.4.0,
live at design.boojy.org) and nothing here is scheduled. Shipped work is in `CHANGELOG.md`; what
the app does is in `FEATURES.md`; how it's built is in `AGENTS.md` and `.claude/rules/`.

## When development resumes (each its own milestone, plan first)

1. **Engine stateful tail (~600 lines).** Marquee/float, the free-transform gesture, and
   overlay/hit-test rendering still live in `CanvasEngine.ts` (~1540 lines). Extract them via
   **controller classes holding engine refs**, not pure functions (pure extraction was right for
   text/stroke/thumbnail and is wrong here). Higher regression risk: `pnpm dev` walkthrough per step.
2. **Split `CanvasStage.tsx` (~726 lines).** Ref-heavy (12+ refs for stable callbacks across tool
   switches); separates pointer dispatch, text editing, pan and engine lifecycle. Its own plan.

## Tasks

- **Top bar: wire the project-name "document menu" (reference impl for the suite contract).**
  `FilenameField` is already stubbed (`title="Rename / project settings"`, no `onClick`). Per the
  suite-wide top-bar grammar (suite root `docs/BRAND.md` → "Top bar / app chrome"): the logo opens an
  **app menu** (Design's `AppMenu` already does this — keep) and the **project name** opens a
  **document menu** (Rename → inline edit · Save / Save As · Save version · Project settings · Export
  · Close), with a dirty-dot indicator (already present). Design is the cheapest reference
  implementation because the field is pre-stubbed; once it lands, Audio and Notes get retrofitted.
- **Dependabot cadence while paused (consider; not done).** Weekly bumps on a paused repo are noise;
  monthly grouped bumps were suggested in June. A config change to decide on deliberately.

## Deferred features

Capabilities, not tasks; each needs its own plan when picked up.

- Lasso / freehand selection
- Elliptical marquee
- Paint masking within a selection
- Blend modes (multiply / screen / overlay — significant engine work)
- Font family picker
- Text alignment (left / centre / right)
- Multi-line text wrapping
- Skew / shear
- Animation (the suite-level intent for Design's next big feature; see suite root `VISION.md`)
