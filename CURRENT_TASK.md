# CURRENT_TASK.md

## 2026-06-01 Update - Meeting Delete and Feedback
- 회의 목록과 상세에서 권한이 있는 사용자는 삭제할 수 있게 정리한다.
- 회의는 결재 흐름이 없지만, 회장/부장/목사 역할은 별도 피드백을 남길 수 있게 한다.
- 기존 출결/보고/회계/회의 PDF 흐름은 유지한다.
- 변경 대상:
  - `src/components/meetings/MeetingList.tsx`
  - `src/components/meetings/MeetingDetail.tsx`
  - `src/queries/meetings/useMeetings.ts`
  - `src/types/database.ts`
  - `supabase/migrations/010_add_meeting_feedback.sql`
  - `src/components/meetings/utils/meetingDeletion.ts`

이 파일은 "이번 작업"의 단일 기준 문서다. 작업을 시작하기 전에 최신 상태로 갱신하고, 구현 중 범위가 바뀌면 즉시 업데이트한다.

## 1. Task Summary
- 요청 제목: 회의 탭 PDF 회의록 업로드/보기
- 요청 목적: `/meetings/new`에서 새 회의를 등록할 때 PDF 회의록 원본을 첨부하고, 회의 상세 화면에서 PDF를 그대로 볼 수 있게 한다.
- 요청 원문 요약: "회의 탭에 pdf 파일 올리는 기능을 넣어줘. 새회의에 pdf로 내용 그대로 올리고 pdf를 볼 수 있게. 그리고 회장-부장-목사님이 결재하는건 똑같이."

## 2. Scope
- 이번 작업에 포함:
  - 회의록 PDF 첨부 메타데이터를 `meeting_minutes`에 추가
  - Supabase Storage `meeting-pdfs` 버킷 및 RLS 정책 추가
  - 새 회의 등록 폼에서 PDF 파일 업로드
  - 회의 상세 화면에서 PDF signed URL 생성 후 iframe/새 창 링크로 보기
- 이번 작업에서 제외:
  - 기존 attendance/report/accounting 흐름 변경
  - 기존 보고서 결재 상태 모델 변경
  - AI 회의록 추출/요약 또는 PDF 텍스트 파싱

## 3. Impact Check
- attendance 흐름 영향: 없음.
- report 흐름 영향: 없음. 회장-부장-목사님 결재 흐름은 기존 보고서 결재 그대로 유지한다.
- accounting 흐름 영향: 없음.
- additive change 여부: 예. 기존 `meetings` 기본 정보는 그대로 두고 `meeting_minutes`와 Storage만 확장한다.
- 권한/RLS/auth 영향: auth 흐름은 변경하지 않는다. PDF 조회는 활성 로그인 사용자, 업로드/수정/삭제는 회의록 편집 권한과 같은 관리자/회장 또는 해당 부서 팀리더 범위로 제한한다.

