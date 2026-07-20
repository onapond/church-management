# PROJECT_CONTEXT.md

## 1. ?�로?�트 ?�줄 ?�약
�?��중앙교회 교육?�원??관�??�스??
?�재??교회 교육부???�정 ?�이�? ?�기?�으로는 교회 ?�영 ?�랫??Church OS)?�로 ?�장 중이??

## 2. ?�재 ?�비?�명 / ?�기 ?�품�?
- ?�재 ?�비?�명: �?��중앙교회 교육?�원??관�??�스??
- ?�기 ?�품 방향: Church OS
- ?�재 ?�선 목표: �?��중앙교회 CU 조직?�서 바로 ?�용?????�는 ?�전 기능 ?�장

## 3. ?�재 ?�영 범위
?�재 ?�공 기능:
- 출결 관�?- 주차/모임/교육/?�??보고??- ?�의 관�?- 보고??결재
- 교인 관�?
- ?�계 관�?
- ?�방 ?�정
- ?�계
- ?�시 ?�림

## 4. 조직 컨텍?�트
?�위 조직:
- CU (Chungpa United)

부??
- �?��?��?
- 1�?��(20?�)
- 2�?��(30?�)
- CU ?�십?�

리더??
- 교육?�원??부??
- 교역??
- ?�장
- �?부???�??
- 1�?�� ?�속 ?�??

## 5. ?�재 ?�로그램 ?�영 컨텍?�트
진행 �??�로그램:
- 리더 ?�경공�? 강사 ?�성
- ?�???�경공�?
- 매일 ?�경 10???�기
- 매주 1???�송
- ?�십?� ?�서 ?�눔
- ?�십?� ?�서 브리???�출
- ?�십?� ?�악 과제

## 6. 기술 ?�키?�처
- Next.js 16 App Router
- TypeScript strict
- Supabase (Auth, DB, RLS, Storage, Realtime)
- TanStack Query
- Tailwind CSS v4
- Recharts
- Tiptap

?�심 구조:
- middleware.ts ??AuthProvider ??dashboard layout
- thin wrapper page pattern
- client-side fetching + query caching

## 7. ?�재 ?�심 ?�이??
기존 ?�심 ?�메??
- users
- departments
- meetings
- members
- member_departments
- cells
- weekly_reports
- approval_history
- attendance_records
- notifications
- accounting_records
- expense_requests
- visitations
- photos

## 8. ?�재 권한 구조
기존 role:
- super_admin
- president
- accountant
- team_leader
- member

?�제 ?�영??추�? ?�석:
- 교육?�원??
- 교역??
- ?�장
- 부???�??
- ?�??
- ?�반 멤버

주의:
- ?�재 DB enum/권한 모델???�면 교체?��? 말고 ?�장 방식?�로 ?�근??�?

## 9. ?�재 ?�품???�계
?�재 ?�스?��? ?�정 기록?�는 강하지�? ?�래 ?�름???�하??
- ?�의 기록
- 결정?�항 ?�리
- ?�계
- ?�일 Task 진행 추적
- ?�련/?�자?�육 ?�로그램 진행 관�?

## 10. ?�품 ?�장 방향
?�장 ?�??
1. Task Management
2. Meeting Management
3. Training System
4. AI Meeting Assistant (plugin)

?�칙:
- 기존 코어�??��?
- ??기능?� 모듈?�으�??�장
- AI 기능?� ?�료 plugin/add-on ?�제�?분리

## 11. ?�심 ?�품 철학
???��? ?�순 교인관�?출결 ?�이 ?�니??
"?�의�??�행?�로 바꾸??교회 ?�영 ?�스???�로 진화?�다.

중심 ?�름:
?�의
???�의�?
??결정?�항
??Task
??주중 진행 ?�인
???�음 ?�의 ?�계

## 12. AI 기능 ?�칙
AI 기능?� 기본 기능???�니??
AI 기능?� ?�립?�으�?추�?/?�거 가?�한 컴포?�트??

?�??AI 기능:
- ?�의 ?�음
- ?�사
- ?�약
- 결정?�항 추출
- Task ?�보 ?�성
- ?�계 ?�트 ?�성

지??목표:
- 모바??직접 ?�음
- Zoom/Google Meet ?�의 ?�약

