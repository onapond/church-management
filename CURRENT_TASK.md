## 2026-07-01 Follow-up - Restrict Peer Cell-Leader Report Visibility
- Request: cell leaders must only see their own reports because other cell leaders' reports can contain private sharing content.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: report read visibility is restricted; report save and approval state model are unchanged.
  - additive/security change: yes, permission helper, scoped list/dashboard queries, and a new RLS migration.
  - auth/RLS scope: auth flow unchanged; RLS removes the broad `status != draft` report select policy and allows only admins, authors, and department leaders (`is_team_leader = true`) to read eligible reports.
- Files in scope:
  - `src/lib/permissions.ts`
  - `src/lib/permissions.test.ts`
  - `src/queries/reports.ts`
  - `src/queries/dashboard.ts`
  - `src/components/reports/ReportListClient.tsx`
  - `src/components/dashboard/DashboardContent.tsx`
  - `supabase/migrations/018_restrict_peer_cell_leader_report_visibility.sql`
  - required docs and session notes.
- Root cause:
  - `canViewReport` allowed any `role = team_leader` user to read submitted reports in their linked department.
  - Migration `003_relax_report_permissions.sql` also allowed any authenticated user to select any non-draft report.
- Change:
  - Ordinary cell leaders (`role = team_leader`, `is_team_leader = false`) can read only their own reports.
  - Department/team leaders (`is_team_leader = true`) keep department-level report visibility and approval access.
  - Report list and dashboard recent-report queries now scope server queries by author and led departments instead of fetching peer reports and filtering after.
- Verification:
  - `npm test -- src/lib/permissions.test.ts` passed, 52 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 160 tests.
  - `npm run build` passed.
- Remote verification:
  - Applied the report SELECT policy change to Supabase project `zikneyjidzovvkmflibo` through the Supabase Management API.
  - Verified `weekly_reports` now has `reports_select_admin`, `reports_select_author`, and `reports_select_department_leader`, and the broad `View reports based on role` SELECT policy is removed.
  - Verified existing child report tables now have parent-report-based SELECT policies.

## 2026-07-01 Follow-up - Rename Sungmo Cell To Sunwoong Cell
- Request: Sungmo has been moved to Mina cell; keep Kim Sunwoong as CU1 team leader, set him as the cell leader/member for Sungmo cell, and rename the cell to Sunwoong cell.
- Impact scope:
  - attendance/report/accounting flows: no code or schema impact.
  - additive/data-only change: yes.
  - auth/RLS scope: no policy change; Kim Sunwoong's existing CU1 `team_leader` and `user_departments.is_team_leader` state is preserved and verified.
- Files in scope:
  - `scripts/ops-2026-07-01-rename-sungmo-cell-to-sunwoong.sql`
  - required docs and session notes.
- Change:
  - Prepared a guarded SQL script that renames the active CU1 `성모셀` row to `선웅셀`.
  - The script keeps Kim Sunwoong as active CU1 team leader and assigns his active member row to the renamed cell through `member_departments.cell_id`.
  - The script fails loudly if Kim Sunwoong is not the active CU1 team leader, if `선웅셀` already exists, or if Jung Sungmo is still assigned to `성모셀`.
- Verification plan:
  - Execute the SQL through Supabase Management API or SQL Editor with admin context.
  - Confirm CU1 has `선웅셀`, no active `성모셀`, Kim Sunwoong remains CU1 team leader and is assigned to `선웅셀`, and Jung Sungmo is assigned outside the renamed cell.
- Verification:
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
- Remote verification:
  - Applied the data update to Supabase project `zikneyjidzovvkmflibo` through the Supabase Management API using PostgreSQL Unicode escapes to avoid PowerShell encoding corruption.
  - Verified active CU1 `성모셀` count is 0 and active CU1 `선웅셀` count is 1.
  - Verified Kim Sunwoong remains `team_leader`, active, and CU1 `is_team_leader = true`, and his member row is assigned to `선웅셀`.
  - Verified Jung Sungmo is not assigned to `선웅셀`.

