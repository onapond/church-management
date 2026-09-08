# CURRENT_TASK.md

이 파일은 "이번 작업"의 단일 기준 문서다. 작업을 시작하기 전에 최신 상태로 갱신하고, 구현 중 범위가 바뀌면 즉시 업데이트한다.

---

## 1. Active Task — 보고서 인쇄 sandbox 실제 브라우저 smoke test (2026-09-08)

- 상태: **완료 (2026-09-08)**
- 목표: 프로덕션의 인증된 보고서 상세 화면에서 인쇄 기능을 실행해 `iframe.srcdoc` + `sandbox="allow-same-origin allow-modals"` 구현이 실제 Chrome 인쇄 대화상자를 정상적으로 여는지 확인한다.

### 영향 범위와 구현 계획

- attendance: 출결 데이터와 저장·집계 흐름을 변경하지 않는다.
- report: 기존 보고서를 읽어 인쇄 UI만 확인하며, 보고서 본문·결재 상태·저장 API는 변경하지 않는다.
- accounting: 영향 없음.
- additive change: 우선 브라우저 smoke와 기록만 수행한다. 결함이 재현될 때만 인쇄 유틸/템플릿을 좁게 보정하고 회귀 테스트를 추가한다.
- auth/RLS: 기존 로그인 세션과 조회 권한만 사용하며 계정·승인·역할·RLS를 변경하지 않는다.
- 프로덕션 alias `https://church-opal.vercel.app`의 보고서 상세에서 인쇄 옵션 모달과 인쇄 실행을 확인한다.
- 브라우저 콘솔 오류, 임시 iframe의 sandbox 속성, 인쇄 호출 여부를 함께 점검하고 결과를 문서화한다.

### 예상 파일

- `CURRENT_TASK.md`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`
- `docs/handoffs/2026-09-08-report-print-browser-smoke.md`
- 결함 발견 시에만 `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/components/reports/ReportDetail.tsx`

### 완료 근거

- 기존 Chrome `요한` 프로필의 인증 세션으로 프로덕션 주차보고서 `340ee89c-29b9-4535-a09f-c3c0ceae0994` 상세를 열었다.
- `인쇄` → `인쇄 실행` 후 Chrome 시스템 인쇄 모달이 열려 페이지가 비활성화되고, `window.print()` 반환 전 sandbox iframe이 유지되는 실제 브라우저 동작을 확인했다.
- 인쇄 옵션 모달은 닫혔고 브라우저 콘솔 warning/error는 0건이었다. 출력·PDF 저장은 수행하지 않고 테스트용 탭을 닫았다.
- 기존 단위 회귀 `src/lib/utils.test.ts` 35건과 `npm run docs:check`가 통과했다.
- 앱 코드·DB·RLS·auth·attendance·report 저장/결재·accounting 변경은 없으며 재배포가 필요하지 않다.

---

## 2. Previous Task — CU1 전체 명단·셀 최신화 (2026-09-08)

- 상태: **완료 (2026-09-08)**
- 원본: `1청년부 전체 명단 (26.09.08).xlsx`
- 목표: 첨부된 최신 50명 명단을 프로덕션 CU1과 대조해 구성원, 셀 배정, 확인 가능한 교인 정보를 이력 보존 방식으로 최신화한다.

### 대조 결과와 확정 범위

- Excel과 프로덕션의 활성 CU1은 모두 50명이지만, Excel에는 `신희준`이 있고 프로덕션에는 중복 원본인 `한수연`이 추가로 있다.
- 실제 한수연은 두 명이다. `한수연a`는 현진셀과 CU 워십팀 소속이고, `한수연b`는 태희셀 소속인 별도 인물이다.
- 프로덕션의 기존 `한수연`은 출결 12건과 CU 워십팀/CU1 연결을 보유하므로 `한수연a`의 이력 기준 행이다. 이 행을 `한수연a`로 정리하고 주소를 보완하며, 같은 전화번호·생년월일로 잘못 추가된 이력 없는 후발 `한수연a` 행만 병합 제거한다. `한수연b`는 변경하지 않는다.
- `신희준`은 연락처가 비어 있고 생년월일이 `2007-09-`로 불완전하므로 이를 추측하지 않는다. 이름·주소·CU1/선웅셀 연결만 추가한다.
- `성모셀`을 새로 만들고 정성모를 배정한다.
- 셀 이동은 김민호→다희셀, 박수빈→민아셀, 정시후·정은재→태신자셀로 제한한다.
- 박승조 생년월일을 Excel의 완전한 날짜 `1998-01-27`로 정정한다.
- 김선웅·이현진은 2026-09-07 확정 배정을 존중해 각각 선웅셀·현진셀에 유지한다. 김효정은 기존 결정대로 미배정을 유지한다.
- Excel의 `새산자셀`은 동일 문서의 나머지 표기와 기존 셀을 근거로 `새신자셀` 오타로 정규화한다.

### 영향 범위와 구현 계획

- attendance: 기존 `attendance_records`를 수정하지 않는다. 이후 출석부의 현재 셀 필터만 최신 배정을 반영한다.
- report: 기존 `weekly_reports`, 참석자 문자열, 연결 출결, 결재 상태를 수정하지 않는다. 이후 셀장보고서의 현재 셀원 목록만 바뀐다.
- accounting: 영향 없음.
- additive change: `성모셀` 1행과 `신희준` 교인/CU1 연결을 추가하고, 기존 교인·셀 연결의 좁은 범위만 수정한다.
- auth/RLS: 사용자 계정, 승인 상태, 역할, RLS 정책을 변경하지 않는다.
- 보호 조건이 있는 단일 트랜잭션 운영 SQL을 작성하고, 먼저 `ROLLBACK` 드라이런을 수행한다.
- 적용 후 Excel 50명과 정확히 일치하는지, 셀별 명단·중복·다른 부서 셀 연결·출결/보고서 건수 보존을 다시 검증한다.

### 예상 파일

- `scripts/ops-2026-09-08-sync-cu1-roster-from-xlsx.sql`
- `CURRENT_TASK.md`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`
- `.claude/bugs.md`
- `docs/handoffs/2026-09-08-cu1-roster-xlsx-sync.md`

