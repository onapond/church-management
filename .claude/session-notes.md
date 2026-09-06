# 세션 노트

## 작업 이력 (2026-04-14, 세션 23)

### 완료된 작업

1. **셀장 보고서 취합 기능 신규 구현**
   - `/reports/aggregate` 페이지 — 날짜 선택 → 셀장 보고서 체크박스 선택 → 출석 합산 미리보기 → 주차보고서 draft 자동 생성
   - `useCellLeaderReportsByDate` 쿼리 훅 — 선택 날짜가 속한 주(월~일) 범위 조회, submitted/coordinator_reviewed/manager_approved/final_approved 상태 포함
   - `getWeekBounds` 유틸리티 — `src/lib/utils.ts`에 순수 함수로 추가, 6개 테스트(요일별·월 경계·연 경계)
   - 보고서 목록 상단에 "📊 셀 취합" 버튼 (팀장/관리자만 노출)

2. **bkit 품질 검증 (code-analyzer + gap-detector)**
   - gap-detector: Match Rate 91% PASS
   - code-analyzer: 72 → 82 → 92점 달성
   - 수정 항목: 날짜 범위 버그, 중복 응답 UX, 타입 캐스트, formatDate 적용, 중복 주석 등

3. **셀 이름 표시 수정**
   - `cells.name` 우선, 없으면 `meeting_title`에서 " 모임 보고서" 등 접미사 제거
   - `extractCellName()` 헬퍼 함수로 추출

4. **필드 매핑 버그 수정**
   - 셀장 보고서의 나눔내용/기도제목이 `notes` JSON이 아닌 `main_content`, `application_notes` 컬럼에 저장됨을 확인
   - 쿼리에 해당 컬럼 추가, 취합 로직 수정:
     - `main_content` (나눔내용) + `application_notes` (기도제목) → 논의사항
     - `notes.other_notes` (기타사항) → 기타사항

### 커밋 이력
- `cb677b5` — Add cell report aggregation feature for team leaders
- `a7363d2` — Fix cell name display and note aggregation
- `ad5822d` — Separate discussion and other notes
- `e64a8f2` — Fix note field mapping in cell report aggregation

### 현재 상태
- 배포 완료: https://church-opal.vercel.app
- 테스트: 153개 통과 (기존 대비 +27개)
- 빌드: 정상

### 다음 작업
- [ ] 보고서 저장 추가 이슈 모니터링
- [ ] ReportForm JSX 섹션별 컴포넌트 분리 (선택적)
## 2026-04-17 Harness Engineering Update
- Added root `CURRENT_TASK.md` and used it as the live task contract for harness work.
- Added `npm run docs:check`, `npm run typecheck`, and `npm run verify`.
- Added `docs/01-plan/harness-engineering-improvement.plan.md` for the next 1-week harness hardening plan.
- Verification passed for docs check, tests, typecheck, and build.
- `lint` still fails on existing repository issues inside `src/`; `verify` currently stops there by design.
## 2026-04-18 Handoff: Lint Backlog Reduction
- Goal today: continue the harness-engineering follow-up by reducing the existing repository lint backlog safely.
- Scope touched today:
  - `src/components/accounting/AccountingClient.tsx`
  - `src/components/accounting/AccountingLedger.tsx`
  - `src/components/accounting/AccountingRecordForm.tsx`
  - `src/components/accounting/ExpenseRequestForm.tsx`
- What changed:
  - Removed effect-based default department initialization in accounting forms.
  - Removed render-time mutable running balance logic in the ledger.
  - Removed unstable React Compiler callback patterns in the accounting client.
  - Kept auth, permissions, RLS, routes, and Supabase table usage unchanged.

### Verification
- Latest command: `npm run lint`
- Latest result: `68 problems (37 errors, 31 warnings)`
- Progress reference:
  - earlier lint baseline in this cleanup track: `91 problems`
  - intermediate checkpoint: `77 problems`
  - current checkpoint: `68 problems`

### Highest-priority next tasks
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

### Important cautions
- The worktree is very dirty with many unrelated modified/untracked files. Do not revert unrelated changes.
- `MeetingDetail.tsx` was accidentally deleted during earlier patch attempts and then restored. Be careful with file-level rewrites.
- Some repository docs have encoding issues. Prefer append-only handoff blocks over broad document rewrites unless necessary.

### Recommended restart sequence
1. Re-run `npm run lint` immediately.
2. Fix `MeetingDetail.tsx` and `src/app/(dashboard)/members/[id]/page.tsx`.
3. Fix `AttendanceGrid.tsx` and `ReportForm.tsx`.
4. Then continue through the remaining `any`-heavy report/editor files.

## 2026-04-18 MRO DX/AX Reference Document
- Added `docs/reference/mro-dx-ax-reference.md`.
- The document packages this project as a reusable DX/AX reference for external submission, with architecture summary, feature evidence, AX-ready design explanation, and screenshot checklist.
- No runtime code paths, permissions, auth, or RLS boundaries were changed.

## 2026-05-16 Team-Leader Approval RLS Fix + 49-row Recovery (PARTIAL)
- Bug: team_leader pressing 최종승인 on a cell_leader report silently failed.
- Root cause: `reports_update_approver` RLS policy missing `team_leader`.
  Postgres returned 0-rows-updated without error; UI stayed in 결재대기.
- Fix deployed: `supabase/migrations/007_team_leader_approve_rls.sql` was
  executed in Supabase Dashboard on 2026-05-12. New approvals now work.
- Historical impact: 49 cell_leader reports have `approval_history` rows
  showing `to_status = final_approved` while `weekly_reports.status` is still
  `submitted`. Bulk recovery attempted on 2026-05-12 inside a `BEGIN;` block
  via SQL Editor — did not commit (snapshot unchanged: submitted=63, final=7).
