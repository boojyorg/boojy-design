# Boojy Design — Backlog

Unscheduled / someday. Non-feature tasks (bugs, QoL, chores) land here as they arise; pull an item
into `dreams.md` when it becomes the active target. Ordered milestones → `ROADMAP.md`.

- **Top bar: wire the project-name "document menu" (reference impl for the suite contract).**
  `FilenameField` is already stubbed (`title="Rename / project settings"`, no `onClick`). Per the
  suite-wide top-bar grammar (`docs/BRAND.md` → "Top bar / app chrome"): the logo opens an **app
  menu** (Design's `AppMenu` already does this — keep) and the **project name** opens a **document
  menu** (Rename → inline edit · Save / Save As · Save version · Project settings · Export · Close),
  with a dirty-dot indicator (already present). Design is the cheapest reference implementation
  because the field is pre-stubbed; once it lands, Audio (logo currently bare-jumps to Start screen —
  should menu instead) and Notes (logo opens Settings directly) get retrofitted to match.

Deferred **features** are tracked as ⬜ in `FEATURE_TRACKER.md` (lasso, text formatting, blend
modes, elliptical marquee, skew/shear, paint masking) — they're capabilities, not loose tasks, so
they live in one home there rather than being duplicated here.