### 완료 근거

- 원본 SHA-256: `c2d6df46df7bb6fce289bd0b3eb3d6437f0a87310a71d1860d1f242e1e356246`.
- 보호형 SQL의 프로덕션 `ROLLBACK` 드라이런과 실제 트랜잭션 적용이 모두 통과했다.
- Excel 50명과 프로덕션 활성 CU1 50명이 정확히 일치하며 셀 배정 차이와 매핑 불가 셀은 0건이다.
- `한수연a`는 현진셀·CU 워십팀 및 기존 출결 12건을 유지한다. `한수연b`는 태희셀 및 기존 출결 2건을 유지한다. 이름이 `한수연`인 행은 0건이다.
- 활성 CU1 셀은 9개이고, 미배정은 기존 운영 결정대로 김효정 1명이다. CU1 중복 부서 연결과 다른 부서 셀 연결은 모두 0건이다.
- 적용 후 스냅샷은 출결 806건, 보고서 303건, 보고서 연결 출결 40건, 고아 연결 0건이다. 트랜잭션 내부 보호 검증으로 해당 이력 테이블의 적용 전후 건수가 변하지 않았음을 확인했다.
- 앱 코드·스키마·RLS·auth·결재·회계는 변경하지 않았고 Vercel 재배포는 필요하지 않다.

---

## 3. Previous Task — CU1 미배정자 셀 배정 및 태신자셀 신설 (2026-09-07)

- 상태: **완료 (2026-09-07)**
- 목표: CU1 활성 셀 미배정자 13명을 운영 결정에 따라 배정하되, 김효정 팀장은 미배정으로 유지하고 `태신자셀`을 신설한다.

### 프로덕션 근거와 확정 배정

- 활성 CU1 셀 미배정자는 정확히 13명이다: 구현서, 김민호, 김선웅, 김영효, 김지솔, 김효정, 박수빈, 송준선, 신원주, 우현승, 이현진, 장성재, 현수빈.
- 기존 활성 셀에는 `선웅셀`과 `현진셀`이 있다. `김선웅셀`·`이현진셀`을 중복 생성하지 않는다.
- 김선웅은 기존 `선웅셀`, 이현진은 기존 `현진셀`에 배정한다.
- 김효정은 활성 `team_leader`이고 CU1 `is_team_leader=true`임을 확인했다. 셀 미배정 상태를 유지한다.
- 나머지 10명은 새 활성 `태신자셀`을 만든 뒤 배정한다. 기존 `새신자셀`은 별도 셀이므로 변경하지 않는다.

### 영향 범위와 계획

- attendance: 기존 `attendance_records`를 수정하지 않는다. 이후 출석부의 현재 셀 필터에만 새 배정이 반영된다.
- report: 기존 `weekly_reports`, 결재 상태, 보고서 연결 출결을 수정하지 않는다. 이후 셀장보고서 셀원 목록에만 새 배정이 반영된다.
- accounting: 영향 없음.
- additive change: `cells`에 `태신자셀` 1행을 추가하고, CU1 `member_departments.cell_id` 12행만 갱신한다.
- auth/RLS: 김효정의 이미 확인된 팀장 권한과 기존 RLS 정책을 변경하지 않는다.
- 정확한 미배정 집합, 기존 활성 셀, 대상자 수와 현재 `cell_id is null`을 검증하는 트랜잭션 운영 SQL을 먼저 작성한다.

### 예상 파일

