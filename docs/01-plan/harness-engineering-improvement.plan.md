# Harness Engineering Improvement Plan

## Objective
Increase repository reliability for coding agents by closing three gaps:
- missing current-task context
- weak verification entrypoint
- high dependence on manual discipline for documentation and handoff

## Baseline
- Strong rule documents already exist in `AGENTS.md`, `PROJECT_CONTEXT.md`, and `CLAUDE.md`.
- Security and permission constraints are clearly stated.
- Verification exists, but execution is manual and not normalized behind one command.
- `CURRENT_TASK.md` was referenced as mandatory but did not exist.

## Week 1 Plan

### Day 1: Restore the missing task contract
- Add `CURRENT_TASK.md` as the working contract for every implementation task.
- Require impact notes for attendance, report, accounting, and auth/RLS boundaries.
- Define completion criteria, file scope, risks, and verification before coding starts.

### Day 2: Normalize verification
- Add `npm run typecheck`.
- Add `npm run docs:check` to verify required harness documents exist and that `CURRENT_TASK.md` preserves the required sections.
- Add `npm run verify` as the single local pre-completion command.

### Day 3: Tighten document operating flow
- Update team habit so `CURRENT_TASK.md` is filled before any feature or bugfix work.
- Use `.claude/session-notes.md` as running memory only, not as the primary task contract.
- Keep `CURRENT_TASK.md` focused on the present task and reset it when a new task begins.

### Day 4: Prepare automation hardening
- Add a CI workflow that runs `npm run verify` on pull requests and pushes to the primary branch.
- Fail fast when required harness documents are missing.
- Keep DB-changing work gated behind migration files and manual Supabase verification.

### Day 5: Add change-aware checks
- Extend `docs:check` to inspect git diff and warn or fail when:
  - `src/` or `supabase/migrations/` changed without `CURRENT_TASK.md`
  - schema or permission changes happened without `docs/TECHNICAL_SPEC.md`
  - user-facing behavior changed without `docs/USER_GUIDE.md`
  - implementation changed without `.claude/session-notes.md`

### Day 6: Add reviewer-facing checklists
- Add a lightweight merge checklist for:
  - additive vs invasive change
  - attendance/report/accounting regression risk
  - auth/RLS boundary review
  - verification evidence
  - required doc updates

### Day 7: Retrospective and calibration
- Review one week of tasks and identify which checks created friction or missed regressions.
- Calibrate `docs:check` and the future CI workflow to reduce false positives.
- Decide whether to add staged-only enforcement or keep checks local plus CI.

## Deliverables
- `CURRENT_TASK.md` template in the repo root
- `npm run verify`
- `npm run docs:check`
- follow-up CI task for automatic enforcement

## Success Criteria
- No task starts without a concrete current-task contract.
- Every completion claim can point to one verification command.
- Agents and humans can identify required documentation before implementation starts.
- The repo reduces context drift between task intent, implementation, and handoff.