- Recovery script ready: `scripts/recover-cell-leader-approvals.mjs`. Cached
  PAT `sbp_f646...` returned 401 on 2026-05-12; needs a fresh PAT.
- Full handoff: `docs/handoffs/2026-05-16-team-leader-approval-rls-recovery.md`
- Open follow-ups:
  1. Run recovery (Path A: fresh PAT + script, or Path B: single UPDATE in SQL Editor without BEGIN).
  2. Add defensive `.select()` + row-count check in `ReportDetail.tsx:332` to fail loudly on future silent RLS denials.
  3. Sync `supabase/rls-policies.sql` lines 275-283 with migration 007.
  4. Update `MEMORY.md` PAT token line.

## 2026-05-31 1청년부 추가 인원 등록 준비
- Source file: `ref/1청년부 전체 명단 (26.05.08).xlsx`
- Parsed sheet `교인목록_2026_01_20 (3)` and confirmed 42 total 1청년부 rows.
- Compared against the existing local `scripts/update-members.mjs` 1청년부 baseline.
- Additions identified: 박철호, 도지수, 한수연b, 강태웅, 임한, 최유진, 이인혁, 봉준영.
- Added idempotent import artifacts:
  - `scripts/import-cu1-additions.mjs` for service-role execution.
  - `scripts/import-cu1-additions.sql` for Supabase SQL Editor execution.
- Verification:
  - `node --check scripts/import-cu1-additions.mjs` passed.
  - Running the script without credentials correctly stops with `SUPABASE_SERVICE_ROLE_KEY env var is required.`
- Blocker:
  - Actual remote Supabase insert was not executed because the local environment has no valid `SUPABASE_SERVICE_ROLE_KEY` or Supabase PAT.

## 2026-06-01 Meeting PDF Attachments
- Added migration `supabase/migrations/008_add_meeting_pdf_attachments.sql`.
- New columns on `meeting_minutes`: `pdf_file_path`, `pdf_file_name`, `pdf_file_size`, `pdf_uploaded_at`.
- Added private Supabase Storage bucket `meeting-pdfs` with PDF-only, 20MB limit and RLS aligned with meeting content edit permissions.
- Updated `MeetingForm` so new meeting creation can upload a PDF after the base meeting insert and store its metadata through the existing meeting minutes upsert path.
- Updated `MeetingDetail` to create a signed URL for the stored PDF and show it inline with a new-window link.
- Kept attendance, report, accounting, auth, and existing report approval workflow unchanged.

## 2026-06-01 Report Delete and Feedback
- Added report delete actions in both the list and detail views using the existing report-management permission rules.
- Added a separate `report_feedback` table and UI so `super_admin`, `president`, and `accountant` can leave feedback without changing approval state.
- Verification passed with `npx tsc --noEmit`, `npm test`, and `npm run build`.

## 2026-06-01 Meeting Delete and Feedback
- Added meeting delete actions in both the list and detail views using the existing meeting-content edit permission rules.
- Added a separate `meeting_feedback` table and UI so `super_admin`, `president`, and `accountant` can leave feedback without changing any meeting status.
- Verification passed with `npx tsc --noEmit`, `npm test`, and `npm run build`.

## 2026-06-01 Handoff Closed
- Final handoff for meeting delete and meeting feedback was written to `docs/handoffs/2026-06-01-meeting-delete-feedback-handoff.md`.
- Deployment target remains `https://church-opal.vercel.app`.
- Supabase SQL must be applied in order: `010_add_meeting_feedback.sql` first, then `011_add_meeting_delete_policies.sql`.

## 2026-06-11 CU1 Request - Partial Completion
- Request: add Do Jisu to Dahui cell, add Park Cheolho to Mina cell, investigate attendance save issue, and bulk-complete existing pending approvals.
- Completed locally:
  - `src/queries/attendance.ts` now loads false attendance rows and uses explicit upsert conflict keys.
  - `src/components/attendance/AttendanceGrid.tsx` now checks Supabase write errors, rolls back optimistic state, shows toast failures, and applies bulk actions to the filtered visible list.
  - `scripts/ops-2026-06-11-cu1-request.sql` contains the data-only SQL for member cell assignment and CU1 cell-leader pending-report final approval.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
  - `npm test` passed, 153 tests.
  - `npm run lint` passed.
  - `npm run build` passed.
- Blocker:
  - Existing Supabase MCP token returned `Unauthorized`; production SQL was not executed.

## 2026-06-12 CU1 Request - Production SQL Completed
- User ran `scripts/ops-2026-06-11-cu1-request.sql` directly in Supabase SQL Editor.
- Follow-up verification confirmed:
  - 도지수 is assigned to 다희셀.
  - 박철호 is assigned to 민아셀.
  - CU1 pending `cell_leader` submitted reports were bulk-final-approved.
- The prior Supabase MCP/PAT blocker for this CU1 operational request is resolved.

## 2026-06-12 Worktree Cleanup Handoff
- Consolidated accumulated uncommitted work in commit `9a55fa0` and pushed it to `origin/main`.
- Removed ignored local cache/scratch/reference artifacts and confirmed the working tree is clean.
- Full handoff: `docs/handoffs/2026-06-12-worktree-cleanup-handoff.md`.

## 2026-06-18 Meeting Agenda Discussion
- Added pre-meeting agenda discussion for meeting detail pages.
- New migration: `supabase/migrations/012_add_meeting_agenda_discussion.sql`.
- New UI component: `src/components/meetings/MeetingAgendaBoard.tsx`.
- Department leaders and administrators can add agenda/question/notice items and comment on each item before an in-person meeting.
- Updated the UI to match the provided Notion-style reference: agenda items are grouped under fixed department sections instead of only appearing as standalone cards.
- Existing attendance, report approval, accounting, meeting minutes, PDF attachments, and admin-only meeting feedback flows remain unchanged.
- Verification so far:
  - `npx tsc --noEmit` passed.
  - `npm run lint` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.
