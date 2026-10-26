# 주차보고서 부서 리더 공유 — 2026-10-26

## 범위
- 활성 부서 리더(`user_departments.is_team_leader=true`)끼리 다른 부서의 non-draft `weekly` 보고서를 조회한다.
- `role=team_leader`만 있고 위 표시가 없는 일반 셀장은 새 조회 권한을 받지 않는다.
- 셀장보고서는 기존 작성자, 담당 부서 리더, 관리자 조회 범위 유지. 예: 2청년 리더는 1청년 셀장보고서를 열람할 수 없다.
- 모임/교육/프로젝트/심방 보고서와 임시저장, 작성/수정/삭제/결재 권한은 확장하지 않는다. 출결/회계 데이터와 auth 승인 흐름도 변경하지 않는다.
- 목록의 전체 부서 조회는 weekly 탭에만 적용한다. 다른 유형으로 이동할 때 열람 범위 밖의 부서 필터를 해제한다. URL을 직접 바꾸거나 상세 주소로 접근해도 DB RLS가 최종 경계다.

## DB와 검증
- `supabase/migrations/20261026075008_share_weekly_reports_with_department_leaders.sql`. 공식 Supabase CLI로 생성 후 MCP apply_migration으로 적용한 원격 version에 파일명을 맞췄다.
- 교회 프로젝트 `zikneyjidzovvkmflibo`의 새로 승인된 전용 MCP 세션에서 apply_migration/execute_sql/get_advisors 실행. 기존 앱 커넥터는 이 프로젝트 권한이 없어 사용하지 않았다.
- 기존 weekly_reports 정책 8개는 정의가 완전히 동일하다. SELECT 정책 1개만 추가했고 RLS는 활성 상태다. 타입 필드 변경 없음; database.ts에는 정책 범위 설명을 추가했다.
- `scripts/verify-weekly-report-sharing.sql`은 실데이터를 24개 사용자 인증 역할로 조회하여 전체 보고서 ID 결과를 기대값과 비교한다. 본문은 출력하지 않는다.
- 일반 부서 리더 3명: 타 부서 주차보고서 허용. 일반 셀장 13명과 비활성 사용자 1명 포함 기존 범위 유지. 익명 보고서 0건.
- report_programs/newcomers/report_photos의 하위 데이터 3개 테이블도 각 사용자별 부모 권한과 일치.
- 타 부서 주차보고서의 UPDATE/DELETE 시도 6건 모두 0행. 테스트는 전체 ROLLBACK했고 데이터 수정은 없다.
- `npm run verify` 통과: 18 files / 222 tests, lint, typecheck, production build. 권한 회귀 10건과 목록 필터/유형 전환 회귀 4건 추가.
- 브라우저는 기존 관리자 세션을 사용한다. 리더/셀장 개별 로그인 UI를 대신했다고 해석하지 않으며 실제 DB 인증 역할 검증과 컴포넌트 테스트로 접근 경계를 확인했다.

## 앞선 문구 수정
- 코드 `4ec07b9`, 배포 `dpl_A6VDeA6Ywj6A6VedmatJ9U7oqi1G`에서 `2026년 10월 18일 (42주차) 보고서 제출` 문구 적용.
- 운영 수정 화면에서 실제 표시와 이전 보고서 날짜 보존을 확인했다. 제출 버튼은 누르지 않았다.

## 변경 파일
- `src/lib/permissions.ts`, `src/lib/permissions.test.ts`
- `src/components/reports/ReportListClient.tsx`, `src/components/reports/ReportListClient.test.tsx`
- `src/types/database.ts`, 위 마이그레이션 및 검증 SQL
- `CURRENT_TASK.md`, `PROJECT_CONTEXT.md`, `CLAUDE.md`, `docs/TECHNICAL_SPEC.md`, `docs/USER_GUIDE.md`, `.claude/session-notes.md`, 이 문서

## 기존 보안 진단 후속 항목
이번 마이그레이션은 함수/auth 설정을 바꾸지 않았다. get_advisors가 기존 함수와 auth 설정에서 아래 경고를 보고했다. 요청 범위의 조회 정책 결함은 없으며, 전체 시스템 보안 점검 완료를 의미하지 않는다.
- is_in_department의 [고정되지 않은 search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- 기존 SECURITY DEFINER 함수 6개의 [anon 실행 권한](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) 및 [authenticated 실행 권한](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). 기존 함수의 호출 필요성과 실제 GRANT를 별도로 검토해야 한다.
- [유출 비밀번호 차단 미설정](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 운영 배포 완료
- 코드 `fab29ff`를 origin/main에 push하고 Vercel production `dpl_HnLUTxy4JSwdJQfQvgvvXwuzdYqT` READY 및 `https://church-opal.vercel.app` alias 완료. 인증된 관리자 세션의 운영 보고서 목록 정상 로드, 브라우저 오류 0건 확인.
- 요청 범위 미해결 사항 없음. 리더/셀장 권한은 24계정 DB 역할 검증 및 컴포넌트 회귀 테스트로 확인했다.
