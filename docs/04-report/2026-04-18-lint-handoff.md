# 2026-04-18 Lint Handoff

## Goal
- Continue the harness-engineering follow-up by reducing the existing repository lint backlog safely.
- Keep changes additive and local.
- Do not change attendance/report/accounting business behavior.
- Do not change auth, permissions, or RLS.

## Completed Today
- Safely rewrote these accounting files:
  - `src/components/accounting/AccountingClient.tsx`
  - `src/components/accounting/AccountingLedger.tsx`
  - `src/components/accounting/AccountingRecordForm.tsx`
  - `src/components/accounting/ExpenseRequestForm.tsx`
- Main technical cleanup:
  - removed effect-based default department initialization
  - replaced mutable render-time balance accumulation with pure derived data
  - removed unstable callback patterns that were triggering React Compiler lint failures

## Latest Verification
- Command run: `npm run lint`
- Latest result: `68 problems (37 errors, 31 warnings)`

Progress reference:
- Earlier cleanup baseline: `91 problems`
- Intermediate checkpoint: `77 problems`
- Current checkpoint: `68 problems`

## Highest-Priority Next Tasks
1. `src/components/meetings/MeetingDetail.tsx`
   - remaining error: `react-hooks/set-state-in-effect`
2. `src/app/(dashboard)/members/[id]/page.tsx`
   - remaining warnings: unused `router`, missing dependency around `loadMember`
3. `src/components/attendance/AttendanceGrid.tsx`
   - remaining error: replace raw `<a href="/members">` with `next/link`
4. `src/components/reports/ReportForm.tsx`
   - remaining error: restore effect still calls `setDraftReportId` directly
5. Remaining explicit `any` clusters:
   - `src/components/reports/EditReportClient.tsx`
   - `src/components/reports/ReportDetail.tsx`
   - `src/components/reports/ReportPrintView.tsx`
   - `src/components/ui/RichTextEditor.tsx`
   - `src/components/accounting/ExpenseRequestList.tsx`
   - `src/components/approvals/ApprovalsClient.tsx`

## Cautions
- The git worktree is very dirty and includes many unrelated modified/untracked files. Do not revert unrelated changes.
- `MeetingDetail.tsx` was accidentally deleted during an earlier patch attempt and then restored. Be careful with file-level rewrites.
- Some repo documents have encoding issues. Prefer append-only notes over broad rewrites unless necessary.

## Recommended Restart Sequence
1. Re-run `npm run lint` immediately.
2. Fix `MeetingDetail.tsx` and `src/app/(dashboard)/members/[id]/page.tsx`.
3. Fix `AttendanceGrid.tsx` and `ReportForm.tsx`.
4. Then continue through the remaining `any`-heavy report/editor files.