- `scripts/ops-2026-09-07-assign-cu1-unassigned-members.sql`
- `CURRENT_TASK.md`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`
- `.claude/bugs.md`

### 완료 근거

- `scripts/ops-2026-09-07-assign-cu1-unassigned-members.sql`의 `ROLLBACK` 드라이런 통과 후 같은 SQL을 프로덕션 트랜잭션으로 적용했다.
- 기존 `선웅셀`에 김선웅, 기존 `현진셀`에 이현진을 배정했다.
- 활성 `태신자셀` 1행을 display order 8로 신설하고 구현서, 김민호, 김영효, 김지솔, 박수빈, 송준선, 신원주, 우현승, 장성재, 현수빈 10명을 배정했다.
- 김효정은 유일한 활성 CU1 셀 미배정자로 남았고, 활성 `team_leader` 및 CU1 `is_team_leader=true` 상태가 유지됐다.
- CU1 교인 중복 소속 0건, 다른 부서 셀 연결 0건, `태신자셀` 중복 0건이다.
- 기존 `새신자셀`과 다른 모든 셀 명단은 유지됐다. `attendance_records` 782건, `weekly_reports` 299건, 보고서 연결 출결 24건과 무결성 오류 0건을 사후 확인했다.
- `npm run verify`의 docs/lint/193 tests/typecheck가 통과했고, 최초 빌드의 Google Fonts 네트워크 차단은 네트워크 허용 재실행에서 production build 통과로 확인했다.
- 앱 코드·스키마·RLS·auth·결재·회계 변경 없음. 데이터-only 작업이므로 Vercel 재배포는 필요하지 않다.
- 세션 종료 핸드오프: `docs/handoffs/2026-09-08-attendance-and-cu1-roster-completion.md`.

---

## 4. Previous Task — CU1 다희셀·태희셀 명단 복구 (2026-09-07)

- 상태: **완료 (2026-09-07)**
- 목표: 태희셀에 합쳐져 있는 다희셀 교인을 다희셀로 되돌려 출석부의 두 셀 명단을 복구한다.

### 프로덕션 근거

- 활성 `다희셀` 행은 존재하지만 현재 활성 교인이 0명이다.
- 활성 `태희셀`에는 11명이 배정되어 있으며 이다희·이태희가 함께 들어가 있다.
- 2026-02-22~2026-07-26 셀장보고서에서 다희셀 참석자로 반복 확인되는 교인은 `김동혁`, `김은수`, `도지수`, `이다희`, `장미화`다.
- 같은 기간 태희셀 참석자로 반복 확인되는 교인은 `김민지`, `박승조`, `이태희`이며, 이후 `강태웅`, `한수연b` 배정은 별도 운영 기록과 일치한다.
- `조민정`은 어느 셀인지 판별할 보고서/운영 기록 근거가 없어 이동 대상에서 제외한다.

### 영향 범위와 계획

- `member_departments.cell_id`만 위 5명의 CU1 행에서 다희셀로 변경한다.
- attendance: 기존 `attendance_records`는 수정하지 않는다. 출석부의 현재 셀 필터 명단만 바로잡힌다.
- report: 기존 `weekly_reports.cell_id`, 참석자 문자열, 결재 상태는 수정하지 않는다.
- accounting/auth/RLS: 영향 없음.
- 검증형 운영 SQL을 저장소에 먼저 작성하고, 정확히 한 개의 활성 CU1/셀/교인 행을 확인한 뒤 트랜잭션으로 적용한다.
- 적용 후 다희셀 5명과 태희셀 잔여 명단, 두 셀의 중복·미배정 여부를 다시 확인한다.

### 완료 근거

- 프로덕션 트랜잭션 적용 완료: 태희셀의 `김동혁`, `김은수`, `도지수`, `이다희`, `장미화` 5명만 다희셀로 이동.
- 최종 다희셀: 김동혁, 김은수, 도지수, 이다희, 장미화.
- 최종 태희셀: 강태웅, 김민지, 박승조, 이태희, 조민정, 한수연b.
- 대상 5명의 태희셀 잔존 0명. `attendance_records` 758건과 `weekly_reports` 297건은 수정 없이 보존.
- 앱 코드·스키마·RLS·auth·결재·회계 변경 없음. Vercel 재배포 불필요.

### 예상 파일

- `scripts/ops-2026-09-07-fix-dahui-taehee-cell-rosters.sql`
- `CURRENT_TASK.md`
- 필수 컨텍스트 문서와 `.claude/session-notes.md`

---

## 5. Previous Task — 출석 자동연계·통계 복구 (2026-09-05)

- 상태: **완료 (2026-09-06)**
- 목표: 셀장보고서에서 예배/모임 개인 출석을 분리 입력하고, 보고서와 `attendance_records`를 하나의 트랜잭션으로 저장하며, 주차보고서와 통계가 같은 개인 출석 원천을 집계하도록 복구한다.
- 출발 문서: `docs/handoffs/2026-09-05-attendance-report-linkage.md`
- 선행 보안 기준선: `b047f58`, 배포 기록 `5e19690`을 보존하며 되돌리지 않는다.

### 프로덕션 재감사 근거

- `public.save_report_bundle(jsonb)`는 `security invoker`, `search_path=public`이다.
- 함수는 셀장보고서 출석을 `meeting` 한 종류로만 쓰고 `checked_via='cell_report'`를 기록하며, 출석 예외를 `warnings[]`로 축약해 보고서 성공을 허용한다.
- `attendance_records` 유일 제약은 `(member_id, attendance_date, attendance_type)`이다.
- 최근 120일 셀장보고서 93건 중 `cell_id` 87건, 참석자 입력 78건, 비영(非零) 요약 0건, `report_id` 연결 출석 0건이다.
- 최근 120일 출석 332건의 `checked_via`는 전부 `manual`이다.
- CU1 최근 주차보고서 14건은 예배 14건/모임 13건이 개인 출석 집계와 불일치하며, 12건은 숫자가 있지만 대응 개인 레코드가 없다.
- 출석 RLS는 인증 사용자 조회, 관리자/교인 소속부서 사용자/보고서 작성자 수정을 허용한다. auth·승인 게이트는 변경하지 않는다.

## 2. Scope / Impact Check

- attendance 흐름: 기존 수동 출결 UI와 유일키를 유지한다. 동일 교인·날짜·유형 충돌 시 마지막 명시적 입력을 단일 행에 반영하되, 보고서 저장은 `report_id`와 `checked_via='report'`를 함께 기록한다.
- report 흐름: 셀장보고서의 worship/meeting 입력 계약과 요약 계산, 저장 RPC, 취합 화면만 확장한다. 기존 결재 상태·알림·사진·stale draft 복구는 보존한다.
- accounting 흐름: 영향 없음.
- additive change: 신규 `021`~`023` migration으로 원자 저장 래퍼와 기존 집계/삭제 트리거를 보정했다. 기존 테이블 삭제나 전면 리팩터링은 하지 않았다.
- RLS/auth: 기존 RLS를 우회하지 않고 `security invoker`를 유지한다. 회원 승인(`is_active`)과 로그인 흐름은 변경하지 않는다.
- 통계: 빈 부서/셀 결과의 전체 출석 확장, 고정 4/13/52주 분모, 과거 분자와 현재 활성 분모 혼용, 보고서 통계의 `report_type` 미필터를 수정한다.

## 3. Expected Files

- `supabase/migrations/021_link_report_attendance_atomically.sql`
- `supabase/migrations/022_fix_attendance_summary_trigger_search_path.sql`
- `supabase/migrations/023_preserve_manual_attendance_on_report_delete.sql`
- `supabase/tests/attendance_report_linkage_e2e.sql`
- `src/components/reports/CellMemberAttendance.tsx`
- `src/components/reports/hooks/useReportForm.ts`
- `src/components/reports/utils/reportDataBuilder.ts` 및 테스트
- `src/components/reports/utils/reportPersistence.ts`, `reportSavePayload.ts` 및 테스트
- `src/components/reports/ReportForm.tsx`
- `src/components/reports/CellReportAggregatorClient.tsx`
- `src/queries/attendance.ts`, `src/queries/reports.ts`
- `src/lib/stats-queries.ts`, `src/components/stats/ReportStatsContent.tsx` 및 테스트
- `src/types/database.ts`는 RPC 시그니처와 `checked_via: string` 타입이 유지되어 변경 불필요함을 확인
- 필수 문서와 `.claude/session-notes.md`, `.claude/bugs.md`

## 4. Implementation Plan

1. 개인 출석 계약을 `memberId + worshipPresent + meetingPresent`로 바꾸고 저장 payload 테스트를 추가한다.
2. 셀장보고서 UI와 편집 복원을 예배/모임 두 열로 분리한다.
3. `021` migration에서 `save_report_bundle`을 원자적으로 교체한다. 보고서 행 저장 후 두 출석 유형을 upsert/delete하고 `report_id`, `checked_via='report'`를 강제하며, 요약 수치를 같은 입력에서 계산한다. 출석 오류를 더 이상 경고로 삼키지 않는다.
4. 주차 취합을 선택한 셀장보고서의 연결 개인 출석에서 계산하고, 그 원천으로 셀별/전체 합계를 만든다.
5. 통계 필터·기간 분모·역사적 재적 기준과 주차보고서 타입 필터를 수정한다.
6. 생성/수정/삭제·수동 충돌·취합·통계 종단 회귀 테스트를 추가한다.
7. migration을 프로덕션에 적용하고 함수/제약/RLS/테스트 보고서 흐름을 재검증한다.
8. `npm run verify`, 필수 문서/session notes 갱신, 커밋·push·Vercel production 배포와 smoke test를 완료한다.

## 5. Guardrails

- migration 작성 전/후 프로덕션 함수·제약·RLS를 비교한다.
- attendance/report/accounting 기존 코어를 깨지 않고 invasive refactor를 피한다.
- 수동 출결 행을 무조건 삭제하지 않는다. 동일 유일키의 행을 보고서 입력으로 갱신할 때 출처와 연결을 명시하고, 이후 수동 입력은 기존 수동 화면의 명시적 수정으로 다시 덮어쓸 수 있게 유지한다.
- 과거 보고서의 참석자 문자열을 임의로 worship/meeting 두 유형에 복제하지 않는다. 새 계약 이후 데이터부터 정확히 연결한다.
- DB 적용 없이 완료 처리하지 않는다.

## 6. Verification Plan

- focused unit/integration tests for report payload, RPC contract, aggregator, and stats
- `npm run verify`
- production catalog checks for `save_report_bundle`, constraints, triggers, and RLS
- production transactional smoke using a controlled draft/report record, followed by cleanup if the record is synthetic
- deployed `/login` and authenticated report path smoke where feasible

## 7. Completed Evidence

- 프로덕션 migrations `021`, `022`, `023` 적용 완료.
- authenticated rollback E2E 통과: 예배/모임 2행 생성, 요약 일치, 잘못된 셀원 입력의 보고서 포함 전체 롤백, 수동 수정 행 보존, 보고서 출처 행 삭제.
- 사후 프로덕션 검증: 테스트 보고서 0, 미래 테스트 출결 0, 기존 `manual` 758행 보존, RPC `SECURITY INVOKER`, anon execute 차단, 기존 attendance RLS 4개 유지.
- `npm run verify` 최종 통과: docs:check, lint 0 warnings, 14 files / 193 tests, TypeScript, Next.js production build.
- 기존 attendance/report approval/accounting/auth 흐름에 대한 invasive refactor 없음. P0 기준선 `b047f58`/`5e19690` 보존.
- 구현 커밋 `46391bb`를 `origin/main`에 push했다.
- Vercel production `dpl_CeQvKFfV4ckeoXdTqMrXz6NxkHpX` READY, `https://church-opal.vercel.app` alias 완료.
- 배포 후 `/login` HTTP 200, 미인증 `POST /api/reports/save` HTTP 401 스모크 통과.