- Open item:
  - Remote Supabase migration application still needs a valid Supabase PAT/MCP connection.

## 2026-06-18 Meeting Edit And Cancel Actions
- Added explicit meeting detail actions for `수정` and `제출 취소`.
- Meeting base information can now be edited inline in `src/components/meetings/MeetingDetail.tsx`.
- Added `supabase/migrations/013_add_meeting_update_policy.sql` for authorized `meetings` updates.
- `제출 취소` uses the existing meeting bundle delete flow because meetings do not have a report-style submitted status.
- Verification so far:
  - `npx tsc --noEmit` passed.

## 2026-06-18 Department Agenda PDF Attachments
- Added `supabase/migrations/014_add_meeting_agenda_pdf_attachments.sql`.
- Department agenda items can now attach one PDF when created from `MeetingAgendaBoard`.
- Agenda PDFs reuse the private `meeting-pdfs` bucket under `agenda/{meetingId}/{departmentId}/...`.
- Attached PDFs appear under each agenda item through a signed URL.
- Verification so far:
  - `npx tsc --noEmit` passed.

## 2026-06-19 Meeting Team Leader PDF And Feedback Fix
- Bug report: team leaders could not upload meeting-tab PDF files and could not write meeting feedback.
- Root cause found locally:
  - Meeting feedback client and RLS used a role-only allowlist and excluded department team leaders.
  - Agenda PDFs needed explicit Storage policy coverage for `agenda/{meetingId}/{departmentId}/...` paths.
- Changes:
  - Added `canLeaveMeetingFeedback` in `src/lib/permissions.ts`.
  - Updated `src/components/meetings/MeetingDetail.tsx` to show the feedback form for permitted department team leaders.
  - Added `supabase/migrations/015_fix_meeting_team_leader_feedback_and_agenda_pdf.sql`.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 156 tests.
  - `npm run build` passed.
  - `npm run lint` passed.
- Open item:
  - Remote Supabase migration application was not executed because no Supabase MCP resources are available in this session.

## 2026-06-22 Meeting Agenda Edit UX
- User feedback: editing a long meeting agenda item felt too cumbersome because the edit box opened below the already-rendered agenda content.
- Changed `src/components/meetings/MeetingAgendaBoard.tsx` so agenda item edit mode hides the long read-only body and PDF preview while editing.
- Agenda item edit fields now open directly below the item header, autofocus the title, use a larger dynamic textarea, and save with Ctrl/Cmd+Enter.
- Comment editing now also autofocuses, uses a dynamic textarea, and supports Ctrl/Cmd+Enter.
- Scope stayed UI-only; no database, RLS, auth, attendance, report, accounting, meeting minutes, PDF storage, or feedback behavior changed.
- Verification so far:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
  - `npm run lint` passed.

## 2026-06-19 Meeting Agenda Participant Leader Permission
- Bug report: the pre-meeting agenda board showed the "department heads/admins only" message even though leader-meeting participants should be able to post agenda items and comment before the meeting.
- Root cause found locally:
  - `canParticipateInMeetingAgenda` and the agenda department selector required `user_departments.is_team_leader = true`.
  - Agenda item/comment RLS and agenda PDF Storage policies had the same department-head-only assumption.
- Changes:
  - `src/lib/permissions.ts` now treats active `team_leader` users as agenda participants.
  - `src/components/meetings/MeetingAgendaBoard.tsx` lets non-admin leaders choose from their linked departments, not only department-head flagged departments.
  - Added `supabase/migrations/016_allow_meeting_agenda_participant_leaders.sql` for agenda item insert, comment insert, and agenda PDF Storage policies.
  - Added permission tests for the leader-meeting participant rule.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test -- src/lib/permissions.test.ts` passed, 50 tests.
- Open item:
  - Remote Supabase migration application was not executed because no Supabase MCP resources are available in this session.

## 2026-06-19 Meeting Agenda And Comment Edit
- Bug report: agenda items and comments could be posted, but there was no edit function after posting.
- Root cause found locally:
  - `MeetingAgendaBoard` exposed create/delete/status actions but no agenda item edit state or update mutation.
  - Comments exposed create/delete actions but no update mutation/UI, and RLS did not define a comment update policy.
- Changes:
  - Added agenda item update mutation and inline edit form for title/type/content.
  - Added comment update mutation and inline edit form for comment text.
  - Added `supabase/migrations/017_add_meeting_agenda_edit_policies.sql` for agenda/comment update RLS.
- Verification so far:
  - `npx tsc --noEmit` passed.
  - `npm run lint` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
- Open item:
  - Remote Supabase migration application was not executed because no Supabase MCP resources are available in this session.

## 2026-06-24 Report Title And Agenda Comment UX
- Request: fix broken report creation title text, tighten the spacing between agenda comment `수정` and `삭제`, and make newly written comments appear immediately.
- Impact scope:
  - attendance/report/accounting flows: no behavioral impact.
  - additive change: yes, a narrow display/layout/client-cache refinement.
  - auth/RLS scope: unchanged; existing agenda comment insert/update/delete policies are reused.
- Files in scope:
  - `src/app/(dashboard)/reports/new/page.tsx`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/queries/meetings/useMeetings.ts`
  - required docs and session notes.
- Change:
  - Report creation page labels/title are readable Korean.
  - Agenda comment action buttons are grouped on the right instead of being spread across the row.
  - Agenda comment create/update/delete mutations update the local TanStack Query agenda cache immediately, then invalidate for server reconciliation.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.

