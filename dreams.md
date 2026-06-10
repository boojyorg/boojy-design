# DREAMS.md — Boojy Design Active Target

> §1 only. Active engineering target + milestone checklist — volatile working state.
> History lives in `git log` + `CHANGELOG.md`; cross-session learnings live in auto memory
> (`/memory`); load-bearing rules live in `CLAUDE.md` + `.claude/rules/`.

## 🎯 Active Engineering Target — MVP complete (v0.4.0); next = engine stateful tail / CanvasStage split

**Status (2026-06-09):** MVP is complete and on `main` (live text layers + layer opacity, v0.4.0).
The post-MVP structure & quality pass shipped (engine pure/ctx-taking split, lint warnings cleared,
Konva vendor chunk, `DEFAULT_TEXT_COLOR` dedupe — see `git log` / `CHANGELOG.md`). The 2026-06-08
architecture & visual review is done — findings triaged into `docs/BACKLOG.md` (incl. 2 high-priority
correctness items: text-undo gaps, unbounded layer memory); report in
`docs/reviews/2026-06-08-architecture-visual-review.md`. No target is currently in flight. The two
candidate next milestones below each need a plan-mode pass before starting; the review findings
should feed that triage.

### Next targets (each its own milestone — plan-mode first)

- [ ] **Engine stateful tail (~600 lines).** Marquee/float, free-transform gesture, and overlay/hit-test
  rendering still live in `CanvasEngine.ts` (~1540 lines). This is where the remaining size + per-edit
  cost actually sits. It is stateful Konva orchestration — extract via **controller classes holding
  engine refs**, NOT pure functions (pure extraction was right for text/stroke/thumbnail; it's wrong
  here). Higher regression risk → `pnpm dev` walkthrough per step.
- [ ] **Split `CanvasStage.tsx` (~726 lines).** Second-biggest file: ref-heavy (12+ refs for stable
  callbacks across tool switches), mixing pointer dispatch + text editing + pan + engine lifecycle.
  Separate from the engine; its own plan.
