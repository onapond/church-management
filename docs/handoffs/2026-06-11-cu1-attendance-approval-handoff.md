# 2026-06-11 CU1 Attendance And Approval Handoff

## Request
1cheongnyeon team leader requested:

- Add Do Jisu to Dahui cell.
- Add Park Cheolho to Mina cell.
- Investigate why attendance checks did not apply while writing this week's Seongmo cell report.
- Bulk-complete existing reports in the approval pending box.

## Completed Locally
- Attendance screen now loads both present and absent attendance records for the selected date.
- Attendance insert paths now use explicit `onConflict: member_id,attendance_date,attendance_type`.
- Individual attendance toggles now check Supabase write results, roll back optimistic UI state on failure, and show a toast error.
- Bulk attendance actions now apply only to the currently visible filtered member list and also roll back on write failure.
- Prepared data-only operational SQL at `scripts/ops-2026-06-11-cu1-request.sql`.

## Operational SQL Scope
The SQL script:

- Assigns `도지수` to `다희셀`.
- Assigns `박철호` to `민아셀`.
- Bulk-final-approves existing CU1 `cell_leader` reports that are still in `submitted`.
- Reuses existing `approval_history` rows where final approval history already exists.
- Inserts missing `approval_history` rows for newly bulk-approved reports.

## Guardrails
- No schema changes.
- No RLS policy changes.
- No auth flow changes.
- No accounting changes.
- Report approval code remains unchanged; only the prepared operational SQL changes existing CU1 cell-leader report data.

## Verification
- `npx tsc --noEmit` passed.
- `npm test` passed, 153 tests.
- `npm run build` passed.

## Blocker
Production data SQL was not executed. The cached Supabase MCP token in `.codex_mcp_apply.ps1` returned `Unauthorized` on a harmless `select 1` test.

## Next Step
Run `scripts/ops-2026-06-11-cu1-request.sql` with a fresh Supabase admin/PAT/MCP connection, then verify:

```sql
select m.name, c.name as cell_name
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
left join public.cells c on c.id = md.cell_id
where d.code = 'cu1'
  and m.name in ('도지수', '박철호')
order by m.name;

select count(*)::int as pending_cu1_cell_leader_reports
from public.weekly_reports wr
join public.departments d on d.id = wr.department_id
where d.code = 'cu1'
  and wr.report_type = 'cell_leader'
  and wr.status = 'submitted';
```