## 2026-06-29 Report Photo Visibility And Submit Guard
- Request: investigate report complaints that a report could submit while writing and attached photos did not appear after submission.
- Impact scope:
  - attendance/report/accounting flows: attendance and accounting unchanged; report UI/save feedback hardened only.
  - additive change: yes, report photo display query/section and submit guard.
  - auth/RLS scope: unchanged; existing `report_photos` and `report-photos` policies remain authoritative.
- Files in scope:
  - `src/types/database.ts`
  - `src/queries/reports.ts`
  - `src/components/reports/ReportDetail.tsx`
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/components/reports/ReportForm.tsx`
  - required docs and session notes.
- Root cause:
  - Report detail did not query or render `report_photos`, so uploaded photo metadata had no visible UI on submitted reports.
  - Photo upload and metadata insert failures were logged but did not block the success path.
  - The report form allowed browser implicit submit behavior, so pressing Enter in normal inputs could trigger the submit button.
- Change:
  - Added `report_photos` typing and `useReportPhotos`.
  - Report detail renders attached photos before approval status.
  - Photo upload failures now surface through submit error handling.
  - Photo-bearing final submissions now stage as draft, upload photos, then promote the same report to submitted so upload failure leaves an editable draft instead of a submitted report missing photos.
  - Enter-key implicit form submit is blocked; explicit submit still works.
  - Follow-up review hardened the existing draft submit recovery path to use the saved report id for photo failures.
  - Activity photo upload now removes the Storage object when `department_photos` insert fails, and delete now checks Storage/DB errors.
  - Added `scripts/audit-photo-integrity.sql` as a read-only privileged SQL audit for table/storage consistency.
- Remote evidence:
  - Anon REST could not verify table row counts because `weekly_reports`, `report_photos`, and `department_photos` all returned `Content-Range: */0`.
  - Storage API confirmed existing uploaded files: `report-photos` has 32 top-level folders and 76 files; `department-photos` has 5 top-level folders and 50 files.
  - One sample public image from each bucket returned HTTP 200 and `image/jpeg`.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.

## Account Notes
- The user's GitHub/Supabase-related account name to remember is `tlsdygks1992-dotcom`.
- Current church Supabase project evidence: project ref `zikneyjidzovvkmflibo`, project name `church_cont_project`, organization title `tlsdygks1992-dotcom's Org`.

## 2026-06-30 Youth Registration Request - SQL Prepared
- Request: register 정나윤 in 청소년부 with birth date 2011-11-29, address 서울 마포구 구수동, phone 010-2881-5875, and school 신수중학교.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive change: yes, data-only member insert/update and department link.
  - auth/RLS scope: unchanged; must be run with existing admin/service context.
- Prepared script:
  - `scripts/ops-2026-06-30-youth-register-jung-nayoon.sql`
- Execution status:
  - Remote Supabase execution completed through the Supabase Management API using a fresh PAT provided by the user.
  - The first anon-key attempt was blocked by sandbox network access; after escalation, Supabase was reachable but the anon context could not see the `youth` department row.
  - The older `sb_publishable_...` key in `scripts/update-members.mjs` also returned no visible `youth` department row.
  - `vercel env ls` showed no usable Supabase service/admin key for the linked Vercel project.
  - Verification returned member id `b58590ea-58e3-4778-baa0-9ecf493d254e` linked to `youth` / `청소년부` with `is_primary = true`.
  - The script is idempotent: it matches by phone or by name+birth date, updates the existing active member if found, and ensures the youth `member_departments` link.

## 2026-06-30 Jung Sungmo Access And Cell Change
- Request: move 정성모 out of cell-leader position, block login access, place 정성모 under 강민아 cell, and ensure 정성모 cell is managed by 김선웅 team leader.
- Impact scope:
  - attendance/report/accounting flows: no code or schema impact.
  - additive/data-only change: yes.
  - auth/RLS scope: no policy change; `users.role`, `users.is_active`, `user_departments.is_team_leader`, and `member_departments.cell_id` were adjusted.
- Prepared/applied script:
  - `scripts/ops-2026-06-30-jung-sungmo-cell-access.sql`
- Remote execution:
  - Completed through Supabase Management API on project `zikneyjidzovvkmflibo`.
- Verification:
  - 정성모 user `b49a758c-de35-4edd-8685-ddc4a2b180d1`: `role = member`, `is_active = false`, CU1 `is_team_leader = false`.
  - 정성모 member `a5ee0351-0693-4cce-afa4-979efef46207`: CU1 `cell_name = 민아셀`, `is_primary = true`; CU 워십팀 secondary link remains unchanged.
  - 김선웅 user `7257048d-fa7a-4b82-a053-f44b215b90ec`: CU1 `role = team_leader`, `is_active = true`, `is_team_leader = true`.
  - There is no dedicated `cells.manager_id` owner column; 김선웅's CU1 department team-leader flag is the system mechanism that grants management over CU1 cells, including 성모셀.
## 2026-07-01 Cell Leader Report Privacy
- Request: ordinary cell leaders should only see their own reports because peer cell-leader reports can include private sharing/prayer content.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report save/approval state flow: unchanged.
  - auth/RLS scope: auth unchanged; report read RLS is narrowed.
- Root cause:
  - `canViewReport` allowed `role = team_leader` users to read submitted reports in any linked department.
  - Migration `003_relax_report_permissions.sql` created `reports_select_all`, allowing any authenticated user to select any non-draft report.
- Changes:
  - `canViewReport` now allows ordinary cell leaders to read only their own reports.
  - Department/team leaders with `user_departments.is_team_leader = true` keep department-level visibility.
  - Report list and dashboard recent-report queries now scope server fetches by author and led departments.
  - Added `supabase/migrations/018_restrict_peer_cell_leader_report_visibility.sql` to replace broad non-draft SELECT with admin/author/department-leader rules and align child report table SELECT policies.