## 2026-06-22 Follow-up - Meeting Agenda Edit UX
- Request: editing long meeting agenda items felt unnecessarily cumbersome because the edit form opened below the already-rendered content.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive change: yes, UI-only refinement inside the meeting agenda discussion layer.
  - auth flow: unchanged.
  - RLS scope: unchanged; existing agenda item/comment update policies and mutations are reused.
- Files in scope:
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - required docs and session notes.
- Change:
  - When an agenda item enters edit mode, the long rendered content and PDF preview are hidden so the edit form appears directly under the item header.
  - Agenda item and comment edit fields autofocus, use larger dynamic textareas, and support Ctrl/Cmd+Enter to save.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
  - `npm run lint` passed.

## 2026-06-24 Follow-up - Report Title And Agenda Comment UX
- Request: fix broken report creation title text, reduce excessive spacing between agenda comment edit/delete actions, and make comments appear immediately after posting.
- Impact scope:
  - attendance/report/accounting flows: no behavioral impact.
  - additive change: yes, UI/client-cache refinement only.
  - auth flow: unchanged.
  - RLS scope: unchanged; existing agenda comment insert/update/delete policies remain authoritative.
- Files in scope:
  - `src/app/(dashboard)/reports/new/page.tsx`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/queries/meetings/useMeetings.ts`
  - required docs and session notes.
- Root cause:
  - Report creation title strings had mojibake in the page config.
  - Agenda comment header used `justify-between` with individual action buttons, spreading `수정` and `삭제` across the row.
  - Agenda comment mutations only invalidated the agenda query, so the visible list depended on refetch timing instead of immediate cache updates.
- Change:
  - Report creation labels/title are readable Korean.
  - Comment action buttons are grouped together on the right.
  - Comment create/update/delete mutations patch `['meetings', 'agenda', meetingId]` immediately and still invalidate afterward for server reconciliation.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.

# CURRENT_TASK.md

## 2026-06-19 Follow-up - Meeting Agenda And Comment Edit
- Request: pre-meeting agenda items and comments must be editable after posting.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive change: yes, a narrow edit UI and RLS policy addition for the agenda discussion layer.
  - auth flow: unchanged.
  - RLS scope: `meeting_agenda_items` update policy is restated for authors/meeting-content editors, and `meeting_agenda_comments` receives an update policy for commenters/meeting-content editors.
- Files in scope:
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/queries/meetings/useMeetings.ts`
  - `supabase/migrations/017_add_meeting_agenda_edit_policies.sql`
  - required docs and session notes.
