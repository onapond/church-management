# �?��중앙교회 교육?�원??관�??�스??- 기술 명세??
> **최종 ?�데?�트**: 2026-03-03
> ??문서 ?�나�??�로?�트 ?�체�??�악?????�도�??�성?�었?�니??

---

## 1. ?�로?�트 개요

| ??�� | ?�용 |
|------|------|
| ???�름 | �?��중앙교회 교육?�원??관�??�스??|
| 목적 | 교회 교육부?�의 출결 관�? 보고???�성/결재, 교인 관�? ?�계 관�?|
| ?�로?�션 URL | https://church-eight-delta.vercel.app |
| GitHub | https://github.com/onapond/church-management |
| ?�스??| Vercel (?�동 배포) |

### 기술 ?�택

| ?�역 | 기술 | 버전/비고 |
|------|------|-----------|
| ?�레?�워??| Next.js (App Router) | 16.1.6 |
| ?�어 | TypeScript | strict mode |
| ?��??�링 | Tailwind CSS | v4, 모바???�선 |
| ?�버 ?�태 | TanStack Query | 캐싱, Optimistic Update |
| DB/?�증/?�토리�? | Supabase | PostgreSQL, Auth, Storage, Realtime |
| 차트 | Recharts | ?�적 ?�포??|
| ?�디??| Tiptap | 리치 ?�스??|
| ?��? | xlsx | 가?�오�??�보?�기 |
| ?�시 ?�림 | web-push + VAPID | Service Worker |
| 배포 | Vercel | CDN + Serverless |

---

## 2. ?�키?�처

### ?�스???�이?�그??
```
  브라?��? / 모바??/ ?�블�?           ??           ??  ?��??�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�??  ??   Vercel (CDN)     ??  ?? Next.js 16.1.6     ??  ?? ?��??�?�?�?�?�?�?��??�?�?�?�?�?�?�????  ?? ??Pages ??API    ????  ?? ??App   ?�Routes  ????  ?? ?�Router)??/api)  ????  ?? ?��??�?�?�?�?�?�?��??�?�?�?�?�?�?�????  ?? Proxy (auth/session)   ??  ?��??�?�?�?�?�?�?�?�?��??�?�?�?�?�?�?�?�?�?�??            ??            ??  ?��??�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�??  ??    Supabase        ??  ???��??�?�?�?�?�?�?�?��??�?�?�?�?�?�?�????  ???�Postgres?? Auth  ????  ???? (DB)  ??email) ????  ???��??�?�?�?�?�?�?�?��??�?�?�?�?�?�?�????  ???�Storage ?�Realtime????  ????photos)???�림)  ????  ???��??�?�?�?�?�?�?�?��??�?�?�?�?�?�?�????  ?��??�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�??```

### ?�이???�턴

모든 ?�이지??**`'use client'` thin wrapper ?�턴**???�용:
1. `page.tsx`??`'use client'` ?�언 ??Client 컴포?�트 ?�더
2. Client 컴포?�트가 `useAuth()` + TanStack Query ?�으�??�이??로드
3. 캐시 ?�분???�방�???즉시 ?�시

---

## 3. ?�이?�베?�스

### ?�이�?목록 (17�??�이�?+ 2�?�?

| ?�이�?| ?�도 | ?�심 컬럼 |
|--------|------|-----------|
| `departments` | 부??| code, name |
| `users` | ?�용??| email, name, role, is_active |
| `meetings` | ?�의 | title, department_id, meeting_date, created_by |
| `members` | 교인 명단 | name, phone, birth_date, photo_url |
| `weekly_reports` | 보고??| department_id, report_date, week_number, status |
| `attendance_records` | 출석 기록 | member_id, attendance_date, attendance_type |
| `visitations` | ?�방 ?�정/보고 | visit_date, member_name, status, reason |
| `notifications` | ?�앱 ?�림 | user_id, title, is_read |
| `accounting_records` | ?�계?��? | department_id, record_date, income, expense |

### ?�이 ?�항 �?보정 ?�력 (2026-03-03)