## 13. ?�키?�처 ?�칙
- ?�체 리팩?�링 금�?
- additive change ?�선
- ???�이�???모듈 추�? ?�선
- 기존 보고??출결/?�계 ?�름 ?�정??최우??
- RLS ?��?
- 모바???�선
- ?�능/권한/문서 ?�데?�트 ?�께 처리
- ?�의 기능?� 기존 ?�정 코어?� 분리??additive module�??�장

## 14. 문서 ?�영 규칙
주요 ?�업 ?�료 ??반드??갱신:
- PROJECT_CONTEXT.md
- CLAUDE.md
- docs/TECHNICAL_SPEC.md
- docs/USER_GUIDE.md
- .claude/session-notes.md

## 15. ?�재 가??중요???�음 ?�업
- Task 기능 ?�계 �?구현
- Meeting 기능 ?�계 �?구현
- Meeting 기반 Task ?�결
- Training System 기초 구조 ?�계
- AI Meeting plugin 구조 ?�계
- ?�후 교회�?컴포?�트??가?�한 구조 준�?

## 16. 주의????
- 문서???�스??개수 불일�?93 vs 103) ?�인 ?�요
- 배포???�동 vercel 배포
- ?�메???�증 ?�??관리자 ?�인 구조 ?��?
- ?�품�??�장�??�재 ?�영�??�동 주의

## 2026-03-15 Update
- Meeting Management Phase 2 adds a separate \\meeting_minutes\\ table for structured minutes, decisions, and handoff notes.
- This remains an additive extension to the existing meetings module and does not change attendance, report, or accounting flows.
- Remote Supabase now has both \\meetings\\ and \\meeting_minutes\\ tables with RLS enabled, verified through MCP.
- Meeting minutes edit permission is aligned with RLS: `super_admin` and `president` can edit across departments, and `team_leader` can edit only for departments they lead.
- New meeting creation now supports entering base meeting fields and structured minutes in a single submit, while still storing minutes in the separate additive table.

## 2026-03-26 Update
- Report edit save no longer clears child rows up front for `report_programs`, `newcomers`, `project_content_items`, `project_schedule_items`, and `project_budget_items`.
- The report save path now keeps existing child data until replacement insert/update work succeeds, reducing destructive partial-loss risk during edit failures.
- This is an additive stability fix inside the report save flow and does not change attendance, approval, accounting, auth, or RLS behavior.
- Report core DB persistence now routes through a server-side API orchestration path instead of only client-side Supabase writes, while still preserving current RLS/auth through the server cookie client.

## 2026-03-26 Update - Transactional Report Save RPC
- Report base row and child-table persistence now target a database RPC function (`public.save_report_bundle`) instead of only API-level multi-step writes.
- The RPC keeps the additive report hardening direction and does not change attendance, approval, accounting, auth, or RLS policy intent.
- Server-side normalization still happens in the app layer, but the actual DB writes for `weekly_reports`, `report_programs`, `newcomers`, and project child tables are now grouped in one DB transaction boundary.
- `cell_leader` attendance persistence is now part of the same RPC path, while preserving the existing warning-based failure semantics for attendance-only issues.
- Remote verification completed: `public.save_report_bundle` now exists in the Supabase `public` schema for project `zikneyjidzovvkmflibo`.


## 2026-03-26 Update - Report Save Boundary Hardening
- Route-level report save permission validation now covers both editReportId and draft autosave targetReportId paths.
- Client report save no longer treats its own role lookup as the primary edit gate; server route validation remains the authoritative app-layer boundary.
- saveReportViaApi now tolerates malformed or non-JSON route responses and converts them into structured save errors.
- Draft autosave and explicit submit now share a lightweight in-hook serialization path to reduce request races within a single form instance.

## 2026-03-26 Update - Final Report Save Boundary Consistency
- POST /api/reports/save now rejects requests that provide both editReportId and targetReportId, preventing route validation and RPC save target divergence.
- Draft autosave now distinguishes saved, skipped, and failed states so explicit submit no longer surfaces a false autosave failure UI.
- This remained a narrow additive hardening pass inside the report save boundary and did not change attendance, accounting, approval, auth, or RLS intent.