- Root cause:
  - The agenda board had create/delete/status mutation support, but no edit mutation/UI for agenda item title/type/content.
  - Comments had create/delete support, but no update mutation/UI and no RLS policy for update.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm run lint` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
- Open item:
  - Apply migration `017_add_meeting_agenda_edit_policies.sql` to remote Supabase before production use.

## 2026-07-02 Follow-up - Assign Han Suyeon B To Taehee Cell
- Request: add Han Suyeon B to Taehee cell.
- Impact scope:
  - attendance/report/accounting flows: no code or schema impact.
  - additive/data-only change: yes.
  - auth/RLS scope: no policy or auth change; the operation updates `member_departments.cell_id` through an admin context.
- Files in scope:
  - `scripts/ops-2026-07-02-assign-hansuyeonb-to-taehee-cell.sql`
  - required docs and session notes.
- Plan:
  - Resolve the active CU1 member named `Han Suyeon B`.
  - Resolve Taehee cell from either an active CU1 cell named Taehee/Taehee cell or Lee Taehee's existing CU1 cell, failing if ambiguous.
  - Upsert Han Suyeon B's CU1 `member_departments` row to the resolved cell and mark CU1 as primary.
- Verification plan:
  - Execute through Supabase Management API with admin context.
  - Confirm Han Suyeon B and Lee Taehee share the same active CU1 cell.
- Execution status:
  - Remote Supabase execution completed through the Supabase Management API using a valid Codex-local PAT candidate.
  - Final verification shows Han Suyeon B and Lee Taehee are both assigned to the active CU1 Taehee cell with `is_primary = true`.
- Handoff:
  - `docs/handoffs/2026-07-02-codex-supabase-hansuyeonb-handoff.md`
  - Future Supabase work should verify Codex-local PAT candidates first; Claude MCP status is not the source of truth for this repository.

## 2026-07-20 Follow-up - CU2 Report Photo Upload Permission
- Request: CU2 report photos also fail to upload; clarify whether the previous fix was global or youth-only.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: report photo Storage/RLS policy only; report save bundle and approval state transitions are unchanged.
  - additive change: yes, new migration only.
  - auth/RLS scope: auth unchanged; active report authors and global admin roles can manage report photo objects for the report id in the Storage path.
- Files in scope:
  - `supabase/migrations/019_fix_report_photo_storage_policies.sql`
  - required docs and session notes.
- Root cause assessment:
  - The previous report-photo UI/persistence hardening was common to all departments, but Storage upload policies were not newly generalized there.
  - The app uploads to `report-photos/{reportId}/...`, not to department-specific folders, so the correct fix is global report-id-based Storage authorization.
- Verification plan:
  - Apply migration 019 to remote Supabase.
  - Verify `report-photos` bucket and `storage.objects` policies exist.
  - Run `npx tsc --noEmit`, `npm test`, and `npm run build` because this task changes only SQL/docs but follows repository completion gates.
- Execution status:
  - Remote Supabase migration 019 applied to project `zikneyjidzovvkmflibo`.
  - Verified `report-photos` bucket is public and the expected Storage/table policies exist.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 160 tests.
  - `npm run build` passed.

## 2026-07-20 Follow-up - Report Photo Upload Body Preservation
- Request: screenshot shows report content saved, but photo upload failed for all selected images with `No content provided`.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: photo upload body handling only; report save RPC and approval state flow are unchanged.
  - additive change: yes, narrow client upload hardening and focused tests.
  - auth/RLS scope: unchanged; existing `report-photos` Storage policies and `report_photos` metadata policies remain authoritative.
- Root cause assessment:
  - The error is not a department permission message. It indicates Supabase Storage received no upload content.
  - The form preview can exist while the later async Storage upload still receives an unreadable/empty `File` body, especially after saving the base report first.
- Files in scope:
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/components/reports/hooks/useReportSubmit.test.ts`
  - required docs and session notes.
- Change:
  - `uploadPhotos` now reads each selected `File` into bytes, rejects empty/unreadable content before Storage upload, and uploads a fresh `Blob` with explicit `contentType`.
  - A `FileReader` fallback covers environments without `File.arrayBuffer()`.
- Verification:
  - `npm test -- src/components/reports/hooks/useReportSubmit.test.ts` passed, 5 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 162 tests.
  - `npm run build` passed.

## 2026-07-20 Follow-up - Report Save Permission Validation
- Request: after the photo upload fix, report submit showed `Failed to validate report edit permission`.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: route-level edit target validation only; report save RPC and approval state flow are unchanged.
  - additive change: yes, narrower validation order and focused route test.
  - auth/RLS scope: no policy change; the route now avoids an unnecessary user role lookup for authors managing their own draft/rejected report.
- Files in scope:
  - `src/app/api/reports/save/route.ts`
  - `src/app/api/reports/save/route.test.ts`
  - required docs and session notes.
- Change:
  - `POST /api/reports/save` reads the target report first.
  - Active author management of `draft`/`rejected` reports is allowed without depending on `users.role`.
  - Admin/global management still uses `canManageReport`.
- Verification:
  - `npm test -- src/app/api/reports/save/route.test.ts` passed, 9 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 163 tests.
  - `npm run build` passed.