---

# 이전 완료 작업 기록 (아카이브)

## 2026-09-05 P0 Security Baseline

- 아래 기존 1~9절은 완료된 P0 작업 기록이다.

## 1. Task Summary
- 상태: **완료 (2026-09-05)**. 출석 자동연계/통계 복구는 위 활성 작업으로 전환했다.
- 요청 제목: 아키텍처·코드 품질 감사 P0 항목 차단 (Phase 0)
- 요청 목적: 2026-08-21 감사에서 확인된 P0 8건 중 **외부인 접근 / 개인정보 노출 / 복구 불가 데이터 파괴**에 해당하는 항목을 먼저 막는다.
- 요청 원문 요약: "코드 수정은 하지말고 아키텍처 및 코드 품질 검증하고. 수정 필요한 부분 정리해줘" → 감사 완료. "다음 세션에서 진행하자. 문서 남기고" → 이번 세션은 문서화만, 실제 수정은 다음 세션.
- 감사 결과 문서: `docs/03-analysis/2026-08-21-architecture-audit.analysis.md`
- 시각화 보고서: https://claude.ai/code/artifact/22532bab-104f-40a3-8416-e8ee56b959d3

### 감사 세션 상태 (2026-08-21)
- **소스 코드는 수정하지 않았다.** 이번 세션 산출물은 문서 4건뿐이다.
- 검증 통과 지적사항 169건 → P0 8 / P1 17 / P2 8 / P3 7로 통합 정리 완료.
- 실행 검증: `npx tsc --noEmit` 통과 / `npm test` **168개 통과** / `npm run lint` 통과 /
  `npm run build`는 `.env.local` 부재로 `/pending` prerender에서 실패(코드 회귀 아님, 상세는 분석 문서 §0).

