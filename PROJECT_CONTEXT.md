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