**주차 ?�이???�동기화:**
과거 로직 ?�류�??�해 `week_number`가 ?�짜?� ?�긋???�이?��? ?�래 SQL�??�수 보정?? (2/15 -> 7주차�??�상??
```sql
UPDATE weekly_reports
SET week_number = ((report_date - (EXTRACT(DOW FROM report_date)::integer)) - '2026-01-04'::date) / 7 + 1
WHERE year = 2026 AND report_type = 'weekly';
```

**출결 ?�??404 ?�러 ?�결:**
`attendance_records` ?�이블에 `upsert` ??`onConflict` ?�라미터 불일�?문제 ?�결???�해 ?�션 ?�거(?�동 감�?).

---

## 4. 권한 ?�스??
### permissions.ts ?�심 ?�수

| ?�수 | ?�명 |
|------|------|
| `canViewReport` | 보고???�람 7?�계 권한 체크 |
| `isTeamLeader` | user_departments?�서 부???�???��? ?�인 |
| `canAccessAccounting` | ?�계 기능 ?�근 권한 ?�인 |
| `canCreateMeeting` | ?�의 ?�성 가????�� 체크 |

### meetings 권한

- 조회: 로그?????�인???�용???�체
- ?�성: `super_admin`, `president`, `team_leader`
- ?�결: `department_id`�?부?��? 직접 ?�결
- ?�장 ?�제: 결정?�항/Task/AI ?�약?� ?�속 Phase?�서 별도 추�?

---

## 5. 결재 ?�크?�로??
`draft` ??`submitted` ??`coordinator_reviewed` ??`manager_approved` ??`final_approved`
(반려 ??`rejected` ?�태?�서 ?�정 ???�제�?가??

## 2026-03-15 Meeting Minutes Extension
- Added \\public.meeting_minutes\\ with columns: \\meeting_id\\ (unique FK), \\discussion_notes\\, \\decisions\\, \\handoff_notes\\, \\updated_by\\, \\created_at\\, \\updated_at\\.
- RLS: authenticated active users can select; leaders/admins with meeting create permission can insert and update minutes for meetings in their scope.
- UI: meeting detail now reads and upserts structured minutes via TanStack Query without changing Phase 1 meeting routes.
- Permission alignment: `canEditMeetingContent` is scoped by `department_id` so the client edit state matches remote RLS behavior.
- Meeting create flow now optionally upserts \\meeting_minutes\\ immediately after the base \\meetings\\ insert, allowing one-submit creation without merging the two tables.

## 2026-03-26 Report Edit Save Hardening
- Edit mode no longer deletes `report_programs`, `newcomers`, `project_content_items`, `project_schedule_items`, and `project_budget_items` before replacement data is written.
- Child-row persistence now follows: insert new rows -> update retained rows by `id` -> delete removed rows after successful replacement.
- This improves failure behavior for partial edit saves without changing report parent schema, approval flow, auth, or RLS.
- Added authenticated API route `POST /api/reports/save` to orchestrate report base-row and child-row persistence on the server.

## 2026-03-26 Transactional Report Save RPC
- Added DB function: `public.save_report_bundle(payload jsonb)`.
- Purpose: move report core persistence from API-layer orchestration to a single DB transaction boundary.
- Input payload includes:
  - normalized `report_data`
  - normalized child rows for `report_programs`, `newcomers`, `project_content_items`, `project_schedule_items`, `project_budget_items`
  - attendance member id arrays for present/absent cell members
  - save mode metadata (`is_draft`, `target_report_id`, `edit_report_id`, `selected_cell_id`)
- Route flow:
  - `src/app/api/reports/save/route.ts` still validates auth and edit permission
  - `src/components/reports/utils/reportPersistence.ts` normalizes the request and calls `save_report_bundle`
  - notification creation remains in server app code after successful DB save
- Failure semantics:
  - duplicate report cases return structured duplicate metadata from the RPC
  - core report/child-table writes fail atomically inside the RPC transaction
  - `attendance_records` failures are downgraded to warnings and returned as `warnings[]`
- Scope kept additive:
  - no changes to attendance screen flow
  - no changes to approval workflow state model
  - no RLS bypass introduced by the app layer
- Remote verification:
  - applied to Supabase project `zikneyjidzovvkmflibo`
  - verified via `information_schema.routines` that `public.save_report_bundle` exists


## 2026-03-26 Report Save Boundary Hardening
- Route preflight for POST /api/reports/save now validates report ownership/editability for both editReportId and targetReportId requests.
- App-layer authority is now clearer: client-side report submit no longer blocks edit saves on a separate role lookup before the route check runs.
- Client API handling now accepts malformed/non-JSON route failures and maps them into structured save errors instead of assuming JSON parsing success.
- Client save concurrency is lightly serialized per form instance so draft autosave and explicit submit are less likely to race each other.

## 2026-03-26 Report Save Boundary Final Consistency
- Route contract for POST /api/reports/save is now explicit:
  - draft autosave update uses targetReportId only
  - edit save uses editReportId only
  - requests containing both ids are rejected with 400 before persistence
- Client autosave semantics are now explicit in the app layer:
  - saved = draft snapshot persisted successfully
  - skipped = autosave intentionally suppressed because explicit submit is in flight
  - failed = real autosave failure
- This prevents false autosave error UI during explicit submit while preserving the same report save RPC boundary and warning-based attendance semantics.

## 2026-03-26 Next.js Proxy Entry
- Root request interception now uses src/proxy.ts instead of the deprecated src/middleware.ts convention.
- The implementation still delegates to src/lib/supabase/middleware.ts for cookie/session refresh and protected-route redirects.
- Verified locally: npm run build passes without the previous middleware -> proxy deprecation warning.

## 2026-04-18 Reference Documentation
- Added `docs/reference/mro-dx-ax-reference.md`.
- Purpose: explain the current architecture and implemented workflow as a DX/AX reference document, including screenshot capture guidance and business translation for non-church operational environments.
- No technical behavior, schema, auth, or RLS changes were introduced.

## 2026-06-01 Meeting PDF Attachments
- Migration `008_add_meeting_pdf_attachments.sql` extends `meeting_minutes` with PDF attachment metadata:
  - `pdf_file_path`
  - `pdf_file_name`
  - `pdf_file_size`
  - `pdf_uploaded_at`
- Supabase Storage bucket `meeting-pdfs` is private, limited to `application/pdf`, and capped at 20MB per object.
- Storage RLS:
  - select: active authenticated users
  - insert/update/delete: active users who can edit the meeting content, aligned with existing meeting minutes scope (`super_admin`, `president`, or team leader for the meeting department)
- UI/API flow:
  - `MeetingForm` creates the base meeting, uploads the PDF under `{meetingId}/...`, then upserts `meeting_minutes` metadata.
  - `MeetingDetail` uses a signed URL query to embed the PDF and provide a new-window link.
- Existing attendance, report, accounting, auth, and report approval workflow behavior is unchanged.

## 2026-06-01 Report Delete and Feedback
- Report deletion now uses a shared helper that removes `report-photos/{reportId}` objects before deleting the `weekly_reports` row.
- The report list view shows a delete action for users who already satisfy the existing report-management permission rules.
- A new `report_feedback` table stores separate comments from `super_admin`, `president`, and `accountant` roles.
- Feedback is read through a dedicated TanStack Query hook and written without changing `weekly_reports.status` or `approval_history`.

## 2026-06-01 Meeting Delete and Feedback
- Meeting deletion now uses a shared helper that removes `meeting-pdfs/{meetingId}` objects before deleting the `meetings` row.
- The meeting list and detail views show delete actions for users who already satisfy the existing meeting-content edit permission rules.
- A new `meeting_feedback` table stores separate comments from `super_admin`, `president`, and `accountant` roles.
- Feedback is read through a dedicated TanStack Query hook and written without changing meeting rows or minutes rows.

## 2026-06-11 CU1 Attendance And Approval Operations
- Attendance date queries used by the attendance screen no longer filter to `is_present = true`; false rows are needed so toggling them back on updates the existing unique `(member_id, attendance_date, attendance_type)` row.
- Attendance writes now fail visibly on Supabase/RLS errors and use explicit conflict handling for insert-or-update paths.
- Added data-only SQL script `scripts/ops-2026-06-11-cu1-request.sql`.
- The SQL targets:
  - `member_departments.cell_id` for Do Jisu and Park Cheolho in CU1.
  - `weekly_reports.status`, final approver fields, and missing `approval_history` rows for CU1 `cell_leader` reports still in `submitted`.
- No schema, RLS policy, auth flow, report workflow code, or accounting behavior changed.

## 2026-06-18 Meeting Agenda Discussion
- Added `public.meeting_agenda_items`:
  - `meeting_id`, `department_id`, `author_id`
  - `item_type`: `agenda`, `question`, or `notice`
  - `title`, `content`, `status`: `open` or `resolved`
- Added `public.meeting_agenda_comments` for item-level follow-up questions and feedback.
- RLS:
  - select: active authenticated users
  - insert: active `super_admin`, `president`, `accountant`, or department leaders
  - update/delete agenda items: item author or meeting-content editors
  - delete comments: commenter, item author, or meeting-content editors
- UI:
  - `MeetingDetail` renders `MeetingAgendaBoard` before finalized minutes/PDF sections so pre-meeting coordination is visible first.
  - `MeetingAgendaBoard` presents agenda items in Notion-like department sections, while still storing each item in the normalized `meeting_agenda_items` table.
  - The feature is separate from `meeting_feedback`, which remains an admin feedback trail and does not become a discussion board.
- Existing attendance, report approval, accounting, meeting minutes, and PDF flows are unchanged.

## 2026-06-18 Meeting Edit And Cancel Actions
- Added migration `013_add_meeting_update_policy.sql`.
- `meetings_update_editors` allows updates by:
  - meeting creator
  - `super_admin`
  - `president`
  - team leader of the meeting department
- Meeting detail supports inline editing for title, department, date/time, location, and description.
- Meeting "submit cancel" uses existing meeting bundle deletion, including related minutes, PDFs, feedback, agenda items, and agenda comments through cascade/helper behavior.
- No report approval status or notification workflow changes were introduced.

## 2026-06-18 Department Agenda PDF Attachments
- Added migration `014_add_meeting_agenda_pdf_attachments.sql`.
- `meeting_agenda_items` now includes:
  - `pdf_file_path`
  - `pdf_file_name`
  - `pdf_file_size`
  - `pdf_uploaded_at`
- Agenda PDFs reuse the private `meeting-pdfs` Storage bucket and are uploaded to `agenda/{meetingId}/{departmentId}/...`.
- The UI creates signed URLs for attached agenda PDFs through TanStack Query.
- Deleting an agenda item also removes its attached Storage object when present.
- Existing meeting minutes PDFs and meeting-level PDF behavior are unchanged.

## 2026-06-19 Meeting Team Leader Feedback And Agenda PDF RLS Fix
- Added migration `015_fix_meeting_team_leader_feedback_and_agenda_pdf.sql`.
- `meeting_feedback` insert RLS now permits active meeting creators, `super_admin`, `president`, `accountant`, and team leaders for the meeting department.
- `meeting-pdfs` Storage insert/update/delete policies now explicitly support agenda PDF paths under `agenda/{meetingId}/{departmentId}/...` for admins and the matching department team leader.
- Client permission logic now uses `canLeaveMeetingFeedback` instead of a role-only check.
- Existing attendance, report approval, accounting, meeting minutes, and auth flows are unchanged.

## 2026-06-19 Meeting Agenda Participant Leader Permission
- Added migration `016_allow_meeting_agenda_participant_leaders.sql`.
- `meeting_agenda_items` insert RLS now permits active admins and active `team_leader` users for departments linked through `user_departments.department_id`.
- `meeting_agenda_comments` insert RLS now permits active admins and active `team_leader` users so leader-meeting participants can exchange questions and feedback before the meeting.
- Agenda PDF Storage policies now use the same linked-department participant rule for `agenda/{meetingId}/{departmentId}/...` paths.
- Client permission logic now treats active `team_leader` users as agenda participants, while still limiting the agenda item department selector to their linked departments.
- Existing meeting minutes editing, meeting delete/edit, attendance, report approval, accounting, and auth flows are unchanged.

## 2026-06-19 Meeting Agenda And Comment Edit
- Added migration `017_add_meeting_agenda_edit_policies.sql`.
- `meeting_agenda_items` update RLS explicitly permits the agenda item author or meeting-content editors.
- `meeting_agenda_comments` update RLS permits the commenter or meeting-content editors.
- `MeetingAgendaBoard` supports inline editing for agenda item title/type/content and comment text.
- Existing attendance, report approval, accounting, auth, finalized meeting minutes, and meeting delete/edit scopes are unchanged.

## 2026-06-22 Meeting Agenda Edit UX
- `MeetingAgendaBoard` keeps using the existing agenda item/comment update mutations and RLS policies.
- Agenda item edit mode now suppresses the rendered long body and attached PDF preview while editing, so the edit controls appear immediately near the item header.
- Agenda item/comment edit controls autofocus, use larger dynamic textarea row counts, and support Ctrl/Cmd+Enter save.
- No database, storage, auth, RLS, attendance, report, accounting, meeting minutes, or feedback behavior changed.