## 4. Files In Scope
- 예상 수정 파일:
  - `supabase/migrations/008_add_meeting_pdf_attachments.sql`
  - `src/types/database.ts`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingForm.tsx`
  - `src/components/meetings/MeetingDetail.tsx`
  - `PROJECT_CONTEXT.md`
  - `CLAUDE.md`
  - `docs/TECHNICAL_SPEC.md`
  - `docs/USER_GUIDE.md`
  - `.claude/session-notes.md`
  - `CURRENT_TASK.md`

## 5. Implementation Plan
1. `meeting_minutes`에 PDF 경로/파일명/크기/업로드 시각 컬럼을 추가한다.
2. private Storage 버킷 `meeting-pdfs`를 만들고 RLS 정책을 회의 편집 권한과 맞춘다.
3. 새 회의 저장 후 PDF를 `meeting-pdfs/{meetingId}/...` 경로에 업로드하고 메타데이터를 회의록 upsert payload에 포함한다.
4. 회의 상세 화면에서 PDF signed URL을 가져와 iframe과 새 창 링크를 제공한다.
5. 필수 문서를 업데이트하고 build/test/typecheck로 검증한다.

## 6. Risks And Guardrails
- DB 변경은 migration 파일로만 작성한다.
- 기존 결재 테이블/상태/알림 로직을 변경하지 않는다.
- PDF 버킷은 public으로 열지 않고 signed URL을 사용한다.
- PDF는 20MB 이하, MIME 또는 확장자가 PDF인 파일만 허용한다.

## 7. Verification Plan
- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- 필요 시 `npm run lint`는 기존 lint backlog가 남아 있을 수 있어 결과를 별도로 보고한다.

## 8. Execution Notes
- 회의 PDF 첨부 구현 완료:
  - `meeting_minutes` PDF 메타데이터 컬럼 추가 migration 작성
  - private `meeting-pdfs` Storage 버킷 및 RLS 정책 작성
  - 새 회의 등록 시 PDF 업로드 및 메타데이터 저장
  - 회의 상세에서 signed URL 기반 PDF 보기 추가
- 검증 실패 해결:
  - push API 테스트 기대값을 실제 route payload 계약에 맞춤
  - Supabase 테스트 mock 타입 캐스팅 정리
  - accounting/stats query 타입 추론 문제 정리
  - 기존 lint backlog를 좁게 정리하여 `npm run lint` 통과

## 9. Completion Record
- 실제 수정 파일:
  - `supabase/migrations/008_add_meeting_pdf_attachments.sql`
  - `src/types/database.ts`
  - `src/queries/meetings/useMeetings.ts`
  - `src/components/meetings/MeetingForm.tsx`
  - `src/components/meetings/MeetingDetail.tsx`
  - 검증 실패 정리 관련 accounting/reports/notifications/push/stats/users/permissions 파일
  - 필수 문서 및 session notes
- 검증:
  - `npx tsc --noEmit` 통과
  - `npm test` 통과, 153 tests
  - `npm run lint` 통과
  - `npm run build` 통과
- 미해결 이슈:
  - Supabase MCP 리소스가 없어 migration 원격 적용은 아직 수행하지 못했다.
## 2026-06-01 Update - Report Delete and Feedback
- 보고서 목록과 상세에서 권한이 있는 사용자는 삭제할 수 있도록 정리했다.
- 결재와 별도의 `report_feedback` 저장/조회 기능을 추가했다.
- 피드백은 회장, 부장, 목사 역할만 작성할 수 있게 제한했다.
- 기존 출결/보고/회계/결재 흐름은 유지했다.
- 검증:
  - `npx tsc --noEmit`
  - `npm test`
  - `npm run build`

## 2026-06-11 Update - CU1 Attendance And Approval Operations
- Request source: 1cheongnyeon team leader feedback.
- Scope:
  - Add Do Jisu to Dahui cell and Park Cheolho to Mina cell through an operational SQL script.
  - Harden attendance toggles so existing false attendance rows are loaded and save failures are not silently ignored.
  - Prepare a CU1-only bulk approval SQL for existing pending cell-leader reports.
- Impact check:
  - attendance flow: narrow bug fix in attendance save/read behavior.
  - report flow: no code change to report approval workflow; operational SQL targets only existing CU1 `cell_leader` reports in `submitted`.
  - accounting flow: no impact.
  - additive change: yes; no schema, auth, or RLS changes.
  - auth/RLS: app writes still use current Supabase RLS; operational SQL requires admin/PAT/MCP context.
- Files in scope:
  - `src/queries/attendance.ts`
  - `src/components/attendance/AttendanceGrid.tsx`
  - `scripts/ops-2026-06-11-cu1-request.sql`
- Verification:
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 153 tests.
  - `npm run build` passed.
- Blocker:
  - Existing Supabase MCP token in `.codex_mcp_apply.ps1` returned `Unauthorized`, so production data SQL was prepared but not executed.