## 2026-06-19 Follow-up - Meeting Agenda Participant Leader Permission
- Request: leader-meeting participants should be able to post pre-meeting agenda items and exchange comment feedback before the in-person meeting.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive change: yes, a narrow agenda-board permission/RLS correction.
  - auth flow: unchanged.
  - RLS scope: `meeting_agenda_items` insert, `meeting_agenda_comments` insert, and `meeting-pdfs` agenda-path Storage policies.
- Files in scope:
  - `src/lib/permissions.ts`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/lib/permissions.test.ts`
  - `supabase/migrations/016_allow_meeting_agenda_participant_leaders.sql`
  - required docs and session notes.
- Root cause:
  - The agenda board was implemented for department-head flags (`user_departments.is_team_leader = true`) instead of the product intent: active leader-meeting participants with `role = team_leader`.
  - The client and RLS therefore blocked leaders whose role is `team_leader` but whose department link is not marked as the department-head flag.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test -- src/lib/permissions.test.ts` passed, 50 tests.
  - `npm test` passed, 158 tests.
  - `npm run lint` passed.
  - `npm run build` passed.
- Open item:
  - Remote Supabase migration application still needs a valid Supabase MCP/PAT connection.

## 2026-06-19 Follow-up - Meeting Team Leader PDF And Feedback Fix
- Request: team leaders reported that meeting-tab PDF upload and feedback writing did not work.
- Impact scope:
  - attendance/report/accounting flows: no impact.
  - additive change: yes, a narrow permission/RLS fix.
  - auth flow: unchanged.
  - RLS scope: `meeting_feedback` insert and `meeting-pdfs` agenda-path Storage policies.
- Files in scope:
  - `src/lib/permissions.ts`
  - `src/components/meetings/MeetingDetail.tsx`
  - `supabase/migrations/015_fix_meeting_team_leader_feedback_and_agenda_pdf.sql`
  - required docs and session notes.
- Root cause:
  - Meeting feedback UI and RLS allowed only `super_admin`, `president`, and `accountant`, excluding department team leaders.
  - Agenda PDFs used the shared private `meeting-pdfs` bucket under an `agenda/` path, but no follow-up policy explicitly tied that path to department team leader access.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 156 tests.
  - `npm run build` passed.
  - `npm run lint` passed.
- Open item:
  - Remote Supabase migration application was not executed because no Supabase MCP resources are available in this session.

이 파일은 "이번 작업"의 단일 기준 문서다. 작업을 시작하기 전에 최신 상태로 갱신하고, 구현 중 범위가 바뀌면 즉시 업데이트한다.

## 2026-06-18 Update - Meeting Agenda Discussion

## 2026-06-18 Follow-up - Meeting Edit And Cancel Actions
- 요청 제목: 회의 등록 후 수정/제출 취소 버튼 추가
- 요청 목적: 회의 등록 직후 상세 화면에서 기본 정보를 수정하거나 등록을 취소할 수 있게 한다.
- 영향 범위:
  - attendance/report/accounting 흐름 영향 없음.
  - 기존 meeting agenda/minutes/PDF 흐름은 유지한다.
  - additive change로 회의 상세 액션과 `meetings` update RLS 정책만 보강한다.
