# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **기능 구현 ?�크?�로??*??글로벌 규칙(`~/.claude/CLAUDE.md`)???�른??

# �?��중앙교회 교육?�원??관�??�스??
## ?�로?�트 개요
- **???�름**: �?��중앙교회 교육?�원??관�??�스??- **기술 ?�택**: Next.js 16.1.6, Supabase, TypeScript, Tailwind CSS v4
- **배포**: Vercel (https://church-opal.vercel.app)
- **GitHub**: https://github.com/onapond/church-management (remote: onapond)

## ?�작 ???�수 ?�인 문서
**???�션 ?�작 ??반드???�래 ?�일?�을 먼�? ?�어주세??**
1. `.claude/session-notes.md` - 최근 ?�업 ?�역 �??�음 ?�업
2. `.claude/bugs.md` - ?�려�?버그 �??�결 ?�력
3. `docs/REACT_BEST_PRACTICES.md` - React/Next.js ?�능 최적??가?�드 (57�?규칙)

## 기능 분석 문서
?�세 문서??`docs/status/` ?�더�?참조:
- [01-system-overview.md](docs/status/01-system-overview.md) - 기술 ?�택, ?�키?�처
- [02-features.md](docs/status/02-features.md) - ?�이지�?기능 목록
- [03-workflow.md](docs/status/03-workflow.md) - 결재/?�증/?�림 ?�크?�로??- [04-database.md](docs/status/04-database.md) - ?�이�?구조, ERD
- [05-components.md](docs/status/05-components.md) - 컴포?�트 구조
- [06-api.md](docs/status/06-api.md) - API, ?�틸리티

## 컨텍?�트 관�?�?문서??규칙 (?�수)

**모든 주요 ?�업(기능 구현, 버그 ?�정, ?�키?�처 변�??? ?�료 ?�에???�래 4개의 ?�심 문서�?반드??최신?�해???�니??**
1.  **`PROJECT_CONTEXT.md`**: 최근 ?�업 ?�역, ?�재 ?�스???�태 �?중단 지???�약
2.  **`CLAUDE.md`**: 변경된 개발 규칙, 배포 ?�로?�스 �??�로??기술??결정?�항 반영
3.  **`docs/TECHNICAL_SPEC.md`**: ?�정??DB ?�키�?ERD), API ?�드?�인?? 권한 로직 ??기술 명세 ?�데?�트
4.  **`docs/USER_GUIDE.md`**: 추�??�거??변경된 기능???�???�용??메뉴???�데?�트

**컨텍?�트가 90% ?�상 ?�용?�기 ?�에** `.claude/session-notes.md`???�업 ?�역 ?�약:
- ?�료???�업, 진행 중인 ?�업 (중단 지??명시)
- ?�음???�야 ???�업, 관???�일 경로
- 주요 결정?�항 �??�유

## 코드 ?�성 규칙

### ?�능 최적??**코드 ?�성 ??`docs/REACT_BEST_PRACTICES.md`�?참조?�세??** ?�주 ?�용??규칙:
- URL ?�태??`useEffect` ?�???�생 ?�태�?직접 계산
- 모달/?�업?� 별도 `memo` 컴포?�트�?분리
- ?�벤???�들?�는 `useCallback`?�로 메모?�제?�션
- 무거??컴포?�트??`next/dynamic`?�로 ?�적 ?�포??
### ?�반
- ?��? 주석/메시지 ?�용 (?�국 교회 ?�스??
- TypeScript strict mode 준??- 컴포?�트??`'use client'` ?�는 ?�버 컴포?�트�?명확??구분

### ?�일 구조
```
src/
?��??� app/
??  ?��??� (dashboard)/     # ?�증 ?�요 ?�이지
??  ??  ?��??� dashboard/, attendance/, reports/, members/
??  ??  ?��??� accounting/, approvals/, photos/
??  ??  ?��??� error.tsx    # ?�?�보??ErrorBoundary
??  ??  ?��??� layout.tsx   # AuthProvider + ToastProvider ?�핑
??  ?��??� api/             # API ?�우????  ?��??� error.tsx        # 글로벌 ErrorBoundary
?��??� components/
??  ?��??� layout/          # Header, Sidebar (useAuth() ?�용)
??  ?��??� reports/         # ReportForm + ?�브컴포?�트 4�???  ?��??� members/         # MemberForm + ?�브컴포?�트 6�???  ?��??� accounting/      # ?�계?��?, 지출결?�서
??  ?��??� dashboard/       # ?�?�보???�젯
??  ?��??� notifications/   # NotificationBell
??  ?��??� ui/              # Toast, ErrorBoundary ???��??� providers/           # AuthProvider, QueryProvider, ToastProvider
?��??� queries/             # TanStack Query ??(departments, members, reports ??
?��??� hooks/               # useDebounce, useToast
?��??� lib/
??  ?��??� supabase/        # ?�버/?�라?�언??Supabase ?�라?�언????  ?��??� permissions.ts   # 중앙?�된 권한 체크
??  ?��??� constants.ts     # 공통 ?�수
??  ?��??� utils.ts         # ?�틸리티 ?�수
??  ?��??� errors.ts        # 커스?� ?�러 ?�래????  ?��??� rate-limit.ts    # API rate limiting
?��??� types/
    ?��??� database.ts      # DB ?�???�의
    ?��??� shared.ts        # 공유 ?�터?�이??```

### Supabase
- ?�버: `import { createClient } from '@/lib/supabase/server'`
- ?�라?�언?? `import { createClient } from '@/lib/supabase/client'`
- ?�?? `src/types/database.ts` 참조

### ?��??�링
- Tailwind CSS v4, 모바???�선 ?�계
- 반응?? `lg:` ?�리?�스�??�스?�톱 ?��???구분

## 배포 ?�로?�스 (?�수 규칙)
**반드??로컬?�서 `npm run build` ?�공???�인????배포**
```bash
# 1. 로컬 빌드 ?�인 (?�수 ?????�계 ?�이 배포 금�?)
npm run build

# 2. Git 커밋/?�시
git add <files> && git commit -m "커밋 메시지" && git push origin main

# 3. Vercel 배포
npx vercel --prod
```
- Vercel ?�로?�트 ?�정: `framework: nextjs`, `buildCommand: next build`
- `--prebuilt`??Next.js 16 RSC segments ?�환 문제�??�용 불�?
- 로컬 `npm run build`�?빌드 ?�러�?반드???�전 ?�인 ??배포??�?- **?�로?�션 URL**: https://church-opal.vercel.app
- GitHub ?�동 배포 미연�?(?�동 배포 ?�요)

## 주요 ?�이�?- `users`: ?�용??(??��: super_admin, president, accountant, team_leader, member)
- `departments`: 부??(ck, cu_worship, youth, cu1, cu2, leader)
- `meetings`: ?�의 기본 ?�보 (title, description, department_id, meeting_date, location)
- `members`: 교인 명단
- `weekly_reports`: 보고??(weekly, meeting, education)
- `attendance_records`: 출결 기록
- `notifications`: ?�림
- `accounting_records`: ?�계?��?
- `expense_requests`: 지출결?�서

## ?�주 ?�용?�는 명령??```bash
npm run dev          # 개발 ?�버 (http://localhost:3000)
npm run build        # 빌드
npm test             # vitest ?�스??(93�?
npx tsc --noEmit     # ?�??체크
npx vercel --prod    # Vercel ?�로?�션 배포
```

## ?�키?�처

### ?�증 ?�름
- `src/middleware.ts` ??Supabase ?�션 갱신
- `src/providers/AuthProvider.tsx` ??useAuth() Context ?�공
- `src/app/(dashboard)/layout.tsx` ??미인�???`/login` 리다?�렉??
### 결재 ?�크?�로??`draft` ??`submitted` ??`coordinator_reviewed` ??`manager_approved` ??`final_approved`
- ?�태 변�???`approval_history` ?�력 ?�??+ ?�림 발송

### ?�중 부??지??- `member_departments` 조인 ?�이�? `is_primary` ?�래�?- 쿼리: `members` ??`member_departments` ??`departments` 조인

### ?�능 ?�턴
- Supabase ?�라?�언???��??? Optimistic Updates
- Recharts ?�적 ?�포?? URL searchParams ?�생 ?�태
- 리스??`useMemo`, ?�벤??`useCallback`, 모달 `memo` 분리

## 2026-03-15 Notes
- Meeting detail now supports structured minutes editing through a separate \\meeting_minutes\\ table.
- Keep meeting metadata in \\meetings\\ and operational content in \\meeting_minutes\\ for additive expansion toward tasks and AI plugins.
- Supabase MCP verification confirmed tables and RLS policies, but remote migration history was not updated by the direct MCP SQL execution path.
- Frontend meeting minutes edit permission now mirrors RLS scope: admins can edit any meeting, and team leaders can edit only meetings in departments they lead.
- New meeting creation was streamlined so users can save the meeting record and structured minutes together from the create form.

## 2026-03-26 Notes
- Report edit persistence now uses a non-destructive child-row replacement pattern for programs, newcomers, and project child tables.
- Preserve existing child rows until replacement writes succeed; avoid delete-first behavior in edit mode.
- Verification for this change passed with `npm test`, `npm run build`, and `npx tsc --noEmit`.
- Report draft/save persistence now also routes through `POST /api/reports/save` for shared server-side orchestration.

## 2026-03-26 Notes - Transactional Report Save RPC
- `POST /api/reports/save` now uses a DB RPC-backed persistence path for the core report bundle instead of only JavaScript orchestration.
- Added migration `supabase/migrations/006_save_report_bundle_rpc.sql` for `public.save_report_bundle(payload jsonb)`.
- Keep server cookie auth and current permission checks in the route layer; keep notification creation in the server app layer after DB save success.
- `attendance_records` remains warning-tolerant inside the RPC so report save can still succeed when attendance persistence fails independently.
- Added focused tests for duplicate response handling, edit-save path, attendance warning propagation, and autosave target update routing.
- Remote Supabase verification now confirms `public.save_report_bundle` exists in `public`.

## 2026-03-26 Notes - Report Save Boundary Hardening
- POST /api/reports/save permission preflight now validates targetReportId draft updates with the same author/admin/status rule used for editReportId.
- src/components/reports/hooks/useReportSubmit.ts now treats the route as the main app-layer authority for edit permission instead of doing a separate blocking client role lookup first.
- saveReportViaApi now downgrades malformed or text error responses into structured ok: false payloads for safer client handling.
- Autosave and explicit submit now run through a small exclusive queue to reduce intra-form save races.
## 2026-03-26 Notes - Final Report Save Boundary Consistency
- POST /api/reports/save now rejects dual-id requests (editReportId + 	argetReportId) before persistence so route validation and DB write target stay aligned.
- src/components/reports/hooks/useReportSubmit.ts now returns explicit autosave result states and src/components/reports/ReportForm.tsx no longer shows a false autosave error when submit intentionally suppresses autosave.
- Verification passed with focused report-save tests, full 
pm test, 
px tsc --noEmit, and 
pm run build.

## 2026-03-26 Notes - Proxy Rename
- Replaced the deprecated root Next.js entry src/middleware.ts with src/proxy.ts.
- Keep using src/lib/supabase/middleware.ts for the actual Supabase session update logic; this was a file-convention change only.

## 2026-04-18 Notes - MRO DX/AX Reference
- Added `docs/reference/mro-dx-ax-reference.md` for portfolio/submission use.
- The document summarizes architecture, core implementation areas, AX-ready extension points, and screenshot guidance without changing application behavior.

## 2026-06-01 Notes - Meeting PDF Attachments
- New meeting creation supports attaching a PDF minutes file to the meeting.
- `meeting_minutes` now carries PDF metadata (`pdf_file_path`, `pdf_file_name`, `pdf_file_size`, `pdf_uploaded_at`) and the file itself lives in the private `meeting-pdfs` Supabase Storage bucket.
- Meeting detail reads the stored path, creates a signed URL, and embeds the PDF for viewing.
- Existing report approval logic and notification flow were not changed.

## 2026-06-01 Notes - Report Delete and Feedback
- Report list/detail now expose delete actions for users allowed by the existing report management permission rules.
- Report feedback is stored separately in `report_feedback` and is available to `super_admin`, `president`, and `accountant` without touching approval state.
- Keep the approval workflow unchanged; feedback is an additive side channel, not a new approval step.

## 2026-06-01 Notes - Meeting Delete and Feedback
- Meeting list/detail now expose delete actions for users who can edit the meeting content.
- Meeting feedback is stored separately in `meeting_feedback` and is available to `super_admin`, `president`, and `accountant`.
- Meetings do not use the report approval flow; feedback is only a comment trail and should stay separate from status/state logic.

## 2026-06-11 Notes - CU1 Attendance And Approval Operations
- Attendance screen reads absent rows as well as present rows, preventing duplicate-key failures when a previously unchecked attendance row is checked again.
- Attendance writes now use explicit Supabase error handling and `onConflict: member_id,attendance_date,attendance_type` upsert where appropriate.
- Bulk attendance actions respect the current cell filter and roll back UI state if the write fails.
- Data operations for Do Jisu/Dahui cell, Park Cheolho/Mina cell, and CU1 pending cell-leader report bulk approval are prepared in `scripts/ops-2026-06-11-cu1-request.sql`.
- Existing attendance/report/accounting/auth/RLS structures remain unchanged; production SQL still needs a fresh Supabase PAT/MCP connection because the cached token is unauthorized.

## 2026-06-18 Notes - Meeting Agenda Discussion
- Meeting detail includes a pre-meeting agenda discussion board through `src/components/meetings/MeetingAgendaBoard.tsx`.
- Schema extension lives in `supabase/migrations/012_add_meeting_agenda_discussion.sql` and adds `meeting_agenda_items` plus `meeting_agenda_comments`.
- Agenda participation is intentionally broader than meeting-content editing: active `super_admin`, `president`, `accountant`, and department leaders can post items/comments.
- Keep this separate from `meeting_minutes` and `meeting_feedback`; it is for pre-meeting coordination, not approval or finalized minutes.

## 2026-06-18 Notes - Meeting Edit And Cancel Actions
- Meeting detail now has explicit `수정` and `제출 취소` text buttons for users who can edit/delete the meeting.
- `제출 취소` deletes the meeting bundle because meetings do not have the report approval status lifecycle.
- `supabase/migrations/013_add_meeting_update_policy.sql` adds authorized update RLS for `meetings`.

## 2026-06-18 Notes - Department Agenda PDF Attachments
- `supabase/migrations/014_add_meeting_agenda_pdf_attachments.sql` extends `meeting_agenda_items` with PDF metadata.
- Agenda PDFs reuse the private `meeting-pdfs` bucket and are stored under `agenda/{meetingId}/{departmentId}/...`.
- Keep agenda PDFs separate from meeting minutes PDFs; they are source material for department agenda discussion.

## 2026-06-19 Notes - Meeting Team Leader Feedback And Agenda PDF RLS Fix
- `supabase/migrations/015_fix_meeting_team_leader_feedback_and_agenda_pdf.sql` aligns meeting feedback insert RLS with meeting creator/department team leader permissions.
- Meeting detail uses `canLeaveMeetingFeedback` so team leaders see the feedback form when RLS will allow the insert.
- Agenda PDF Storage policies now explicitly evaluate `agenda/{meetingId}/{departmentId}/...` paths for department team leader access.

## 2026-06-19 Notes - Meeting Agenda Participant Leader Permission
- `supabase/migrations/016_allow_meeting_agenda_participant_leaders.sql` aligns pre-meeting agenda RLS with the leader-meeting workflow.
- Active `team_leader` users can post agenda items for departments linked in `user_departments`, even when that link is not marked `is_team_leader = true`.
- Active `team_leader` users can comment on agenda items, and agenda PDF Storage policies use the same linked-department rule.
- This is intentionally scoped to the pre-meeting agenda board and does not change meeting minutes edit/delete permissions.

## 2026-06-19 Notes - Meeting Agenda And Comment Edit
- `src/components/meetings/MeetingAgendaBoard.tsx` now exposes inline edit controls for agenda item title/type/content and comment text.
- `src/queries/meetings/useMeetings.ts` includes update mutations for `meeting_agenda_items` and `meeting_agenda_comments`.
- `supabase/migrations/017_add_meeting_agenda_edit_policies.sql` adds explicit update RLS for agenda items/comments.
- Keep this scoped to pre-meeting discussion; do not broaden finalized minutes edit/delete permissions from this change.