## 2026-03-26 Update - Next.js Proxy Entry
- The deprecated root src/middleware.ts entry was replaced with src/proxy.ts.
- Auth/session behavior is unchanged because the actual logic still lives in src/lib/supabase/middleware.ts and is reused by the new proxy entry.
- Local build verification confirms the previous Next.js middleware -> proxy deprecation warning no longer appears.

## 2026-04-18 Update - MRO DX/AX Reference Document
- Added `docs/reference/mro-dx-ax-reference.md` as a submission-oriented reference document for describing this project as a DX/AX case study.
- The document organizes system architecture, implemented features, AX-ready design points, and screenshot capture guidance for external/internal portfolio use.
- This is a documentation-only additive change and does not modify attendance, report, accounting, auth, or RLS behavior.

## 2026-06-01 Update - Meeting PDF Attachments
- Meeting Management now supports attaching one original PDF minutes file during new meeting creation.
- PDF metadata is stored additively on `meeting_minutes`, while the PDF binary is stored in the private Supabase Storage bucket `meeting-pdfs`.
- Meeting detail creates a signed URL for the attached PDF and shows it inline with a separate open-in-new-window link.
- This does not change attendance, report, accounting, auth, or the existing report approval workflow. The chair/department/pastor approval flow remains in the report module.

## 2026-06-01 Update - Report Delete and Feedback
- Report management now includes delete actions for permitted users in the list and detail views.
- A separate `report_feedback` flow was added so president/department lead/pastor-equivalent roles can leave comments without changing approval state.
- This remains additive and does not change attendance, accounting, auth, or the report approval workflow.

## 2026-06-01 Update - Meeting Delete and Feedback
- Meeting management now includes delete actions in the list and detail views for users who can edit the meeting content.
- A separate `meeting_feedback` flow was added so president/department lead/pastor-equivalent roles can leave comments without changing any approval state, because meetings do not use the report approval flow.
- This remains additive and does not change attendance, report, accounting, auth, or the meeting PDF workflow.

## 2026-06-11 Update - CU1 Attendance And Approval Operations
- Attendance management now loads both present and absent attendance rows for the selected date so an existing false row does not cause a duplicate insert when toggled back on.
- Attendance toggle and bulk actions now check Supabase write errors, roll back optimistic UI state on failure, and show a toast instead of silently appearing saved.
- Added `scripts/ops-2026-06-11-cu1-request.sql` for the requested CU1 data operations: assign Do Jisu to Dahui cell, assign Park Cheolho to Mina cell, and bulk-final-approve existing pending CU1 cell-leader reports.
- This is additive and does not change report approval code, accounting, auth, RLS policies, or schema.
- Production data SQL was not executed because the existing Supabase MCP token returned `Unauthorized`; a fresh Supabase PAT/MCP connection is required.

## 2026-06-18 Update - Meeting Agenda Discussion
- Meeting detail now includes a pre-meeting agenda and question board for department leaders ahead of in-person meetings.
- Added `meeting_agenda_items` and `meeting_agenda_comments` as additive tables for agenda/question/notice items and threaded feedback.
- Active users can view agenda discussion; `super_admin`, `president`, `accountant`, and department leaders can post agenda items and comments.
- This does not change attendance, report, accounting, existing meeting minutes, PDF attachments, or report approval workflows.

## 2026-06-18 Update - Meeting Edit And Cancel Actions
- Meeting detail now exposes explicit text actions for editing meeting base information and canceling a submitted meeting registration.
- Meeting base fields can be edited inline by users with existing meeting edit permission.
- Added a `meetings_update_editors` RLS policy migration so remote Supabase accepts authorized meeting updates.
- "Submit cancel" uses the existing meeting bundle deletion path and does not introduce a report-like approval status model.

## 2026-06-18 Update - Department Agenda PDF Attachments
- Department agenda items can now include one original PDF attachment.
- PDF metadata is stored additively on `meeting_agenda_items`; files reuse the private `meeting-pdfs` Storage bucket under an `agenda/` path.
- Meeting detail shows attached agenda PDFs inline as open links under each department agenda item.
- Existing attendance, report, accounting, meeting minutes, and meeting-level PDF behavior remains unchanged.

