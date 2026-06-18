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
