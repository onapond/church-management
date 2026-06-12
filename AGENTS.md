# AGENTS.md

이 저장소는 청파중앙교회 교육위원회 관리 시스템이며, 장기적으로는 교회 운영 플랫폼(Church OS)으로 확장한다.

## 1. 제품 목적
현재 시스템은 교회 교육부서의 행정 운영을 지원한다.
기존 핵심 기능:
- 출결 관리
- 보고서 작성 및 결재
- 교인 관리
- 회계 관리
- 심방 일정
- 통계
- 푸시 알림

앞으로의 확장 방향:
- Task Management
- Meeting Management
- AI Meeting Assistant (plugin)
- Training System (program/bible reading/memory verse/assignment/reading brief)

중요:
- 기존 행정 코어를 깨지 말 것
- 새 기능은 확장 레이어로 추가할 것
- AI 기능은 core가 아니라 plugin/add-on 구조로 설계할 것

## 2. 절대 원칙
1. 기존 기능을 깨는 전면 리팩토링 금지
2. App Router / TypeScript strict / Supabase 기반 구조 유지
3. RLS와 권한 체계를 우회하지 말 것
4. 모바일 우선 UX 유지
5. 관리자 승인 기반 회원 구조(is_active)를 유지
6. 대규모 변경 전 반드시 영향 범위를 먼저 정리할 것
7. 추측으로 구조를 바꾸지 말고, 문서와 실제 코드를 함께 확인할 것

## 3. 작업 시작 전 필수 확인 문서
1. PROJECT_CONTEXT.md
2. CLAUDE.md
3. docs/TECHNICAL_SPEC.md
4. docs/USER_GUIDE.md
5. .claude/session-notes.md
6. .claude/bugs.md
7. docs/REACT_BEST_PRACTICES.md
8. CURRENT_TASK.md

## 3-1. 구현 전 필수 작업 절차
코딩을 시작하기 전에 반드시 아래 순서를 따른다.
1. AGENTS.md 읽기
2. PROJECT_CONTEXT.md 읽기
3. CURRENT_TASK.md 읽기
4. 직접 관련된 코드 파일 읽기
5. 변경 전 구현 계획 요약 공유

구현 계획 요약에는 반드시 아래 내용을 포함한다.
- 기존 attendance/report/accounting 흐름 영향 여부
- additive change로 처리할지 여부
- 관련 권한/RLS/auth 영향 범위
- 수정 대상 파일 예상 목록

## 4. 현재 기술 스택
- Next.js 16.x App Router
- TypeScript strict mode
- Supabase (Auth, DB, RLS, Storage, Realtime)
- TanStack Query
- Tailwind CSS v4
- Recharts
- Tiptap
- xlsx
- web-push

## 5. 코드 구조 원칙
- 페이지는 thin wrapper 패턴 유지
- 데이터 로딩은 TanStack Query 훅 우선
- 권한 검사는 lib/permissions.ts 중심
- Supabase client/server 분리 사용
- 무거운 컴포넌트는 dynamic import 고려
- useEffect로 URL 상태를 동기화하지 말고 파생 상태 우선
- 모달/팝업은 분리된 memo 컴포넌트 고려

## 6. 새 기능 추가 원칙
### Task / Meeting
- 기존 reports, attendance, accounting 흐름을 깨지 말 것
- 회의 → 결정사항 → Task 생성 흐름을 우선 설계
- Task는 meeting_id 연결 가능하게 설계
- 부서/프로그램 단위 접근 제어 고려

### Training
- 프로그램 중심 구조로 설계
- 교회별로 켜고 끌 수 있는 모듈형 구조 지향
- 초기 구현은 청파중앙교회 CU 운영 기준으로

### AI 기능
- AI Meeting Assistant는 독립 plugin
- 녹음/전사/요약/결정사항/Task 추천은 기본 기능이 아님
- 사용량/비용 추적 가능한 구조를 우선 고려
- core 기능과 결합하지 말고 feature flag 또는 module enable 방식으로 설계

## 7. 데이터베이스 변경 원칙
- 기존 테이블 변경보다 새 테이블 추가를 우선 검토
- migration 파일 명확히 작성
- RLS 정책 함께 작성
- src/types/database.ts 반영 필요
- 권한 영향이 있으면 docs/TECHNICAL_SPEC.md에 반드시 반영

## 8. 문서 업데이트 규칙
주요 작업 완료 후 반드시 다음 문서를 같이 업데이트:
- PROJECT_CONTEXT.md
- CLAUDE.md
- docs/TECHNICAL_SPEC.md
- docs/USER_GUIDE.md

추가로 작업 요약:
- .claude/session-notes.md

## 9. 테스트 및 배포 규칙
배포 전 반드시:
1. npm run build
2. npm test
3. 필요 시 npx tsc --noEmit

구현 후 반드시:
- 작업에 맞는 build/test를 실행할 것
- 변경 파일 목록을 보고할 것
- 가정한 내용과 미해결 이슈를 보고할 것

배포:
- git add / commit / push
- npx vercel --prod

GitHub 자동 배포는 연결되어 있지 않다고 가정한다.

## 10. 금지 사항
- 확인 없이 auth 흐름 변경 금지
- RLS 무력화 금지
- 기존 관리자 승인 흐름 제거 금지
- 광범위한 폴더 이동/이름변경 금지
- UI만 바꾸고 문서 미반영 금지
- "작동할 것 같음" 수준으로 종료 금지

## 11. 항상 먼저 해야 할 일
작업을 시작하면 아래 순서로 진행:
1. CURRENT_TASK.md 확인
2. 관련 코드 탐색
3. 영향 파일 목록 작성
4. 구현
5. 테스트
6. 문서 업데이트
7. session-notes 업데이트

## 12. Supabase 변경 규칙
- DB 스키마 변경은 Supabase Dashboard에서 수동 적용하지 않는다.
- 항상 migration 파일을 먼저 작성한다.
- 실제 반영 및 검증은 Supabase MCP 연결 환경에서 수행한다.
- 테이블/정책 변경 후에는 타입과 문서를 함께 업데이트한다.
- 로컬 코드만 변경하고 DB 미반영 상태로 완료 처리하지 않는다.

추가 고정 규칙:
- 기존 attendance/report/accounting 흐름을 깨지 말 것
- invasive refactor보다 additive change를 우선할 것
- Supabase RLS와 기존 auth 패턴을 존중할 것
- App Router + TypeScript strict + TanStack Query 패턴을 따를 것
- 구현 완료 후 필수 문서를 함께 업데이트할 것