## 2026-06-19 Update - Meeting Team Leader Feedback And Agenda PDF RLS Fix
- Meeting feedback permission now includes the meeting creator and team leaders for the meeting department, matching the meeting delete/edit scope.
- Agenda PDF Storage policies now explicitly handle `agenda/{meetingId}/{departmentId}/...` paths so department team leaders can upload and manage their agenda PDFs.
- This is a narrow RLS/client permission fix and does not change attendance, report, accounting, auth, meeting minutes, or report approval workflows.

## 2026-06-19 Update - Meeting Agenda Participant Leader Permission
- Pre-meeting agenda participation now follows the leader-meeting workflow: active `team_leader` users can post agenda items for their own linked departments and can comment on agenda items before the meeting.
- This corrects the previous department-head-only gate that required `user_departments.is_team_leader = true`.
- Agenda PDF Storage policies were aligned with the same participant-leader rule for `agenda/{meetingId}/{departmentId}/...` paths.
- This remains limited to the agenda discussion layer and does not broaden meeting minutes editing, meeting delete/edit, attendance, report approval, accounting, or auth behavior.

## 2026-06-19 Update - Meeting Agenda And Comment Edit
- Pre-meeting agenda items now support inline editing for title, type, and content by the item author or meeting-content editors.
- Agenda comments now support inline editing by the commenter or meeting-content editors.
- Added migration `017_add_meeting_agenda_edit_policies.sql` to make the update RLS explicit for agenda items and comments.
- This is limited to the agenda discussion layer and does not change attendance, report approval, accounting, auth, finalized meeting minutes, or meeting delete/edit scope.

## 2026-06-22 Update - Meeting Agenda Edit UX
- Meeting agenda item editing is now less cumbersome for long agenda documents.
- In edit mode, the agenda board hides the long rendered content/PDF preview and opens the edit fields directly under the item header.
- Agenda item and comment edit fields now autofocus, size themselves more generously, and support Ctrl/Cmd+Enter save.
- This is a UI-only additive refinement inside `MeetingAgendaBoard` and does not change attendance, report, accounting, auth, RLS, meeting minutes, PDF storage, or feedback behavior.

## 2026-06-24 Update - Report Title And Agenda Comment UX
- Report creation header copy was corrected where mojibake text could appear for report type labels and the "작성" title suffix.
- Meeting agenda comment actions now stay grouped on the right side of each comment row so `수정` and `삭제` do not spread across the full row.
- Meeting agenda comment create/update/delete mutations now update the TanStack Query agenda cache immediately, then refetch for server verification.
- This remains UI/client-cache only and does not change attendance, report persistence, accounting, auth, RLS, meeting minutes, PDFs, or database schema.
## 2026-06-29 Update - Report Photo Visibility And Submit Guard
- Report detail now reads `report_photos` and displays attached report photos in a dedicated section, so photos uploaded with a report are visible after submission.
- Report photo upload no longer silently logs upload/metadata failures while showing a success path; failures now surface through the report submit error flow.
- Report creation now prevents implicit Enter-key form submission and only submits when the explicit submit button is used.
- Activity photo gallery upload now cleans up the Storage object if `department_photos` metadata insertion fails, and delete now checks Storage/DB errors.
- `scripts/audit-photo-integrity.sql` was added as a read-only privileged audit to compare `report_photos`/`department_photos` rows with Storage objects.
- Remote Storage inspection confirmed existing uploaded files in both `report-photos` and `department-photos`; DB row count verification still requires authenticated/service-role access because anon REST is RLS-limited.
- This is a narrow report UI/client persistence hardening change. It does not change attendance, accounting, approval status rules, auth flow, RLS policies, or database schema.

## 2026-07-01 Update - CU1 Sungmo Cell Rename
- Prepared `scripts/ops-2026-07-01-rename-sungmo-cell-to-sunwoong.sql` for the requested CU1 data operation.
- The operation renames the active CU1 `성모셀` row to `선웅셀` after verifying Kim Sunwoong remains the active CU1 team leader, assigning Kim Sunwoong's member row to the renamed cell, and confirming Jung Sungmo is no longer assigned to that cell.
- This is data-only and does not change attendance, report, accounting, auth, RLS policies, or database schema.
- Remote Supabase execution completed through the Supabase Management API on project `zikneyjidzovvkmflibo`; final verification shows active CU1 `성모셀` count 0, active CU1 `선웅셀` count 1, Kim Sunwoong still active CU1 team leader, and Jung Sungmo not assigned to `선웅셀`.