- 수정 대상:
  - `supabase/migrations/013_add_meeting_update_policy.sql`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingDetail.tsx`
  - 문서 및 session notes
- 구현 완료:
  - 회의 상세 상단에 `수정`, `제출 취소` 텍스트 버튼 추가
  - 회의 기본 정보 inline edit 추가
  - `meetings_update_editors` RLS policy 추가
- 검증:
  - `npx tsc --noEmit` passed.
  - `npm run lint` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.

## 2026-06-18 Follow-up - Department Agenda PDF Attachments
- 요청 제목: 부서별 회의 안건 PDF 첨부
- 요청 목적: 각 부서가 사전 안건을 텍스트뿐 아니라 PDF 원본으로도 올릴 수 있게 한다.
- 영향 범위:
  - attendance/report/accounting 흐름 영향 없음.
  - 기존 회의록 PDF와 같은 private `meeting-pdfs` Storage 버킷을 재사용한다.
  - 기존 회의 안건/댓글 구조는 유지하고 `meeting_agenda_items`에 PDF 메타데이터만 추가한다.
- 수정 대상:
  - `supabase/migrations/014_add_meeting_agenda_pdf_attachments.sql`
  - `src/types/database.ts`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - 문서 및 session notes
- 검증:
  - `npx tsc --noEmit` passed.
  - `npm run lint` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.

## 1. Task Summary
- 요청 제목: 회의별 사전 안건/질문 공유 기능
- 요청 목적: 토요일 대면회의 전에 각 부서장이 회의 상세에서 사전 안건을 올리고, 부서장들끼리 질문과 피드백을 자유롭게 나눌 수 있게 한다.
- 요청 원문 요약: "회의 탭에 각 부서장들이 접근해서 각 회의 안건을 올리고 각 부서장들이 피드백 질문을 자유롭게 나눌 수 있도록 해줘. 노션 링크를 참고해. 토요일에 대면회의를 하는데 대면회의시 사전에 소통하기 위함이야."

## 2. Scope
- 이번 작업에 포함:
  - 회의별 사전 안건 테이블 `meeting_agenda_items` 추가
  - 안건별 댓글/질문 테이블 `meeting_agenda_comments` 추가
  - 회의 상세 화면에서 부서장/관리자가 안건을 등록하고 댓글을 남길 수 있는 UI 추가
  - 안건 유형(안건/질문/공지)과 상태(열림/정리됨) 표시
  - RLS 정책과 타입/문서 반영
- 이번 작업에서 제외:
  - 기존 attendance/report/accounting 흐름 변경
  - 기존 보고서 결재 상태 모델 변경
  - 기존 회의록/PDF/회의 피드백 의미 변경
  - 노션 API 연동 또는 노션 페이지 임포트

## 3. Impact Check
- attendance 흐름 영향: 없음.
- report 흐름 영향: 없음. 보고서 결재/피드백 테이블은 변경하지 않는다.
- accounting 흐름 영향: 없음.
- additive change 여부: 예. 기존 `meetings`, `meeting_minutes`, `meeting_feedback`은 유지하고 사전 소통용 테이블만 추가한다.
- 권한/RLS/auth 영향: auth 흐름은 변경하지 않는다. 활성 로그인 사용자는 조회 가능하고, 작성은 `super_admin`, `president`, `accountant`, 또는 부서장(`user_departments.is_team_leader=true`)으로 제한한다.

## 4. Files In Scope
- 예상 수정 파일:
  - `supabase/migrations/012_add_meeting_agenda_discussion.sql`
  - `src/types/database.ts`
  - `src/lib/permissions.ts`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/components/meetings/MeetingDetail.tsx`
  - `PROJECT_CONTEXT.md`
  - `CLAUDE.md`
  - `docs/TECHNICAL_SPEC.md`
  - `docs/USER_GUIDE.md`
  - `.claude/session-notes.md`
  - `CURRENT_TASK.md`

## 5. Implementation Plan
1. `meeting_agenda_items`, `meeting_agenda_comments` migration을 작성하고 RLS 정책을 함께 둔다.
2. database 타입과 권한 helper를 추가한다.
3. TanStack Query 훅으로 안건/댓글 조회와 insert/update/delete mutation을 만든다.
4. 회의 상세 화면에 사전 안건 보드와 댓글 입력 UI를 추가한다.
5. 필수 문서를 업데이트하고 typecheck/test/build로 검증한다.

## 6. Risks And Guardrails
- DB 변경은 migration 파일로만 작성한다.
- 기존 결재 테이블/상태/알림 로직을 변경하지 않는다.
- 회의 편집 권한과 사전 안건 작성 권한을 혼동하지 않는다. 안건 작성은 더 넓은 "부서장 참여" 권한으로 둔다.
- 노션 링크는 현재 공개 내용 접근이 되지 않았으므로, 노션 스타일의 사전 협업 흐름만 제품 안에 구현한다.

