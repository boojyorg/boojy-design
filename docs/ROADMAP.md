# Boojy Design — Roadmap

Ordered intentions. Per-feature **status** → `FEATURE_TRACKER.md`; unscheduled ideas →
`BACKLOG.md`; this-week's target → `dreams.md`.

## Shipped

v0.1–v0.2.1 core editor → **v0.4.0 MVP cap** (live text layers). Per-feature status in
`FEATURE_TRACKER.md`.

## Now / Next (each its own milestone — plan-mode first)

1. **Engine stateful tail (~600 lines).** Extract marquee/float, free-transform gesture, and
   overlay/hit-test rendering out of `CanvasEngine.ts` via **controller classes holding engine
   refs** (not pure functions — pure extraction was right for text/stroke/thumbnail, wrong here).
   Higher regression risk → `pnpm dev` walkthrough per step.
2. **Split `CanvasStage.tsx` (~726 lines).** Ref-heavy (12+ refs for stable callbacks across tool
   switches); separate pointer dispatch / text editing / pan / engine lifecycle.

## Later

Deferred features (lasso, text formatting, blend modes, etc.) → `BACKLOG.md` and the ⬜ rows in
`FEATURE_TRACKER.md`.
