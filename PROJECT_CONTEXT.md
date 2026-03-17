# PROJECT_CONTEXT.md

## 1. 프로젝트 한줄 요약
청파중앙교회 교육위원회 관리 시스템.
현재는 교회 교육부서 행정 앱이며, 장기적으로는 교회 운영 플랫폼(Church OS)으로 확장 중이다.

## 2. 현재 서비스명 / 장기 제품명
- 현재 서비스명: 청파중앙교회 교육위원회 관리 시스템
- 장기 제품 방향: Church OS
- 현재 우선 목표: 청파중앙교회 CU 조직에서 바로 사용할 수 있는 실전 기능 확장

## 3. 현재 운영 범위
현재 제공 기능:
- 출결 관리
- 주차/모임/교육/셀장 보고서
- 회의 관리
- 보고서 결재
- 교인 관리
- 회계 관리
- 심방 일정
- 통계
- 푸시 알림

## 4. 조직 컨텍스트
상위 조직:
- CU (Chungpa United)

부서:
- 청소년부
- 1청년(20대)
- 2청년(30대)
- CU 워십팀

리더십:
- 교육위원장(부장)
- 교역자
- 회장
- 각 부서 팀장
- 1청년 소속 셀장

## 5. 현재 프로그램 운영 컨텍스트
진행 중 프로그램:
- 리더 성경공부 강사 양성
- 셀장 성경공부
- 매일 성경 10장 읽기
- 매주 1절 암송
- 워십팀 독서 나눔
- 워십팀 독서 브리프 제출
- 워십팀 음악 과제

## 6. 기술 아키텍처
- Next.js 16 App Router
- TypeScript strict
- Supabase (Auth, DB, RLS, Storage, Realtime)
- TanStack Query
- Tailwind CSS v4
- Recharts
- Tiptap

핵심 구조:
- middleware.ts → AuthProvider → dashboard layout
- thin wrapper page pattern
- client-side fetching + query caching

## 7. 현재 핵심 데이터
기존 핵심 도메인:
- users
- departments
- meetings
- members
- member_departments
- cells
- weekly_reports
- approval_history
- attendance_records
- notifications
- accounting_records
- expense_requests
- visitations
- photos

## 8. 현재 권한 구조
기존 role:
- super_admin
- president
- accountant
- team_leader
- member

실제 운영상 추가 해석:
- 교육위원장
- 교역자
- 회장
- 부서 팀장
- 셀장
- 일반 멤버

주의:
- 현재 DB enum/권한 모델을 전면 교체하지 말고 확장 방식으로 접근할 것

## 9. 현재 제품의 한계
현재 시스템은 행정 기록에는 강하지만, 아래 흐름이 약하다:
- 회의 기록
- 결정사항 정리
- 인계
- 평일 Task 진행 추적
- 훈련/제자양육 프로그램 진행 관리

## 10. 제품 확장 방향
확장 대상:
1. Task Management
2. Meeting Management
3. Training System
4. AI Meeting Assistant (plugin)

원칙:
- 기존 코어를 유지
- 새 기능은 모듈형으로 확장
- AI 기능은 유료 plugin/add-on 전제로 분리

## 11. 핵심 제품 철학
이 앱은 단순 교인관리/출결 앱이 아니라
"회의를 실행으로 바꾸는 교회 운영 시스템"으로 진화한다.

중심 흐름:
회의
→ 회의록
→ 결정사항
→ Task
→ 주중 진행 확인
→ 다음 회의 인계

## 12. AI 기능 원칙
AI 기능은 기본 기능이 아니다.
AI 기능은 독립적으로 추가/제거 가능한 컴포넌트다.

대표 AI 기능:
- 회의 녹음
- 전사
- 요약
- 결정사항 추출
- Task 후보 생성
- 인계 노트 생성

지원 목표:
- 모바일 직접 녹음
- Zoom/Google Meet 회의 요약

## 13. 아키텍처 원칙
- 전체 리팩토링 금지
- additive change 우선
- 새 테이블/새 모듈 추가 우선
- 기존 보고서/출결/회계 흐름 안정성 최우선
- RLS 유지
- 모바일 우선
- 성능/권한/문서 업데이트 함께 처리
- 회의 기능은 기존 행정 코어와 분리된 additive module로 확장

## 14. 문서 운영 규칙
주요 작업 완료 후 반드시 갱신:
- PROJECT_CONTEXT.md
- CLAUDE.md
- docs/TECHNICAL_SPEC.md
- docs/USER_GUIDE.md
- .claude/session-notes.md

## 15. 현재 가장 중요한 다음 작업
- Task 기능 설계 및 구현
- Meeting 기능 설계 및 구현
- Meeting 기반 Task 연결
- Training System 기초 구조 설계
- AI Meeting plugin 구조 설계
- 향후 교회별 컴포넌트화 가능한 구조 준비

## 16. 주의할 점
- 문서상 테스트 개수 불일치(93 vs 103) 확인 필요
- 배포는 수동 vercel 배포
- 이메일 인증 대신 관리자 승인 구조 유지
- 제품명 확장과 현재 운영명 혼동 주의

## 2026-03-15 Update
- Meeting Management Phase 2 adds a separate \\meeting_minutes\\ table for structured minutes, decisions, and handoff notes.
- This remains an additive extension to the existing meetings module and does not change attendance, report, or accounting flows.
- Remote Supabase now has both \\meetings\\ and \\meeting_minutes\\ tables with RLS enabled, verified through MCP.
- Meeting minutes edit permission is aligned with RLS: `super_admin` and `president` can edit across departments, and `team_leader` can edit only for departments they lead.

