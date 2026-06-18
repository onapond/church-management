# CURRENT_TASK.md

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