## 2. Scope
- 이번 작업에 포함 (P0 8건):
  - P0-1 자가 가입 승인 게이트 복구 (`handle_new_user` 트리거 `is_active = FALSE`)
  - P0-2 mojibake 3파일 복구 (`CellManager.tsx`, `members/bulk-photos/page.tsx`, `members/[id]/edit/page.tsx`)
  - P0-3 `visitations` SELECT RLS 축소 (기도제목·심방내용 보호)
  - P0-4 보고서 인쇄 경로 저장형 XSS 차단 (`ReportDetail.tsx:742,745,749`)
  - P0-5 서비스워커의 Supabase REST 응답 캐싱 전면 제외 (`public/sw.js`)
  - P0-6 교인 삭제 순서 반전 + 에러 검사 (`queries/members.ts`)
  - P0-7 `meeting-pdfs` Storage 정책 `else true` 교체 + UUID 정규식 수정
  - P0-8 `report-photos` 등 3개 버킷 private 전환 + 서명 URL 전환
- 이번 작업에서 제외:
  - P1~P3 전체 (로드맵 Phase 1 이후)
  - 결재 상태 모델 변경, 대형 컴포넌트 분해, 타입 생성기 도입
  - 스키마 baseline 추출(P1-5)은 Phase 3에서 별도 진행

## 3. Impact Check
- attendance 흐름 영향: 없음. P0 항목 중 출결 읽기/쓰기 경로를 건드리는 것은 없다.
- report 흐름 영향: 있음. 단 **표시/인쇄와 사진 스토리지 접근 경로만** 바뀐다.
  P0-4는 인쇄 HTML 생성 시 escape만 추가하고, P0-8은 사진 URL을 공개 URL에서 서명 URL로 바꾼다.
  보고서 저장 RPC(`save_report_bundle`)와 결재 상태 전이는 이번 범위에서 변경하지 않는다.
- accounting 흐름 영향: 없음.
- 권한/RLS/auth 영향: 있음. 이번 작업의 본체다.
  - auth: `handle_new_user` 트리거가 신규 가입자를 비활성으로 생성하도록 변경(P0-1).
  - RLS: `visitations` SELECT 축소(P0-3), `meeting-pdfs` Storage 정책 `else true` 제거(P0-7),
    `members` DELETE 권한 규칙 확정(P0-6), 3개 버킷 `public = false` 전환(P0-8).
  - 기존 보고서 결재 RLS(007/018)와 안건 RLS(016/017)는 이번 범위에서 변경하지 않는다.