- Verification:
  - `npm test -- src/lib/permissions.test.ts` passed, 52 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 160 tests.
  - `npm run build` passed.
- Remote execution:
  - Applied to Supabase project `zikneyjidzovvkmflibo` through the Supabase Management API.
  - The full migration request timed out, so the report table and optional child-table policies were applied in smaller safe batches.
  - Verified `weekly_reports` has `reports_select_admin`, `reports_select_author`, and `reports_select_department_leader`; the broad `View reports based on role` SELECT policy is removed.
  - Verified existing child report tables have parent-report-based SELECT policies.

## 2026-07-01 CU1 Sungmo Cell Rename Prepared
- Request: Sungmo has been moved to Mina cell; rename Sungmo cell to Sunwoong cell and keep Kim Sunwoong as both CU1 team leader and cell leader.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive/data-only change: yes.
  - auth/RLS scope: no policy change; existing CU1 team leader permission model is used.
- Prepared script:
  - `scripts/ops-2026-07-01-rename-sungmo-cell-to-sunwoong.sql`
- Notes:
  - The schema has no dedicated `cells.manager_id` or cell owner column.
  - Kim Sunwoong's `users.role = 'team_leader'` plus CU1 `user_departments.is_team_leader = true` is preserved; this is not a permission downgrade.
  - The SQL renames active CU1 `성모셀` to `선웅셀`, assigns Kim Sunwoong's active member row to the renamed cell, and fails if Jung Sungmo is still assigned to the old cell.
- Verification:
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
- Remote execution:
  - Applied to Supabase project `zikneyjidzovvkmflibo` through the Supabase Management API.
  - Used PostgreSQL Unicode escape literals for Korean names to avoid PowerShell/JSON encoding corruption during SQL submission.
  - Verified active CU1 `성모셀` count is 0 and active CU1 `선웅셀` count is 1.
  - Verified Kim Sunwoong remains active `team_leader`, CU1 `is_team_leader = true`, and is assigned to `선웅셀`.
  - Verified Jung Sungmo is not assigned to `선웅셀`.
## 2026-07-02 Han Suyeon B To Taehee Cell
- Request: add Han Suyeon B to Taehee cell.
- Impact scope:
  - attendance/report/accounting flows: no code or schema impact.
  - additive/data-only change: yes.
  - auth/RLS scope: no policy change; the change uses the existing CU1 `member_departments.cell_id` structure.
- Prepared script:
  - `scripts/ops-2026-07-02-assign-hansuyeonb-to-taehee-cell.sql`
- Notes:
  - The script resolves Taehee cell from Lee Taehee's active CU1 cell and fails if the target member or cell resolution is ambiguous.
  - Korean literals are written as PostgreSQL Unicode escapes to avoid PowerShell/JSON encoding corruption during remote execution.
- Execution status:
  - Remote Supabase execution completed through the Supabase Management API using a valid Codex-local PAT candidate.
  - Final verification shows Han Suyeon B and Lee Taehee are both assigned to the active CU1 Taehee cell with `is_primary = true`.
- Handoff:
  - `docs/handoffs/2026-07-02-codex-supabase-hansuyeonb-handoff.md`
  - Future Supabase work should verify Codex-local PAT candidates first; Claude MCP status is not the source of truth for this repository.

## 2026-07-14 README And App Information
- Request: update the onapond GitHub README or app information if anything is stale.
- Impact scope:
  - attendance/report/accounting flows: no runtime behavior impact.
  - additive change: yes, documentation and Next.js metadata only.
  - auth/RLS scope: no auth, RLS, Supabase, or permission logic changes.
- Files in scope:
  - `README.md`
  - `docs/status/README.md`
  - `src/app/layout.tsx`
  - required docs and session notes.
- Change:
  - Refreshed the root README with the current feature set and commands.
  - Refreshed the status README summary with current app capabilities and the production alias.
  - Updated app metadata description to include meetings and agenda management.
  - Replaced current-doc production URL references with `https://church-opal.vercel.app`.

## 2026-07-20 Report Photo Storage Permission
- Request: CU2 report photos are failing after a previous youth-related issue was thought to be fixed globally.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report save/approval state flow: unchanged.
  - additive change: yes, Storage/RLS policy migration only.
  - auth/RLS scope: auth unchanged; report photo object and metadata writes are explicitly scoped to the active report author or global admin roles.
- Root cause assessment:
  - The 2026-06-29 report-photo work was shared report UI/persistence hardening, not youth-only, but it did not replace `report-photos` Storage upload policies.
  - The upload path is department-neutral (`{reportId}/...`), so a CU2 failure points to Storage/RLS policy coverage or the user's report-author/admin status, not a youth-only code path.
- Change:
  - Added `supabase/migrations/019_fix_report_photo_storage_policies.sql`.
  - The migration creates/updates the public `report-photos` bucket, allows image MIME types, and authorizes Storage insert/update/delete by resolving `weekly_reports.id` from the first object path segment.
  - Restated `report_photos` metadata policies with the same author/admin write rule and parent-report-based read rule.
- Remote execution:
  - Applied migration 019 to Supabase project `zikneyjidzovvkmflibo` through the Management API.
  - Verified the public `report-photos` bucket exists.
  - Verified Storage policies: `report_photos_storage_select`, `report_photos_storage_insert_author`, `report_photos_storage_update_author`, and `report_photos_storage_delete_author`.
  - Verified table policies: `report_photos_select` and `report_photos_modify`.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 160 tests.
  - `npm run build` passed.

