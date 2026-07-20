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
  - Repeated final-submit calls for an author-owned already-`submitted` target report return success without rewriting the report.
  - Admin/global management still uses `canManageReport`.
- Verification:
  - `npm test -- src/app/api/reports/save/route.test.ts` passed, 10 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 164 tests.
  - `npm run build` passed.