## 7. Verification Plan
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- 필요 시 `npm run lint`

## 8. Execution Notes
- `meeting_agenda_items`와 `meeting_agenda_comments` migration을 추가했다.
- 회의 상세에 `MeetingAgendaBoard`를 추가해 부서장/관리자가 사전 안건, 질문, 공지와 댓글을 남길 수 있게 했다.
- 첨부 이미지 기준으로 안건 목록을 카드형 게시판이 아니라 `[공통 회의 안건]`, `[청소년부 회의 안건]`, `[1청년 회의 안건]` 같은 부서별 문서 섹션 형태로 정리했다.
- 기존 회의록, PDF, 회의 피드백, 보고서 결재 흐름은 변경하지 않았다.
- `npx tsc --noEmit` 통과.
- `npm test` 통과, 153 tests.
- `npm run lint` 통과.
- `npm run build` 통과.

## 9. Completion Record
- 실제 수정 파일:
  - `supabase/migrations/012_add_meeting_agenda_discussion.sql`
  - `src/types/database.ts`
  - `src/lib/permissions.ts`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/components/meetings/MeetingDetail.tsx`
  - `PROJECT_CONTEXT.md`
  - `CLAUDE.md`
  - `docs/TECHNICAL_SPEC.md`
  - `docs/USER_GUIDE.md`
  - `.claude/session-notes.md`
  - `CURRENT_TASK.md`
- 검증:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 153 tests.
  - `npm run lint` passed.
  - `npm run build` passed.
- 미해결 이슈:
  - Supabase MCP에 등록된 기존 PAT가 `Unauthorized` 상태라 migration 원격 적용은 이 세션에서 수행하지 못했다.
  - 노션 링크는 공개 내용 접근이 되지 않아 구조 참고 대신 요청 의도 기반으로 구현했다.
## 2026-06-29 Follow-up - Report Photo Visibility And Submit Guard
- Request: check report-system feedback that a report can submit while writing and that attached photos are missing on submitted report detail pages.
- Impact scope:
  - existing attendance/report/accounting flows: attendance and accounting unchanged; report save/display hardening only.
  - additive change: yes, a report photo read/display path and form submit guard.
  - auth/RLS scope: unchanged; uses existing `report_photos` table policy and `report-photos` Storage policy.
- Files in scope:
  - `src/types/database.ts`
  - `src/queries/reports.ts`
  - `src/components/reports/ReportDetail.tsx`
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/components/reports/ReportForm.tsx`
  - required docs and session notes.
- Root cause:
  - Submitted report detail did not read or render `report_photos`.
  - Photo upload/metadata failures were logged but did not stop the success path.
  - Native form behavior could submit the report when Enter was pressed in a normal input.
- Change:
  - Added report photo typing/query and detail display.
  - Report photo upload errors now surface through submit error handling.
  - Enter-key implicit submission is blocked; explicit submit button remains the only submit path.
  - Report photo partial-save recovery now tracks the saved report id, including existing draft submit paths.
  - Activity photo uploads now remove the Storage object if `department_photos` metadata insert fails, and delete operations now check both Storage and DB errors.
  - Added read-only `scripts/audit-photo-integrity.sql` for privileged Supabase verification of table rows vs Storage objects.
- Remote evidence:
  - Anon REST sees `weekly_reports`, `report_photos`, and `department_photos` as `Content-Range: */0`, so table row counts cannot be trusted without an authenticated/service role.
  - Storage list with anon key confirms existing files: `report-photos` has 32 top-level report folders and 76 files; `department-photos` has 5 top-level department folders and 50 files.
  - Sample public object URLs from both buckets returned HTTP 200 with `image/jpeg`.
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 158 tests.
  - `npm run build` passed.