## 2026-07-20 Report Photo Upload Body Preservation
- Request: screenshot shows report content saved, but photo upload failed for all selected images with `No content provided`.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: photo upload body handling only; report save RPC and approval state flow are unchanged.
  - additive change: yes, narrow client upload hardening and focused tests.
  - auth/RLS scope: unchanged; existing `report-photos` Storage policies and `report_photos` metadata policies remain authoritative.
- Root cause assessment:
  - The error is not a department permission message. It indicates Supabase Storage received no upload content.
  - The form preview can exist while the later async Storage upload still receives an unreadable/empty `File` body, especially after saving the base report first.
- Change:
  - `uploadPhotos` now reads each selected `File` into bytes, rejects empty/unreadable content before Storage upload, and uploads a fresh `Blob` with explicit `contentType`.
  - A `FileReader` fallback covers environments without `File.arrayBuffer()`.
- Files in scope:
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/components/reports/hooks/useReportSubmit.test.ts`
  - required docs and session notes.
- Verification:
  - `npm test -- src/components/reports/hooks/useReportSubmit.test.ts` passed, 5 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 162 tests.
  - `npm run build` passed.

## 2026-07-20 Report Save Permission Validation
- Request: after the photo upload fix, report submit showed `Failed to validate report edit permission`.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: route-level edit target validation only; report save RPC and approval state flow are unchanged.
  - additive change: yes, narrower validation order and focused route test.
  - auth/RLS scope: no policy change; the route now avoids an unnecessary user role lookup for authors managing their own draft/rejected report.
- Change:
  - `POST /api/reports/save` reads the target report first.
  - Active author management of `draft`/`rejected` reports is allowed without depending on `users.role`.
  - Report form local draft backups are versioned and cleared after successful final submission so stale submitted report ids are not reused.
  - Admin/global management still uses `canManageReport`.
- Verification:
  - `npm test -- src/components/reports/utils/reportDraftBackup.test.ts src/app/api/reports/save/route.test.ts` passed, 14 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 168 tests.
  - `npm run build` passed.

## 2026-08-21 Session - 아키텍처 · 코드 품질 감사 (읽기 전용)

### 이번 세션에서 한 일
- 사용자 요청: "코드 수정은 하지말고 아키텍처 및 코드 품질 검증하고. 수정 필요한 부분 정리해줘"
- **소스 코드는 수정하지 않았다.** 산출물은 문서 4건뿐이다.
- 9개 영역 병렬 감사(인증·권한 경계 / RLS·마이그레이션 / API 라우트 / 데이터 접근 계층 /
  React·Next.js / 모듈 구조 / 타입 안정성 / 보안 / 운영 품질) 후 영역별 반박 검증 →
  살아남은 169건을 P0 8 / P1 17 / P2 8 / P3 7로 통합 정리.

### 산출물
- `docs/03-analysis/2026-08-21-architecture-audit.analysis.md` — 전체 감사 결과 (권위 문서)
- `CURRENT_TASK.md` — Phase 0(P0 8건) 작업 계약서로 갱신, 이전 기록은 하단 아카이브로 이동
- `CLAUDE.md` — 2026-08-21 Notes 섹션 추가
- 시각화 보고서: https://claude.ai/code/artifact/22532bab-104f-40a3-8416-e8ee56b959d3

### 실행 검증 (직접 실행한 실제 결과)
- `npx tsc --noEmit` 통과 (exit 0)
- `npm test` 통과 — **168개** (문서에 적힌 "93개"는 오래된 수치)
- `npm run lint` 통과 (`--max-warnings=0`)
- `npm run build` **실패** — `.env.local` 부재로 `/pending` prerender 중단.
  코드 회귀가 아니다. 다만 `process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()`의 `!` 단언 때문에
  환경변수 누락이 `TypeError: Cannot read properties of undefined (reading 'trim')`이라는
  쓸모없는 메시지로 나타난다는 점 자체가 발견이다.

### 핵심 결론
- 구조적 약점 한 문장: **이 앱에는 서버 쓰기 경계가 없다.**
  거의 모든 mutation이 브라우저 → PostgREST 직접 호출이고, 유일한 방어선인 RLS가
  저장소에서 재현 불가능하며 여러 곳에서 `USING (true)`로 열려 있다.
- 잘 되어 있는 것도 분명히 있다: `save_report_bundle`의 `security invoker` 선택,
  `@supabase/ssr` 쿠키 처리, 오픈 리다이렉트 방어, 번들 분리, `npm run verify` 정의.
  문제는 보안 개념 부재가 아니라 **일관성 부재**다.

### 다음 세션에서 할 일
1. **먼저 프로덕션 상태 확인** (수정보다 먼저) — 분석 문서 §6의 SQL 실행.
   특히 P0-1의 "승인 없이 들어온 계정 탐지" 쿼리로 침입 계정 유무 확인.
   저장소의 RLS 파일은 프로덕션 상태의 근거가 아니다.
2. `CURRENT_TASK.md`의 §5 Implementation Plan 순서대로 P0 8건 진행
   (P0-2 mojibake → P0-4 인쇄 XSS → P0-5 sw.js → P0-1 승인 게이트 → P0-3/7/8 RLS → P0-6 교인 삭제)
3. Phase 1(P1-6 CI + Sentry)을 다른 P1보다 먼저 세울 것 — 이후 모든 수정의 회귀를 잡는다.

### 주의사항 (다음 세션이 실수하기 쉬운 지점)
- P0-8 버킷 private 전환은 **기존 `photo_url` 데이터 마이그레이션이 함께** 가야 한다.
  순서를 틀리면 기존 사진이 전부 깨진다.
- P0-1은 **신규 가입에만** 적용되어야 한다. 기존 활성 계정을 비활성화하면 안 된다.
- DB 변경은 반드시 migration 파일로. 직접 SQL 실행 후 미기록이 현재 RC3(스키마 재현 불가)의 원인이다.
- `npm run build` 검증에는 `.env.local`이 필요하다.

## 2026-08-21 Session (2차) - 감사 Phase 0 첫 3건 수정

### 이번 세션에서 한 일
- 사용자 요청: "바로 진행할 수 있는 것부터 해"
- 프로덕션 접근(Supabase PAT)과 `.env.local`이 모두 없는 상태라,
  **선행 조건이 없는 코드 전용 P0 3건**만 처리했다: P0-2, P0-4, P0-5.

### P0-2 mojibake 복구
- 깨진 원인 커밋은 `9a55fa0`. 그 이전 커밋에 정상 한글이 남아 있어 원문을 복원했다.
- `9a55fa0`에 인코딩 외 리팩터링도 섞여 있어 파일 되돌리기 대신 **문자열만 라인 단위 교체**.
- `CellManager.tsx` 31곳 / `bulk-photos/page.tsx` 3곳 / `members/[id]/edit/page.tsx` 2곳.
- 재발 방지 가드를 `scripts/check-required-docs.mjs`에 추가 (CJK 한자 또는 `?`+한글 탐지).
  일부러 깨진 파일을 넣어 `docs:check`가 실패하는 것까지 확인했다.
- `.gitattributes` 신규. 감사 문서가 제안한 `working-tree-encoding=UTF-8`은 **의도적으로 뺐다** —
  저장소가 이미 UTF-8이고 깨진 파일도 유효한 UTF-8이라 이 설정으로는 못 잡는다.

### P0-4 인쇄 XSS
- 인쇄 HTML 생성 3함수의 모든 보간부에 `escapeHtml()` 적용.
- **단, `discussion_notes`/`other_notes`는 리치텍스트 HTML이라 `DOMPurify.sanitize()`를 썼다.**
  상세 화면과 같은 처리다. escape하면 인쇄물에 태그가 그대로 찍히는 회귀가 난다.
- `printHtmlInIframe`을 `srcdoc` + `sandbox="allow-same-origin allow-modals"`로 전환.
  `allow-scripts`가 없으므로 주입된 `onerror` 핸들러가 실행되지 않는다.
- 인쇄 HTML의 인라인 `<script>`는 이제 실행되지 않으므로 제거. 인쇄는 부모 `onload`가 트리거한다.
- `escapeHtml` 4건 + 샌드박스 1건 테스트 추가.

### P0-5 서비스워커
- `supabase` 호스트 전면 캐시 제외 + **`/api/`도 함께 제외**.
  `staleWhileRevalidate` 분기만 지우면 `/api/`가 아래 `networkFirst`로 흘러 계속 캐시된다.
  `/api/notifications`에 실제 GET 핸들러가 있어 가설이 아닌 실재 누출이었다.
- `staleWhileRevalidate` 함수와 `API_CACHE` 상수 제거.
- `CACHE_VERSION` v1.2.0 → v1.3.0. `activate` 정리 로직이 기존에 오염된
  `church-api-v1.2.0`을 배포 시점에 각 클라이언트에서 삭제한다.

### 검증 (직접 실행한 실제 결과)
- `npm run docs:check` 통과
- `npm run lint` 통과
- `npm test` 통과 — **173개** (168 + 신규 5)
- `npx tsc --noEmit` 통과
- `npm run build` **통과** (placeholder 환경변수를 인라인으로 넣어 실행).
  감사 문서 §0의 "빌드 실패는 환경변수 부재 때문이고 코드 회귀가 아니다"가 확정됐다.

### 실수했다가 되돌린 것
- `sw.js`에서 `staleWhileRevalidate` 제거 시 파일 뒷부분을 통째로 잘라
  `isStaticAsset`, push/notificationclick/message 핸들러까지 날렸다.
  HEAD 기준으로 뒷부분을 복원했고, 최종 diff가 7 insertions / 50 deletions인 것과
  뒷부분이 HEAD와 바이트 동일한 것을 확인했다.

### 다음 세션에서 할 일
1. **Supabase PAT 확보** → 감사 문서 §6 SQL 실행 (미승인 활성 계정 탐지 우선)
2. **P0-6 결정**: 팀장에게 교인 삭제를 허용할지
3. 위 둘이 풀리면 P0-1 → P0-3/7/8(020 마이그레이션 하나로) → P0-6

### 주의사항
- 인쇄 샌드박스는 실제 브라우저에서 인쇄 대화상자가 뜨는지 **수동 확인이 남아 있다.**
  `.env.local`이 없어 앱을 띄우지 못했다.
- 이번 세션은 커밋하지 않았다. 작업 트리에 변경분이 그대로 있다.

## 2026-08-22 Youth Report Forbidden Recovery
- Request: resolve the `Forbidden` error shown while Park Youngmin submitted a youth report.
- Production read-only evidence:
  - Park Youngmin is active, has `role = team_leader`, and is linked to the youth department.
  - No youth report by Park Youngmin existed for 2026-08-10 through 2026-08-22, confirming the browser was carrying an obsolete autosave target rather than editing a current server draft.
- Root cause:
  - a restored local draft backup could retain a `targetReportId` that no longer resolved to an editable report.
  - the route returned generic `Forbidden`, so the client could not safely recover.
- Change:
  - the save route returns HTTP 409 with `staleTarget: true` only for obsolete new-form autosave targets.
  - the client retries once with `targetReportId = null`, preserving the current report fields.
  - true edit-mode authorization failures remain HTTP 403 and are not retried.
- Verification:
  - focused report route/client tests passed, 18 tests.
  - `npx tsc --noEmit` passed.
  - latest merged `npm test` passed, 176 tests.
  - production build passed with the repository's public Supabase URL/publishable key supplied to the build process.
- No database, migration, RLS, auth, attendance, accounting, or approval workflow changes were required.

## 2026-09-05 — P0 보안 작업 완료 및 출석 연계 핸드오프

### 완료
- 중단된 P0-1/3/6/7/8을 구현하고 `020_close_p0_security_gaps.sql`을 프로덕션 `zikneyjidzovvkmflibo`에 적용했다.
- 신규 사용자는 `is_active=false`; `is_approved` 제거. 익명 users SELECT/INSERT 정책과 레거시 UPDATE 정책을 교체해 users 목록 노출, 임의 행 삽입, 본인 role/승인상태 변경을 막았다. 공용 RLS 헬퍼도 비활성 계정을 거부한다.
- 심방 SELECT 축소, 팀장 교인 삭제/부서연결 DELETE 제거, 회의 PDF 경로 검증 정책 적용.
- 프로덕션 감사 중 발견한 `report-photos`의 `users.name` shadowing과 익명 Storage 중복 정책도 함께 제거했다.
- 3개 사진 버킷을 private으로 전환하고 기존 DB URL을 상대 객체 경로로 정규화했다. 검증 결과 HTTP URL 0건.
- 앱은 `src/lib/storage.ts`에서 signed URL을 생성한다. 신규 업로드는 URL이 아닌 상대 경로만 저장한다.
- 교인 삭제는 부모 행을 먼저 삭제하고 반환 행을 확인한 후 사진을 정리한다. `member_departments_member_id_fkey`가 CASCADE임을 원격 확인했다.
- `/pending` 페이지의 Supabase 클라이언트 생성을 로그아웃 클릭 시점으로 늦춰 로컬 prerender 실패를 해결했다.

### 검증
- `npm run lint` 통과
- 원격 stale-draft 복구 커밋 위로 rebase 후 `npm test` 통과 — 12 files / 185 tests
- `npm run typecheck` 통과
- `npm run build` 통과 (Google Fonts 다운로드를 위해 네트워크 허용)
- 원격 검증: 사진 4개 버킷 모두 private, 레거시 `is_approved` 0, 기존 photo_url HTTP 값 0, 새 RLS 정책 확인.
- 익명 public URL 스모크: 실제 저장 객체 기준 `member-photos`, `department-photos`, `report-photos` 모두 HTTP 400으로 접근 거부.

### 다음 작업
- `docs/handoffs/2026-09-05-attendance-report-linkage.md`부터 시작해 셀장보고서/주차보고서의 출석 자동연계와 통계 정확성을 수정한다.
- 인쇄 sandbox 실제 인쇄 대화상자 smoke test는 여전히 수동 확인 필요.

### Git / 배포
- 원격 동시 커밋 `690ad69 Fix stale report draft recovery` 위로 rebase하고 전체 verify(185 tests)를 다시 통과했다.
- P0 커밋 `b047f58 Close remaining P0 security gaps`를 `origin/main`에 push했다.
- Vercel production 배포 `dpl_9CY3t4LaD9rHBnLcxJ7sVGofWQQ5` READY, `https://church-opal.vercel.app` alias 완료.
- 배포 후 `/login` 스모크 HTTP 200.
- 최신 CLI 59.11.7 직접 deploy는 인증 오류가 났지만 프로젝트 조회/로그인은 정상. 설치된 58.4.0이 업로드했고 원격 빌드는 59.11.7로 수행됐다. 전역 CLI는 추후 `npm i -g vercel@latest` 권장.

