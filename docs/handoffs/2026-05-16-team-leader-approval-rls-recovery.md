# Handoff — Team-Leader Approval RLS Fix + 49-row Recovery

**Created**: 2026-05-16
**Feature ID**: `team-leader-approval-rls`
**Status**: ⚠️ Partially complete — 49 historical rows still need recovery
**Branch**: main (working tree dirty with unrelated changes)

---

## TL;DR

A team leader pressing "최종승인" on a `cell_leader` report was silently failing
because the `reports_update_approver` RLS policy did not include `team_leader`.
Postgres returned 0 rows-updated without an error, the UI showed the report as
still in `submitted` (결재대기), and 49 historical reports have accumulated in
this broken state. The RLS fix is deployed. The 49-row historical recovery is
**not yet executed**.

---

## 1. Problem statement

- User report: "1청년 팀장이 셀장 보고서를 결재해도 여전히 결재대기로 나옴."
- Reproduction: any `team_leader` user whose `user_departments.is_team_leader = true`
  approving a `report_type = 'cell_leader'` report in their department.

## 2. Root cause

File: `supabase/rls-policies.sql` (lines 275–283, original)

```sql
CREATE POLICY "reports_update_approver" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
  );
```

`team_leader` was missing. The client (`src/lib/permissions.ts:86` `canApprove`,
and `src/components/reports/ReportDetail.tsx:32-62` `checkApprovalPermission`)
correctly grants approval UI to team leaders on cell-leader reports in their
own department, but the DB layer silently filtered the UPDATE row.

Postgres+Supabase behavior: an UPDATE that matches no rows under RLS returns
`{ error: null, data: [] }`, not an error. The handler in
`src/components/reports/ReportDetail.tsx:332-344` does
`if (updateError) throw updateError` — which passes — then inserts a row into
`approval_history` (RLS-allowed because `approver_id = auth.uid()`). Result:
`approval_history` shows the attempt, but `weekly_reports.status` is unchanged.

## 3. What is done

### 3.1 RLS policy fix (deployed in production)

- Migration file written: `supabase/migrations/007_team_leader_approve_rls.sql`
- Executed manually by the user in Supabase Dashboard → SQL Editor on 2026-05-12.
- The new policy adds an OR branch for `team_leader`:

```sql
OR (
  report_type = 'cell_leader'
  AND EXISTS (
    SELECT 1 FROM public.user_departments ud
    WHERE ud.user_id = auth.uid()
      AND ud.department_id = weekly_reports.department_id
      AND ud.is_team_leader = true
  )
)
```

After this change, new approval attempts by team leaders work correctly.

### 3.2 Recovery script

- Script: `scripts/recover-cell-leader-approvals.mjs`
- Uses Supabase Management API (`POST /v1/projects/{ref}/database/query`)
- Requires `SUPABASE_ACCESS_TOKEN` env var (PAT)
- Performs:
  1. Snapshot BEFORE
  2. UPDATE … RETURNING wr.id  (auto-commit, no `BEGIN`)
  3. Snapshot AFTER
  4. `still_pending` count (must be 0)
  5. Recovered approver/department distribution (last 10 min)

## 4. What is NOT done

### 4.1 Historical 49-row recovery (HIGH PRIORITY)

User confirmed the impact-preview query returned **49 rows** on 2026-05-12.
The user then attempted to run the bulk UPDATE in Supabase SQL Editor inside
a `BEGIN;` block. Supabase SQL Editor's statement-by-statement execution
appears to have broken the transaction boundary — the snapshot after the
attempt showed `submitted=63, final_approved=7`, identical to the
pre-update state. **The update did NOT take effect.**

The recovery is therefore still pending. Two acceptable paths:

#### Path A — Run the recovery script with a fresh PAT

```bash
# 1. Issue a new PAT at https://supabase.com/dashboard/account/tokens
# 2. Run:
SUPABASE_ACCESS_TOKEN="sbp_xxx" node scripts/recover-cell-leader-approvals.mjs
```

The script's UPDATE has no `BEGIN`, so Management API auto-commits it.

> Note: the previously cached PAT `sbp_f646...`
> stored in MEMORY.md returned **HTTP 401 Unauthorized** on 2026-05-12 — assume
> revoked or expired. Update MEMORY.md once a new PAT is in place.

#### Path B — Run the single UPDATE directly in SQL Editor (without `BEGIN`)

Copy-paste this **alone** into Supabase SQL Editor:

```sql
UPDATE weekly_reports wr
SET
  status            = 'final_approved',
  final_approver_id = latest.approver_id,
  final_approved_at = latest.created_at,
  final_comment     = latest.comment
FROM (
  SELECT DISTINCT ON (report_id)
    report_id, approver_id, created_at, comment
  FROM approval_history
  WHERE to_status = 'final_approved'
  ORDER BY report_id, created_at DESC
) AS latest
WHERE wr.id = latest.report_id
  AND wr.report_type = 'cell_leader'
  AND wr.status = 'submitted';
```

