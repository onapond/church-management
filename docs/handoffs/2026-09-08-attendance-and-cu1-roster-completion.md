# 출석 연계 및 CU1 셀 명단 작업 완료 핸드오프

**작성일:** 2026-09-08  
**상태:** 완료 — 후속 구현 작업 없음  
**프로덕션:** `https://church-opal.vercel.app`  
**Supabase 프로젝트:** `zikneyjidzovvkmflibo`  
**구현 기준 커밋:** `40cd23b` (`origin/main`)

## 1. 이번 세션에서 완료한 범위

### 셀장보고서 출석 자동 연계 및 통계 복구

- 셀장보고서에서 개인별 예배와 모임 출석을 분리했다.
- 명시적 보고서 저장이 보고서와 `attendance_records`를 하나의 트랜잭션으로 저장한다.
- 보고서 출처 행은 `report_id`와 `checked_via='report'`를 기록한다.
- 주차보고서 취합과 통계가 연결된 개인 출석을 같은 원천으로 사용한다.
- 빈 부서/셀 범위의 전체 출석 확장, 고정 기간 분모, 과거 분자와 현재 활성 분모 혼용, `report_type` 미필터 문제를 수정했다.
- 수동 출결, 보고서 결재, 회계, 회원 승인과 P0 보안 기준선은 유지했다.

관련 migration과 테스트:

- `supabase/migrations/021_link_report_attendance_atomically.sql`
- `supabase/migrations/022_fix_attendance_summary_trigger_search_path.sql`
- `supabase/migrations/023_preserve_manual_attendance_on_report_delete.sql`
- `supabase/tests/attendance_report_linkage_e2e.sql`

프로덕션과 배포:

- migrations `021`~`023` 적용 완료.
- 구현 커밋 `46391bb`, 배포 기록 커밋 `7563dd2`가 `origin/main`에 있다.
- Vercel 배포 `dpl_CeQvKFfV4ckeoXdTqMrXz6NxkHpX`가 READY이며 production alias가 연결됐다.

### 다희셀·태희셀 명단 복구

- 다희셀: 김동혁, 김은수, 도지수, 이다희, 장미화.
- 태희셀: 강태웅, 김민지, 박승조, 이태희, 조민정, 한수연b.
- 운영 SQL: `scripts/ops-2026-09-07-fix-dahui-taehee-cell-rosters.sql`.
- 프로덕션 적용 및 검증 완료. 커밋 `ce4ff66`이 `origin/main`에 있다.

### CU1 미배정자 배정 및 태신자셀 신설

- 김선웅은 기존 `선웅셀`, 이현진은 기존 `현진셀`에 배정했다.
- 김효정은 활성 CU1 팀장 권한을 유지하고 셀 미배정으로 남겼다.
- 기존 `새신자셀`과 별도로 `태신자셀`을 신설했다.
- 태신자셀: 구현서, 김민호, 김영효, 김지솔, 박수빈, 송준선, 신원주, 우현승, 장성재, 현수빈.
- 운영 SQL: `scripts/ops-2026-09-07-assign-cu1-unassigned-members.sql`.
- `ROLLBACK` 드라이런 후 프로덕션 적용 및 검증 완료. 커밋 `40cd23b`가 `origin/main`에 있다.

## 2. 마지막 프로덕션 검증 스냅샷

2026-09-07 사후 감사 기준:

- 전체 `attendance_records`: 782건.
- 전체 `weekly_reports`: 299건.
- `report_id`와 `checked_via='report'`가 연결된 출결: 24건.
- 실제 운영 셀장보고서 2건에서 각 12행, 총 예배 12행/모임 12행이 생성됐다.
- 고아 `report_id`, 보고서/출석 날짜 불일치, 교인 부서 불일치: 모두 0건.
- CU1 활성 셀: 8개.
- CU1 중복 부서 소속 및 다른 부서 셀 연결: 모두 0건.
- 활성 CU1 셀 미배정자는 김효정 1명만 남았다.

위 건수는 시점 스냅샷이므로 정상 운영 입력에 따라 이후 증가할 수 있다.

## 3. 지켜야 할 결정과 주의점

- 과거 셀장보고서의 참석자 문자열을 예배/모임 두 유형으로 추측 백필하지 않는다.
- 연결 없는 과거 보고서는 사용자가 개인 출석을 명시적으로 수정하기 전까지 기존 요약을 유지한다.
- 김효정은 명시적인 새 운영 결정이 있기 전까지 셀 미배정 팀장으로 유지한다.
- `태신자셀`과 `새신자셀`은 서로 다른 셀이다. 합치거나 이름을 바꾸지 않는다.
- `선웅셀`·`현진셀`이 이미 있으므로 `김선웅셀`·`이현진셀` 같은 중복 행을 만들지 않는다.
- 두 운영 SQL은 현재 상태를 검증하는 one-shot 스크립트다. 성공 후 재실행하면 안전하게 실패하는 것이 정상이다.
- 프로덕션 접근 토큰은 macOS Keychain의 `codex-supabase-pat` 서비스에 있으며 문서나 로그에 값을 기록하지 않는다.

## 4. 검증 및 저장소 상태

- `npm run verify`: docs check, lint 0 warnings, 14 test files / 193 tests, TypeScript 통과.
- 샌드박스 첫 build는 Google Fonts 네트워크 차단으로 실패했고, 네트워크 허용 재실행에서 Next.js 16.1.6 production build가 통과했다.
- 핸드오프 작성 직전 구현 worktree는 clean이고 `HEAD`, `origin/main`, `origin/HEAD`가 모두 `40cd23b`를 가리켰다.
- 셀 명단 작업은 데이터-only라 애플리케이션 재배포가 필요하지 않았다.

## 5. 다음 세션 시작점

현재 요청된 작업은 모두 완료됐다. 새 문제가 없다면 추가 변경하지 않는다.

후속 출석 문제를 조사할 때는 다음 순서로 시작한다.

1. `AGENTS.md` 필수 문서와 이 핸드오프를 읽는다.
2. 저장소 상태가 아니라 프로덕션 함수·제약·RLS와 실제 데이터부터 다시 감사한다.
3. 새 보고서의 `report_id`, `checked_via`, 예배/모임 두 행과 주차보고서 집계를 같은 보고서 기준으로 대조한다.
4. 셀 명단 문제면 먼저 `member_departments.cell_id`와 활성 `cells`를 확인하고 과거 출결·보고서를 임의 수정하지 않는다.
5. 변경이 필요하면 기존 수동 출결·결재·회계·auth/RLS를 보존하는 additive migration 또는 보호 조건이 있는 운영 SQL을 우선한다.

참고: 로컬 Vercel CLI 58.4.0은 최신 59.11.7보다 오래됐다. 다음 실제 배포 전에 `npm i -g vercel@latest` 업데이트를 권장한다.