## 2026-09-06 — 셀장보고서 출석 연계·통계 복구

### 진단과 결정
- 프로덕션 전체 출결 758건은 모두 `manual`, `report_id` 연결은 0건이었다. 최근 셀장보고서 93건의 연결 출결 0건과 CU1 주차보고서 불일치를 재확인했다.
- 과거 `attendees` 문자열은 예배/모임으로 추측 백필하지 않는다. 연결 없는 과거 보고서는 출결을 직접 건드리기 전까지 기존 요약을 보존한다.
- 수동 출결·결재·회계·승인 게이트는 유지한다.

### 구현
- 개인 입력/상세를 `worshipPresent`와 `meetingPresent` 두 열로 분리했다.
- 명시 저장은 `attendance_members`와 `sync_attendance=true`, 백그라운드 자동저장은 `false`로 전송한다.
- `021`은 공개 RPC 시그니처를 유지하는 원자적 `SECURITY INVOKER` 래퍼, 셀원 검증, `checked_via='report'`, 출처 제약과 삭제 정리를 추가했다.
- 프로덕션 E2E에서 발견한 authenticated search path와 보고서 삭제 중 중첩 트리거 결함을 `022`/`023`으로 보정했다.
- 셀장보고서 취합은 연결 개인 행만 집계한다. 통계는 빈 필터, 실제 주차 수, 주별 역사적 재적, weekly report type을 명시적으로 처리한다.

### 검증
- TypeScript 통과.
- Vitest 단일 워커: 14 files / 193 tests 통과. 직전 병렬 실행의 1건 실패는 워커 시작 타임아웃이었고 동일 테스트 포함 재실행은 통과했다.
- 프로덕션 migrations 021, 022, 023 적용.
- authenticated rollback E2E 통과: worship/meeting 2행, 요약 일치, 잘못된 셀원 입력 전체 롤백, 수동 수정 보존/보고서 출처 삭제.
- 사후 감사: E2E 보고서 0, 미래 테스트 출결 0, 기존 manual 758, trigger search path `public, pg_temp`.

### 남은 순서
1. commit/push
2. Vercel production deploy 및 smoke

### 최종 로컬 게이트
- 네트워크 허용 상태에서 `npm run verify` 전체 통과: docs:check, lint 0 warnings, 14 files / 193 tests, TypeScript, Next.js 16.1.6 production build.