## 2026-07-01 Update - Cell Leader Report Privacy
- Ordinary cell leaders can no longer read other cell leaders' reports through the report list, dashboard recent reports, or report detail permission helper.
- Department/team leaders with `user_departments.is_team_leader = true` keep department-level visibility for reports they are responsible for approving.
- Added migration `018_restrict_peer_cell_leader_report_visibility.sql` to replace the broad non-draft report SELECT policy with admin/author/department-leader visibility.
- This is a report privacy/RLS hardening change and does not change attendance, accounting, report save, or approval status behavior.
- Remote Supabase execution completed through the Supabase Management API on project `zikneyjidzovvkmflibo`; `weekly_reports` now uses admin/author/department-leader SELECT policies, and existing child report tables follow parent report visibility.

## 2026-07-02 Update - Han Suyeon B Cell Assignment
- Prepared `scripts/ops-2026-07-02-assign-hansuyeonb-to-taehee-cell.sql` for the requested CU1 data operation.
- The operation assigns active CU1 member Han Suyeon B to Taehee cell, resolving Taehee cell by Lee Taehee's current CU1 cell and failing if the target member or cell is ambiguous.
- This is data-only and does not change attendance, report, accounting, auth, RLS policies, or database schema.
- Remote Supabase execution completed through the Supabase Management API; final verification shows Han Suyeon B and Lee Taehee are both assigned to the active CU1 Taehee cell with `is_primary = true`.

## 2026-07-14 Update - README And App Information
- Refreshed the root README and status README so the onapond GitHub repository describes the current app surface: attendance, reports, report photos, members, meetings, meeting PDFs, pre-meeting agenda discussion, accounting, visitations, photos, statistics, notifications, and report privacy hardening.
- Updated the app metadata description in `src/app/layout.tsx` to include meeting and pre-meeting agenda management.
- Standardized current documentation references to the production alias `https://church-opal.vercel.app`.
- This is documentation/metadata only and does not change attendance, report, accounting, auth, RLS, or database behavior.

## 2026-07-20 Update - Report Photo Storage Permission
- Added migration `019_fix_report_photo_storage_policies.sql` to explicitly align `report-photos` Storage policies with the report id path used by the app: `{reportId}/...`.
- The prior 2026-06-29 report-photo fix was a shared report UI/persistence hardening pass, not a department-specific youth-only patch, but it did not replace the Storage upload policies.
- Report photo upload/delete is now intended to be authorized for the active report author or global admin roles (`super_admin`, `president`, `accountant`) regardless of department, including youth and CU2.
- Remote Supabase project `zikneyjidzovvkmflibo` now has the `report-photos` bucket plus report photo Storage SELECT/INSERT/UPDATE/DELETE policies and `report_photos` table SELECT/ALL policies verified.
- This is a narrow report photo RLS/Storage policy fix. It does not change attendance, accounting, report save bundle logic, approval status transitions, or auth flow.

## 2026-07-20 Update - Report Photo Upload Body Preservation
- Report photo upload now materializes each selected `File` into an `ArrayBuffer`/`Blob` before calling Supabase Storage upload, with a `FileReader` fallback for browser/test environments without `File.arrayBuffer()`.
- This targets `No content provided` upload failures seen after the base report row was saved, where the selected image preview existed but the Storage request could be sent without a readable body.
- Empty or unreadable files now fail before Storage upload with a clearer per-file error, preserving the existing partial-save recovery path to the report edit page.
- This is a narrow client-side report upload hardening change. It does not change attendance, accounting, auth, RLS, database schema, report save RPC, or approval status transitions.

## 2026-07-20 Update - Report Save Permission Validation
- `POST /api/reports/save` now validates the target report first and allows the active author to manage their own `draft` or `rejected` report without depending on a separate `users` role lookup.
- Admin role lookup still runs when needed for non-author management, but author draft finalization no longer fails because a profile role query is blocked or unavailable.
- This targets `Failed to validate report edit permission` during the photo-backed submit path: save draft, upload photos, then finalize the same report.
- This is a narrow report API validation fix. It does not change attendance, accounting, auth, RLS policies, database schema, report save RPC, or approval status rules.
