# 보고서 인쇄 sandbox 실제 브라우저 smoke — 2026-09-08

## 결과

프로덕션 `https://church-opal.vercel.app`의 인증된 Chrome 세션에서 보고서 인쇄 sandbox가 시스템 인쇄 모달을 정상적으로 열었다. 코드 수정이나 재배포는 필요하지 않다.

## 확인 대상

- 보고서: 1청년 주차보고서, 2026-08-30
- 보고서 ID: `340ee89c-29b9-4535-a09f-c3c0ceae0994`
- 브라우저: macOS Google Chrome, 기존 `요한` 프로필의 인증 세션
- 경로: 보고서 상세 → `인쇄` → `인쇄 실행`

## 관찰 근거

- 인쇄 옵션 모달이 정상적으로 열렸다.
- `인쇄 실행` 후 옵션 모달이 닫히고 Chrome 시스템 인쇄 모달이 열려 배경 페이지가 비활성화됐다.
- `window.print()` 반환 전 `iframe`이 문서에 유지됐으며, 이는 시스템 인쇄 모달이 열린 동안 호출이 대기하는 브라우저 동작과 일치한다.
- 브라우저 콘솔 warning/error는 0건이었다.
- 실제 출력이나 PDF 저장은 수행하지 않았고 테스트용 탭을 닫아 종료했다.

## 회귀 검사

- `npm test -- --run src/lib/utils.test.ts`: 35 tests passed
- `npm run docs:check`: passed

## 영향 범위

- 앱 코드, 데이터베이스, migration, RLS, auth, attendance, 보고서 저장/결재, accounting 변경 없음
- 프로덕션 데이터 변경 없음
- Vercel 재배포 불필요