## 4. Files In Scope
- 예상 수정 파일:
  - `supabase/migrations/020_close_p0_security_gaps.sql` (신규 — P0-1/3/6/7/8 통합)
  - `src/components/settings/CellManager.tsx`
  - `src/app/(dashboard)/members/bulk-photos/page.tsx`
  - `src/app/(dashboard)/members/[id]/edit/page.tsx`
  - `src/components/reports/ReportDetail.tsx`
  - `src/lib/utils.ts`
  - `public/sw.js`
  - `src/queries/members.ts`
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/lib/permissions.ts` + `src/lib/permissions.test.ts` (P0-6 `canDeleteMembers` 규칙 확정 시)
  - `next.config.ts` (P0-8 `remotePatterns`)
  - `.gitattributes` (신규 — P0-2 재발 방지)
  - `scripts/check-required-docs.mjs` (P0-2 mojibake 검사 추가)
  - 필수 문서 및 session notes

## 5. Implementation Plan
0. **선행: 프로덕션 현재 상태 확인** — 분석 문서 §6의 SQL을 Supabase SQL Editor에서 실행한다.
   특히 P0-1의 "승인 없이 들어온 계정 탐지" 쿼리를 **수정 전에** 돌려 침입 계정 유무를 확인한다.
   저장소의 RLS 파일은 프로덕션 상태의 근거가 아니다(RC2/RC3).
1. **P0-2 mojibake 복구** — 의존성 없고 위험도 0. 여기서 시작해 워밍업한다.
2. **P0-4 인쇄 XSS** — `escapeHtml()` 3곳 적용 + `iframe.srcdoc` + `sandbox` 전환.
3. **P0-5 서비스워커** — supabase 호스트 전면 캐시 제외.
4. **P0-1 승인 게이트** — 트리거/기본값 변경. 배포 즉시 신규 가입 차단 효과.
5. **P0-3 · P0-7 · P0-8 RLS/Storage** — `020_close_p0_security_gaps.sql` 하나로 묶어 작성.
   P0-8은 앱 코드(서명 URL) 변경이 함께 가야 하므로 마이그레이션과 코드를 같은 커밋으로.
6. **P0-6 교인 삭제** — 규칙 확정됨(관리자 전용, 아래 §6 참조) → RLS + `useDeleteMember` 순서 반전.
7. 필수 문서 업데이트 → `npm run verify`로 검증.

## 6. Risks And Guardrails
- **DB 변경은 migration 파일로만 작성한다.** 직접 SQL 실행 후 마이그레이션 미기록이 RC3의 원인이었다.
- P0-8(버킷 private 전환)은 **기존 `photo_url` 데이터 마이그레이션이 함께 필요**하다.
  공개 URL이 저장된 기존 행을 상대 경로로 정규화하지 않으면 기존 사진이 전부 깨진다. 순서 주의.
- P0-1 적용 후 **정상 사용자가 로그인 불가가 되지 않는지** 확인한다.
  기존 `is_active = true` 계정은 건드리지 않고 신규 가입에만 적용되어야 한다.
- P0-7 수정 시 **기존에 업로드된 회의록 PDF 접근이 끊기지 않는지** 확인한다.
- 결재 상태 모델, `save_report_bundle` RPC, 안건 RLS는 이번 범위 밖이다. 건드리지 않는다.
- `npm run build`는 `.env.local`이 있어야 통과한다. 검증 전에 환경변수를 먼저 준비한다.

### 확정된 결정 사항
- **2026-08-21 — 교인 삭제 권한 (P0-6)**: **관리자 전용**. `team_leader`는 교인을 삭제할 수 없다.
  - `src/lib/permissions.ts`의 `canDeleteMembers`는 `super_admin` / `president` / `accountant`만 통과시킨다.
  - `members` DELETE RLS 정책도 같은 역할로만 허용한다. 현재 `members`에는 DELETE 정책 자체가 없다.
  - `member_departments_modify_teamlead`가 `FOR ALL`이라 팀장이 부서 연결만 지울 수 있는 것이
    P0-6의 부분 파괴 원인이므로, 이 정책의 DELETE 범위도 함께 좁혀야 한다.
  - 클라이언트는 `members` DELETE를 `.select()`와 함께 **먼저** 실행해 실제 삭제 행 수를 확인한 뒤에만
    사진/부서 연결 정리를 진행한다.

## 7. Verification Plan
- `npx tsc --noEmit`
- `npm test`
- `npm run lint`
- `npm run build` (`.env.local` 필요)
- 또는 위 전체를 `npm run verify`로 한 번에
- 원격: 마이그레이션 적용 후 분석 문서 §6의 `pg_policies` / `storage.buckets` 쿼리로 재확인

## 8. Execution Notes

### 2026-09-04 재개 — 프로덕션 선행 감사 완료
- 사용자 요청: 중단된 작업을 먼저 마무리하고, 출석·보고서 연계 작업은 다음 세션으로 핸드오프한다.
- 프로덕션 Supabase를 읽기 전용으로 확인했다.
  - P0-1: `handle_new_user()`는 이미 신규 사용자를 `is_active = false`로 생성한다. 다만 이를 재현하는 `020` migration은 저장소에 없어 migration으로 동기화가 필요하다.
  - P0-3: `visitations_select_authenticated USING (true)`가 실제 프로덕션에 남아 있다.
  - P0-6: `members_delete_teamlead`와 `member_departments_modify_teamlead`가 실제 프로덕션에 남아 있어 문서에서 확정한 관리자 전용 삭제 규칙과 불일치한다.
  - P0-7: `meeting-pdfs` INSERT/UPDATE/DELETE 정책에 `ELSE true`와 잘못된 UUID 정규식이 실제 프로덕션에 남아 있다.
  - P0-8: `member-photos`, `department-photos`, `report-photos`는 실제 프로덕션에서 모두 public이다.
- 이번 재개 세션 구현 범위:
  - attendance/accounting 흐름은 변경하지 않는다.
  - 보고서 저장 RPC와 결재 상태 전이는 변경하지 않는다.
  - `020_close_p0_security_gaps.sql`로 auth/RLS/Storage 상태를 재현 가능하게 만들고, private 버킷에 맞게 앱 사진 경로를 상대 경로 저장 + 서명 URL 조회 방식으로 전환한다.
  - 교인 삭제는 관리자 전용으로 제한하고 부모 행 삭제 성공을 확인한 뒤 Storage 정리를 수행한다.
- 예상 수정 파일:
  - `supabase/migrations/020_close_p0_security_gaps.sql`
  - `src/lib/storage.ts` 및 테스트
  - `src/lib/permissions.ts` 및 테스트
  - `src/queries/members.ts`, `src/queries/attendance.ts`, `src/queries/photos.ts`, `src/queries/reports.ts`
  - `src/components/members/MemberForm.tsx`, `src/components/members/BulkPhotoUpload.tsx`
  - `src/app/(dashboard)/members/[id]/page.tsx`
  - `src/components/photos/PhotosClient.tsx`
  - `src/components/reports/hooks/useReportSubmit.ts` 및 테스트
  - `next.config.ts`, 필수 문서, session notes, handoff 문서

### 2026-08-21 (2차 세션) — P0-2 · P0-4 · P0-5 완료
프로덕션 접근(Supabase PAT)과 `.env.local`이 없는 상태에서 **선행 조건 없이 진행 가능한 코드 전용 3건**을 먼저 처리했다.

**P0-2 mojibake 복구**
- 깨짐은 커밋 `9a55fa0`("Consolidate accumulated feature cleanup")에서 발생했다.
  그 이전 커밋(`8c0d68b`, `41ddc20`, `78e1c67`)에는 한글이 정상이라 원문을 그대로 복원할 수 있었다.
- 다만 `9a55fa0`은 인코딩 외에 실제 리팩터링(변수명 변경, 권한 체크 블록 이동)도 포함해서
  **파일 통째 되돌리기는 하지 않고 문자열만 라인 단위로 교체**했다.
- `CellManager.tsx` 31곳, `members/bulk-photos/page.tsx` 3곳, `members/[id]/edit/page.tsx` 2곳.
- 재발 방지: `scripts/check-required-docs.mjs`에 mojibake 가드 추가.
  `src`/`public`의 `.ts/.tsx/.js/.mjs`를 훑어 **CJK 한자**(`\u4e00-\u9fff`)나
  **`?`+한글 음절** 패턴이 있으면 `docs:check`를 실패시킨다. 둘 다 이 앱의 정상 한글 텍스트에는 없다.
  일부러 깨진 파일을 넣어 실패하는 것까지 역검증했다.
- `.gitattributes` 신규 추가(LF 정규화 + 바이너리 지정).
  단, 감사 문서가 제안한 `working-tree-encoding=UTF-8`은 **넣지 않았다.**
  저장소가 이미 UTF-8이라 no-op이고, 깨진 파일도 "유효한 UTF-8"이라 이 설정으로는 잡히지 않는다.
  실제 방어선은 위의 `docs:check` 가드다.

**P0-4 인쇄 경로 저장형 XSS**
- `generateWeeklyPrintHTML` / `generateMeetingPrintHTML` / `generateProjectPrintHTML`의
  모든 보간부에 `escapeHtml()` 적용.
- **감사 문서와 다르게 처리한 부분**: `discussion_notes` / `other_notes`는 RichTextEditor가 만든
  **HTML(리치텍스트)**이고 상세 화면에서도 `DOMPurify.sanitize()` + `dangerouslySetInnerHTML`로 렌더된다.
  여기에 `escapeHtml()`을 쓰면 인쇄물에 태그가 그대로 찍히는 회귀가 생기므로
  상세 화면과 동일하게 `DOMPurify.sanitize()`를 적용했다.
- `printHtmlInIframe`을 `frameDoc.write()` → **`iframe.srcdoc` + `sandbox`**로 전환.
  `sandbox="allow-same-origin allow-modals"` — `allow-scripts`를 주지 않으므로
  주입된 `<img src=x onerror=...>`나 인라인 `<script>`가 실행되지 않는다.
  `allow-same-origin`은 부모가 `contentWindow.print()`를 호출하기 위해, `allow-modals`는 인쇄 대화상자를 위해 필요하다.
- 스크립트가 더 이상 실행되지 않으므로 인쇄 HTML 안의
  `<script>window.onload=function(){window.print();}</script>`는 제거했다.
  인쇄 트리거는 이미 `printHtmlInIframe`의 `onload` 핸들러가 담당한다.
- `src/lib/utils.test.ts`에 `escapeHtml` 4건 + `printHtmlInIframe` 샌드박스 1건 테스트 추가.

**P0-5 서비스워커 캐시**
- `supabase` 호스트를 전면 캐시 제외로 바꿨다.
- **범위를 한 칸 넓혔다**: `/api/`도 함께 제외했다. `staleWhileRevalidate` 분기만 제거하면
  `/api/`가 아래의 `networkFirst(request, CACHE_NAME)`로 흘러가 **같은 방식으로 계속 캐시된다.**
  `/api/notifications`에는 실제로 GET 핸들러가 있어 가설이 아니라 실재하는 누출이었다.
- `staleWhileRevalidate` 함수와 `API_CACHE` 상수를 제거해 같은 실수가 재도입될 여지를 없앴다.
- `CACHE_VERSION`을 `v1.2.0` → `v1.3.0`으로 올렸다.
  `activate` 핸들러가 `church-*` 중 현재 캐시가 아닌 것을 지우므로,
  **이미 오염된 기존 사용자 브라우저의 `church-api-v1.2.0`이 배포와 함께 삭제된다.**
  로그아웃 시 캐시 삭제 코드를 새로 넣지 않아도 되는 이유가 이것이다.

**검증 (실제 실행 결과)**
- `npm run docs:check` 통과
- `npm run lint` 통과 (`--max-warnings=0`)
- `npm test` 통과 — **173개** (기존 168 + 신규 5)
- `npx tsc --noEmit` 통과
- `npm run build` **통과** — 단, `.env.local`이 없어 placeholder 환경변수를 인라인으로 넣어 실행했다:
  `NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build`
  이로써 감사 문서 §0의 "빌드 실패는 코드 회귀가 아니라 환경변수 부재 때문"이 확정 확인됐다.

### 남은 P0 5건과 각각의 차단 사유
| ID | 상태 | 차단 사유 |
| --- | --- | --- |
| P0-1 승인 게이트 | 미착수 | 선행 조치인 **프로덕션 계정 전수 조사**에 Supabase 접근 필요 (캐시된 PAT 401) |
| P0-3 visitations RLS | 미착수 | 마이그레이션 작성은 가능하나 현재 프로덕션 정책 상태 확인이 선행되어야 함 |
| P0-6 교인 삭제 | 미착수 (규칙 확정) | 2026-08-21 결정: **관리자 전용, 팀장 불가**. 클라이언트 수정은 바로 가능하나 `members` DELETE RLS 정책 추가는 프로덕션 적용에 Supabase 접근 필요 |
| P0-7 meeting-pdfs `else true` | 미착수 | 프로덕션 Storage 정책 실물 확인 후 020 마이그레이션에 통합 |
| P0-8 버킷 private 전환 | 미착수 | 기존 `photo_url` 데이터 정규화가 동반되어야 하며, 순서를 틀리면 기존 사진이 전부 깨짐 |

### 다음 세션이 먼저 할 일
1. Supabase PAT 확보 → 감사 문서 §6의 SQL 4종 실행 (특히 미승인 활성 계정 탐지)
2. P0-1 → P0-3/7/8(020 마이그레이션 단일 파일) → P0-6 순서로 진행
3. P0-6은 규칙이 확정됐으므로(관리자 전용) 마이그레이션 작성과 클라이언트 수정을 바로 시작할 수 있다

## 9. Completion Record
- 2026-09-05: 남은 P0-1/3/6/7/8 완료. `020_close_p0_security_gaps.sql`을 프로덕션에 적용하고 원격 재검증했다. 적용 과정에서 확인된 익명 users SELECT/INSERT 정책과 비활성 관리자 RLS 헬퍼 우회도 함께 제거했다.
- 프로덕션 결과: `is_active` 기본값 false, `is_approved` 0개, 심방/교인/회의 PDF/사진 정책 교체, 사진 4개 버킷 private, 기존 HTTP photo URL 0개.
- 실제 저장 사진의 익명 public URL 요청도 3개 사진 버킷 모두 HTTP 400으로 거부됨을 확인했다.
- 추가 발견/수정: `report-photos` 정책의 unqualified `name`이 `users.name`으로 해석되던 결함과 익명 Storage 중복 정책을 제거했다.
- 앱 결과: 사진 객체 경로 저장 + signed URL 조회, 관리자 전용 교인 삭제, 팀장의 기존 부서연결 삭제 차단, `/pending` prerender 복구.
- 원격의 동시 작업(보고서 stale draft 복구) 위로 rebase 후 검증: `npm run lint`, `npm test`(185), `npm run typecheck`, `npm run build` 모두 통과.
- 출석/회계/보고서 저장 RPC/결재 전이는 변경하지 않았다.
- 후속 작업: `docs/handoffs/2026-09-05-attendance-report-linkage.md`.
- Git/배포: 원격 `690ad69` 위로 rebase 후 P0 커밋 `b047f58`을 `origin/main`에 push. Vercel production `dpl_9CY3t4LaD9rHBnLcxJ7sVGofWQQ5` READY 및 `church-opal.vercel.app/login` HTTP 200 확인.

- 2026-08-21 (2차 세션): P0 8건 중 **3건 완료** (P0-2, P0-4, P0-5). 5건은 위 표의 사유로 미착수.
- 변경 파일:
  - `src/components/settings/CellManager.tsx`
  - `src/app/(dashboard)/members/bulk-photos/page.tsx`
  - `src/app/(dashboard)/members/[id]/edit/page.tsx`
  - `src/components/reports/ReportDetail.tsx`
  - `src/lib/utils.ts`
  - `src/lib/utils.test.ts`
  - `public/sw.js`
  - `scripts/check-required-docs.mjs`
  - `.gitattributes` (신규)
- 이번 세션에서 **건드리지 않은 것**: DB 스키마/마이그레이션, RLS 정책, 결재 상태 전이,
  `save_report_bundle` RPC, 출결·회계 흐름, 인증 흐름.
- 당시 남아 있던 인쇄 샌드박스 실제 브라우저 확인은 2026-09-08 프로덕션 Chrome
  smoke로 완료했다. 결과는 `docs/handoffs/2026-09-08-report-print-browser-smoke.md`에 있다.

---
---

# 이전 작업 기록 (아카이브)

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
  - Report form local draft backups are versioned and cleared after successful final submission so stale submitted report ids are not reused.
  - Admin/global management still uses `canManageReport`.
- Verification:
  - `npm test -- src/components/reports/utils/reportDraftBackup.test.ts src/app/api/reports/save/route.test.ts` passed, 14 tests.
  - `npx tsc --noEmit` passed.
  - `npm test` passed, 168 tests.
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
# 2026-08-22 Follow-up - Recover Stale Report Draft Targets
- Request: fix the `Forbidden` error Park Youngmin saw while submitting a youth report.
- Impact scope:
  - attendance/accounting flows: no impact.
  - report flow: API/client handling for stale autosave target ids only; report persistence and approval transitions remain unchanged.
  - additive change: yes, a typed stale-target response and one safe retry without the obsolete target id.
  - auth/RLS scope: unchanged; edit-mode permission failures remain forbidden and all retried writes still pass existing RLS/RPC checks.
- Expected files in scope:
  - `src/app/api/reports/save/route.ts`
  - `src/app/api/reports/save/route.test.ts`
  - `src/components/reports/hooks/useReportSubmit.ts`
  - `src/components/reports/hooks/useReportSubmit.test.ts`
  - `src/components/reports/utils/reportSavePayload.ts`
  - required docs and session notes.
- Root cause:
  - the browser restored a local draft backup containing a `targetReportId` that no longer resolves to a manageable draft.
  - the save route returned a generic 403, so the client could not distinguish the obsolete autosave pointer from a real edit permission denial.
- Plan:
  - return a typed stale-target conflict only for new-form `targetReportId` failures.
  - retry once with `targetReportId = null`, preserving the current form content and keeping edit-mode authorization strict.
  - add focused route/client regression tests, then run typecheck, tests, and build.
- Completion:
  - implemented the typed HTTP 409 stale-target response and one-time client retry.
  - kept `editReportId` permission failures on the existing HTTP 403 path.
  - focused tests passed, 18 tests; latest merged full suite passed, 176 tests.
  - `npx tsc --noEmit` passed.
  - `npm run build` passed when the repository's public Supabase build variables were supplied.
  - no DB, migration, RLS, auth, attendance, accounting, or approval changes were made.
