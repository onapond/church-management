# 늦은 주차 보고서 오류 수정 완료 — 2026-10-26

## 결과
- 날짜를 변경해도 최초 주차로 저장하던 오류를 수정했다. 선택한 보고 대상 날짜에서 UI와 서버가 같은 주차·연도를 계산한다.
- “지난 보고서 늦게 제출” 체크와 보고 대상 날짜/주차 표시, 제출 전 대상 확인 체크를 추가했다. 날짜 또는 부서가 바뀌면 확인을 다시 받는다.
- 기본 보고 날짜는 한국 시간 기준 최근 일요일이며 폼을 연 시점에 고정한다.
- 기존 출결 연동, 결재 순서, 회계, 계정 승인, auth/RLS, 사진 표시를 보존했다. 스키마 변경 없음.

## 기존 보고서 정정
- 2청년 권성경 보고서 `23e35ee6-a91d-4250-ad57-9bb2352c4a5b`: 2026-10-25/43주차 → 2026-10-18/42주차.
- 생성 시각은 10월 25일 00:01 KST였으며, 첨부 상황과 보고서 내용을 대조해 지난주 보고서임을 확인했다.
- 본문, 제출 시각, 회장검토 상태, 결재 이력 1건을 보존했다. 연결된 출결은 0건이었다.
- `scripts/ops-2026-10-26-correct-cu2-report-period.sql`에 대상·현재 상태·목적 주차 중복·출결 연결 방어와 변경 전후 비교를 기록했다. 저장된 SQL은 ROLLBACK 기본값이며 이미 적용한 행은 상태 검사에서 중단한다.
- ROLLBACK 드라이런 통과 후 동일 SQL의 COMMIT 버전을 적용하고 운영 상세 화면에서 날짜와 주차를 재확인했다.
- 교회 프로젝트 `zikneyjidzovvkmflibo` 전용 Supabase MCP OAuth 인증 완료. 현재 대화 도구 목록이 새 연결을 즉시 노출하지 않아 동일 승인 OAuth 연결의 공식 Management API로 데이터 정정을 수행했다. 스키마·정책 변경은 수행하지 않았다.

## 검증과 배포
- 최신 origin/main `d90ad39` 기반 코드 커밋 `84709c8`, origin/main push 완료.
- `npm run verify`: docs:check, lint, 17개 파일/208 tests, TypeScript, production build 모두 통과.
- Vercel production `dpl_HnMwvHNhtBRqJnehiwJP3dTvzi7Z` READY, https://church-opal.vercel.app alias 완료.
- 인증된 운영 수정 화면에서 늦은 제출 선택에 따른 10/18·42주차와 10/25·43주차 전환을 확인했다. 제출 대상 확인 시 버튼 활성화, 날짜 변경 시 확인 해제와 버튼 비활성화를 확인했다.
- 실제 새 보고서 제출은 운영 레코드 생성을 피하기 위해 실행하지 않았다. 저장 메타데이터 일치는 builder/persistence/API 회귀 테스트로 검증했다.
- “늦은 제출”은 과거 보고 날짜 선택을 돕는 UI이다. 별도 마감 규정이나 결재 상태, DB 지각 플래그를 추가한 것은 아니다.
- 요청 범위의 미해결 기능 문제 없음.

## 변경 파일
- 화면: `src/app/(dashboard)/reports/new/page.tsx`, `src/components/reports/EditReportClient.tsx`, `ReportForm.tsx`, `WeeklyReportDateFields.tsx`.
- 날짜/저장: `src/components/reports/utils/reportPeriod.ts`, `reportDataBuilder.ts`, `src/app/api/reports/save/route.ts`.
- 회귀: `ReportForm.period.test.tsx`, `WeeklyReportDateFields.test.tsx`, `utils/reportPeriod.test.ts`, `utils/reportDataBuilder.test.ts`, `utils/reportPersistence.test.ts`, `src/app/api/reports/save/route.test.ts`.
- 문서: `CURRENT_TASK.md`, `PROJECT_CONTEXT.md`, `CLAUDE.md`, `docs/TECHNICAL_SPEC.md`, `docs/USER_GUIDE.md`, `.claude/bugs.md`, `.claude/session-notes.md`, 이 문서와 운영 SQL.

## 작업 폴더
- 최종 작업 폴더: `/Users/shin/.codex/worktrees/report-late-week/church` (branch `codex/fix-late-weekly-reports`).
- 원래 `/Users/shin/dev/church`는 원격보다 오래된 로컬 main과 사용자 미커밋 변경이 있어 그대로 보존했다. 이 작업에서 임시 작성했던 중복 변경만 백업 후 정리한다. 원본의 기존 세션 노트, .agents/.bkit, 이전 운영 SQL과 자료는 유지한다.
