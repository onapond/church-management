# 출석 자동연계·통계 복구 핸드오프 (2026-09-05)

## 목표

셀장/리더가 셀장보고서와 주차보고서를 작성할 때 입력한 개인별 출석이 `attendance_records`에 자동 반영되고, 주차보고서와 통계 화면이 같은 원천 데이터를 일관되게 집계하도록 복구한다.

## 현재 확인된 장애

프로덕션 `zikneyjidzovvkmflibo`를 읽기 전용 감사한 결과:

- 최근 120일 셀장보고서 93건 중 87건에 `cell_id`, 78건에 참석자 입력이 있지만 `total_registered`, `worship_attendance`, `meeting_attendance`는 전부 0이다.
- 해당 보고서와 `report_id`로 연결된 `attendance_records`는 0건이다.
- 최근 출석 레코드는 모두 `checked_via = manual`, `report_id = null`이다.
- CU1 최근 주차보고서 14건은 예배출석 14/14, 모임출석 13/14에서 개인 출석 레코드 집계와 불일치했다. 12건은 보고서 숫자가 있으나 대응 개인 출석 레코드가 0건이었다.

따라서 “일부 데이터만 늦게 반영”이 아니라 보고서→출석 자동연계 경로가 사실상 작동하지 않는 상태다.

## 코드 원인

1. `src/components/reports/utils/reportDataBuilder.ts`
   - `cell_leader` 보고서의 `total_registered`, `worship_attendance`, `meeting_attendance`를 0으로 고정한다.

2. 셀장보고서 입력 UI
   - 개인별 모임 출석 체크만 제공하고 예배 출석을 별도로 입력할 수 없다.
   - 현재 `cellAttendance`가 어느 출석 유형을 뜻하는지 UI/API/DB 계약이 불명확하다.

3. `src/components/reports/CellReportAggregatorClient.tsx` 및 집계 흐름
   - 셀장보고서의 0으로 저장된 요약 필드를 합산하므로 주차보고서로 올바른 수치가 전달되지 않는다.
   - 주차보고서 폼은 전체 합계 fallback만 있고 셀별 개인 출석 원천과 안정적으로 연결되지 않는다.

4. `supabase/migrations/006_save_report_bundle_rpc.sql` 및 `/api/reports/save`
   - 출석 저장 예외를 일반 warning으로 축약해 보고서 저장 성공처럼 보일 수 있다.
   - 보고서 저장과 출석 저장의 성공/실패 계약, `report_id`, `checked_via` 검증이 부족하다.

5. 통계 쿼리
   - 부서/셀 교인 ID 집합이 비었을 때 필터를 생략해 전체 출석을 반환할 수 있다.
   - 4/13/52주 고정 분모를 사용한다.
   - 과거 비활성 포함 출석 분자와 현재 활성 교인 분모를 섞는다.
   - 보고서 통계가 모든 `report_type`을 세면서 주당 1건을 가정한다. 예: CU1 올해 전체 보고서 202건, 실제 주차보고서 23건.

6. 테스트 공백
   - 기존 전체 테스트는 통과하지만 셀장보고서→출석→주차보고서→통계의 종단 흐름을 검증하지 않는다.

## 구현 원칙

- 기존 수동 출결 화면과 회계 흐름을 깨지 않는다.
- `attendance_records`를 개인 출석의 단일 원천으로 삼고, 보고서 숫자는 그 레코드에서 파생하거나 같은 트랜잭션에서 일치하게 저장한다.
- `checked_via = report`, `report_id = weekly_reports.id`를 명시하고, 동일 교인/날짜/유형의 수동 기록과 충돌할 때 우선순위를 먼저 문서화한다.
- 셀장보고서에는 예배(`worship`)와 모임(`meeting`)을 구분해 입력할 수 있어야 한다. 기존 하나의 체크값을 임의로 두 유형에 복제하지 않는다.
- 보고서 저장은 출석 연계 실패를 성공으로 숨기지 않는다. 원자적 저장이 어렵다면 사용자에게 부분 실패와 복구 동작을 명확히 보여준다.
- RLS/auth는 기존 패턴을 유지하고 migration으로만 변경한다.

## 권장 작업 순서

1. 실제 테이블 제약, `save_report_bundle` 프로덕션 함수 정의, 출석 RLS/unique index를 다시 조회한다.
2. `cellAttendance` payload를 `memberId + worshipPresent + meetingPresent` 형태의 명시적 계약으로 바꾸고 단위 테스트를 먼저 추가한다.
3. 셀장보고서 UI에 예배/모임 체크를 분리한다.
4. 저장 RPC가 보고서 행과 두 출석 유형을 한 트랜잭션에서 upsert/delete하고 `report_id`, `checked_via='report'`를 기록하도록 새 migration을 작성·적용한다.
5. 셀장보고서 요약 필드를 저장된 개인 출석에서 계산하고, 주차보고서 집계도 개인 출석 원천 기준으로 바꾼다.
6. 통계의 빈 ID 집합, 실제 날짜 범위 분모, 역사적 재적 기준, `report_type='weekly'` 필터를 각각 수정한다.
7. 셀장보고서 생성/수정/삭제, 수동 출결 충돌, 주차보고서 집계, 통계까지 통합 테스트를 추가한다.
8. 프로덕션 적용 후 테스트용 보고서 1건으로 `attendance_records.report_id`, 두 attendance type, 요약 숫자, 통계 반영을 종단 검증한다.

## 예상 영향 파일

- `src/components/reports/utils/reportDataBuilder.ts` 및 테스트
- `src/components/reports/utils/reportSavePayload.ts`
- `src/components/reports/hooks/useReportForm.ts`
- `src/components/reports/hooks/useReportSubmit.ts`
- 셀장보고서 출석 입력 컴포넌트와 `ReportForm.tsx`
- `src/components/reports/CellReportAggregatorClient.tsx`
- `src/app/api/reports/save/route.ts` 및 테스트
- `src/queries/attendance.ts`, 통계 관련 query/component
- 신규 Supabase migration(021 이후)
- 필수 문서와 `.claude/session-notes.md`

## 선행 완료 상태

- P0 보안 migration 020은 프로덕션 적용 완료.
- 사진 버킷 private/signed URL 전환 완료.
- 현재 전체 검증(원격 stale-draft 복구 통합 후): lint 통과, 185 tests 통과, typecheck 통과, production build 통과.
- 현재 세션의 P0 변경과 출석 자동연계 수정은 의도적으로 분리한다.
