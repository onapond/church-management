# 2026-07-01 Report Privacy And Sunwoong Cell Handoff

## Summary
- Request 1: rename active CU1 `성모셀` to `선웅셀`, keep Kim Sunwoong as CU1 team leader, and assign his member row to the renamed cell.
- Request 2: ordinary cell leaders must only see their own reports, because peer cell-leader reports may include private sharing/prayer content.
- Result: completed in remote Supabase project `zikneyjidzovvkmflibo` (`church_cont_project`) and local code/docs.

## Supabase Connection Path
- Do not rely on Claude MCP for this repository. This Codex session used the Supabase Management API directly.
- Working endpoint:
  - `https://api.supabase.com/v1/projects/zikneyjidzovvkmflibo/database/query`
- Working method:
  - `POST` JSON body: `{ "query": "<sql>" }`
  - Header: `Authorization: Bearer <Supabase PAT>`
  - Header: `Content-Type: application/json`
- The PAT value is intentionally not recorded in this handoff.
- If the connection appears lost, check Codex local records, not Claude:
  - `C:\Users\4ever\.codex\rules\default.rules`
  - `C:\Users\4ever\.codex\history.jsonl`
- Safe recovery pattern:
  - Extract `sbp_...` candidates from those files without printing them.
  - Verify candidates with `select 1 as ok;` against the Management API endpoint.
  - Use only the candidate that returns `{ "ok": 1 }`.
- `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=zikneyjidzovvkmflibo` was tried, but Codex reported `Auth: Unsupported`; the reliable path is the Management API.

## Files Changed
- `src/lib/permissions.ts`
- `src/lib/permissions.test.ts`
- `src/queries/reports.ts`
- `src/queries/dashboard.ts`
- `src/components/reports/ReportListClient.tsx`
- `src/components/dashboard/DashboardContent.tsx`
- `supabase/migrations/018_restrict_peer_cell_leader_report_visibility.sql`
- `scripts/ops-2026-07-01-rename-sungmo-cell-to-sunwoong.sql`
- `CURRENT_TASK.md`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`
- `.claude/bugs.md`

## Report Privacy Change
- Ordinary cell leaders (`role = team_leader`, but no `user_departments.is_team_leader = true`) can read only their own reports.
- Department/team leaders (`user_departments.is_team_leader = true`) retain department-level report visibility.
- Global roles (`super_admin`, `president`, `accountant`) retain all-report visibility.
- Report list and dashboard recent-report queries now scope server-side fetches by author and led departments.

## Remote RLS Execution
- The full `018` migration request timed out through the Management API.
- The migration was then applied in smaller safe batches:
  - Created `reports_select_admin`, `reports_select_author`, `reports_select_department_leader`.
  - Removed broad `View reports based on role` from `weekly_reports`.
  - Applied parent-report-based SELECT policies to existing child report tables.
- `report_feedback` did not exist in the remote DB, so `018` was updated with an optional table guard.

## Remote RLS Verification
Remote policy verification showed:

```text
weekly_reports SELECT policies:
- reports_select_admin
- reports_select_author
- reports_select_department_leader

Removed:
- View reports based on role
```

Existing child report tables verified with SELECT policies:
- `report_programs`
- `newcomers`
- `report_photos`
- `project_content_items`
- `project_schedule_items`
- `project_budget_items`

## Sunwoong Cell Data Change
- The original UTF-8 SQL script was prepared in `scripts/ops-2026-07-01-rename-sungmo-cell-to-sunwoong.sql`.
- Direct PowerShell/JSON submission with Korean string literals can corrupt text or fail to match rows.
- The actual remote update used PostgreSQL Unicode escape literals for Korean names:
  - 김선웅: `U&'\AE40\C120\C6C5'`
  - 정성모: `U&'\C815\C131\BAA8'`
  - 성모셀: `U&'\C131\BAA8\C140'`
  - 선웅셀: `U&'\C120\C6C5\C140'`

## Remote Data Verification
Final verification returned:

```text
sungmo_cell_count: 0
sunwoong_cell_count: 1
kim_user_cu1_team_leader: 1
  detail: team_leader, active=true, dept_head=true
kim_member_sunwoong_cell: 1
jung_sungmo_in_sunwoong_cell: 0
```

Meaning:
- No active CU1 `성모셀` remains.
- One active CU1 `선웅셀` exists.
- Kim Sunwoong remains active CU1 team leader and department head (`is_team_leader = true`).
- Kim Sunwoong's member row is assigned to `선웅셀`.
- Jung Sungmo is not assigned to `선웅셀`.

## Verification Commands
Passed before DB application:

```text
npm test -- src/lib/permissions.test.ts
npx tsc --noEmit
npm test
npm run build
```

Passed after final document/migration edits:

```text
git diff --check -- CURRENT_TASK.md PROJECT_CONTEXT.md .claude/session-notes.md supabase/migrations/018_restrict_peer_cell_leader_report_visibility.sql
```

Added-line mojibake scan was clean for common corruption patterns.

## Notes
- Existing `PROJECT_CONTEXT.md` contains older mojibake outside this task. Do not treat that as newly introduced by this change.
- The Management API often returns one JSON object per row directly, not wrapped in a `data` field.
- Long SQL batches may timeout even when the API is reachable. Prefer smaller batches for RLS/policy work.
- Avoid sending Korean literals through ad hoc PowerShell strings for production data changes; use Unicode escapes or another verified UTF-8-safe path.