Then verify:

```sql
-- expect 0
SELECT COUNT(*) AS still_pending
FROM weekly_reports wr
JOIN approval_history ah ON ah.report_id = wr.id
WHERE wr.report_type = 'cell_leader'
  AND wr.status = 'submitted'
  AND ah.to_status = 'final_approved';
```

And review who got auto-approved (sanity check before announcing to users):

```sql
SELECT u.name AS approver, d.name AS dept, COUNT(*) AS recovered
FROM weekly_reports wr
JOIN users u ON u.id = wr.final_approver_id
LEFT JOIN departments d ON d.id = wr.department_id
WHERE wr.report_type = 'cell_leader'
  AND wr.status = 'final_approved'
  AND wr.final_approved_at >= NOW() - INTERVAL '10 minutes'
GROUP BY u.name, d.name
ORDER BY recovered DESC;
```

### 4.2 Client-side defense against silent RLS denials (RECOMMENDED)

`src/components/reports/ReportDetail.tsx:332` should be hardened so this kind
of silent failure never happens again. Suggested change:

```ts
const { error: updateError, data: updated } = await supabase
  .from('weekly_reports')
  .update({ ...updateData, status: newStatus })
  .eq('id', report.id)
  .select()        // ← force returning rows

if (updateError) throw updateError
if (!updated || updated.length === 0) {
  throw new Error('권한이 없거나 변경되지 않았습니다 (RLS)')
}
```

Apply the same pattern wherever an admin-only or approver-only UPDATE is
issued (search for `.update(` on `weekly_reports`, `approval_history`,
`expense_requests`, etc.).

### 4.3 Documentation hygiene

- `MEMORY.md`: PAT token line is stale → update or remove after Path A is
  taken. Add a one-liner under "주의사항" about silent RLS denials.
- `supabase/rls-policies.sql`: lines 275–283 still show the pre-fix policy
  text. Sync the file with migration 007 so future re-runs of the canonical
  policy file stay in step with production.
- `docs/.bkit-memory.json`: optional — bump `sessionCount`, set
  `currentFeature` to `team-leader-approval-rls`, `currentPhase` to `act`
  (Check failed once; Act-side recovery still pending).

## 5. Verification checklist (after recovery is run)

- [ ] `still_pending` query returns 0
- [ ] Approver/department distribution looks sensible (no unexpected names)
- [ ] Log in as a 1청년 team leader → `/approvals` → pick a fresh
      `submitted` cell-leader report → 최종승인 → status flips to
      `final_approved` immediately (no refresh trick needed)
- [ ] `approval_history` for that report contains exactly one new
      `submitted → final_approved` row
- [ ] Toast/UI shows success; no console error
- [ ] (If 4.2 applied) Try the same flow as a non-team-leader user on the
      same department's cell-leader report and confirm the new defensive
      error message fires instead of a silent success.

## 6. Affected / referenced files

- `supabase/rls-policies.sql` (lines 275–283 — pre-fix text still there)
- `supabase/migrations/007_team_leader_approve_rls.sql` (new)
- `scripts/recover-cell-leader-approvals.mjs` (new)
- `src/lib/permissions.ts:86` — `canApprove`
- `src/components/reports/ReportDetail.tsx:32-62` — `checkApprovalPermission`
- `src/components/reports/ReportDetail.tsx:318-345` — `handleApproval`
  (this is where the defensive `.select()` should be added)
- `src/queries/approvals.ts:47-57` — team leader pending-report filter
- `src/components/approvals/ApprovalsClient.tsx:264-269` — UX text describing
  team leader as final approver for cell-leader reports

## 7. Notifications side-effect to be aware of

`createApprovalNotification` runs inside the same `Promise.all` as the
`approval_history` insert (`ReportDetail.tsx:334-337`). Because the
notification path does not check whether the underlying UPDATE succeeded,
**affected report authors may have already received "최종 승인됨" push
notifications** for the 49 rows. After recovery, the data state will match
the notifications they already saw, so no contradictory message needs to be
sent. If the recovery is delayed, do not re-trigger approval from the UI on
those rows — that would create a second notification.

## 8. Resume point for the next session

1. Pick Path A or Path B in §4.1 and execute.
2. Run the verification checklist in §5.
3. (Optional but strongly recommended) Apply §4.2 defensive `.select()` and
   ship as a small standalone commit.
4. Update `MEMORY.md` and `supabase/rls-policies.sql` per §4.3.
5. Close this handoff by appending a "RESOLVED" line at the bottom of this
   file with the date and the actual recovered row count.
