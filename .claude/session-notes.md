# 세션 노트

## 작업 내역 (2026-02-23, 세션 12)

### 완료된 작업
1. [비밀번호 재설정 빈 화면 버그 수정] — `d9c720c` ~ `fecd97a`
   - **버그**: 비밀번호 찾기 이메일 링크 클릭 시 빈 화면
   - **근본 원인 1**: Supabase PKCE 흐름에서 `/auth/confirm` 라우트 누락 (token_hash 검증 불가)
   - **근본 원인 2**: Supabase Site URL이 `localhost:3000`으로 설정돼 있어 이메일 링크가 localhost로 리다이렉트
   - **수정 내용**:
     1. `src/app/auth/confirm/route.ts` 신규 생성 — `verifyOtp({ type, token_hash })` 처리
     2. `src/app/(auth)/login/page.tsx` — URL 에러 파라미터 처리 (reset_link_expired, auth_callback_failed)
     3. Supabase 대시보드 Site URL → `https://church-eight-delta.vercel.app` 변경 (사용자 수동)
   - **커밋**: `d9c720c`, `ff4a4af`, `fecd97a` (3회 반복 수정)

### 커밋 이력
- `d9c720c` - fix: 비밀번호 재설정 빈 화면 버그 수정 (PKCE confirm 라우트 추가)
- `ff4a4af` - fix: redirectTo를 절대 URL로 복원 (이메일 미발송 수정)
- `fecd97a` - fix: redirectTo를 callback 경로로 복원 (code 교환 필요)

---

## 작업 내역 (2026-02-23, 세션 11)

### 완료된 작업
1. [심방 일정표 기능 추가] — `3e9ff3b`
   - **DB**: `visitations` 테이블 (visitation_status/visitation_reason enum, RLS 4개 정책)
   - **달력 뷰**: 월간 달력에서 날짜별 심방 일정 확인, 색상으로 상태 구분
   - **목록 뷰**: 전체/날짜별 필터, 부서 필터, 상태 변경(완료/취소), 수정/삭제
   - **등록 모달**: 교인 검색(부서별), 날짜/시간, 심방자, 사유(병원/신입/정기/격려/기타), 메모
   - **네비게이션**: Sidebar + Header + 모바일 하단바에 "심방" 메뉴 추가
   - **권한**: 모든 로그인 사용자 조회/등록 가능, 본인 등록 일정만 수정/삭제
   - **신규 파일**: page.tsx, VisitationClient.tsx, VisitationForm.tsx, visitations.ts (쿼리 훅), create_visitations.sql
   - **수정 파일**: database.ts, constants.ts, Sidebar.tsx, Header.tsx, approvals.ts (기존 빌드 에러 수정)
   - **테스트**: 프로덕션에서 일정 등록 확인 완료

2. [Vercel 배포 설정 수정] — `855aef7`
   - **문제**: Vercel 프로젝트 설정 `framework: null` → Next.js 라우트 404
   - **수정**: Vercel API로 `framework: "nextjs"`, `buildCommand: "next build"` 설정
   - `--prebuilt` 배포는 Next.js 16 RSC segments 호환 문제로 사용 불가
   - CLAUDE.md에 배포 규칙 명시: `npm run build` → `git push` → `npx vercel --prod`

3. [교인 명단/출결 이중 카운트 수정] — `4586b8a`
   - **문제**: CU워십 멤버가 원소속 부서와 CU워십 양쪽에서 이중 카운트
   - **수정**: `HIDDEN_DEPARTMENT_CODES` 상수 추가 (`leader`, `cu_worship`)
   - MembersClient, AttendanceClient에서 해당 부서 탭/교인 제외
   - 표시 부서: CK부, 청소년부, CU1부, CU2부만 남음

4. [교인 명단 셀별 정렬 수정] — `f482d19`
   - **문제**: CU1부에서 셀별 정렬이 안 됨
   - **근본 원인**: `MEMBER_SELECT`에 `cell_id` 누락
   - **수정**: `cell_id` 조회 추가 + 부서 선택 시 셀 `display_order` 순 정렬 (셀 없는 교인은 마지막)

### 커밋 이력
- `3e9ff3b` - feat: 심방 일정표 기능 추가 (달력 + 목록 뷰) (11파일)
- `855aef7` - docs: Vercel 배포 규칙 수정 (1파일)
- `575eeeb` - docs: GitHub remote URL 업데이트 (1파일)
- `4586b8a` - fix: 교인 명단/출결 리더부·CU워십 제외 (3파일)
- `f482d19` - fix: 교인 명단 셀별 정렬 추가 (2파일)

### 심방 일정 필드 매핑
| UI 라벨 | DB 필드 | 타입 |
|---------|---------|------|
| 심방 대상자 | `member_name` (+ `member_id`) | varchar / UUID |
| 부서 | `department_id` | UUID |
| 날짜 | `visit_date` | DATE |
| 시간 | `visit_time` | TIME |
| 심방자 | `visitor` | varchar |
| 사유 | `reason` | enum (hospital/newcomer/regular/encouragement/other) |
| 상태 | `status` | enum (scheduled/completed/cancelled) |
| 메모 | `notes` | TEXT |

---

## 작업 내역 (2026-02-20, 세션 10)

### 완료된 작업
1. [주차 보고서 중복 생성 오류 수정] — `ReportForm.tsx`
   - **버그**: 같은 부서+연도+주차에 두 번째 주차 보고서 생성 시 "저장 중 오류가 발생했습니다" 모호한 메시지
   - **근본 원인**: DB `UNIQUE(department_id, year, week_number)` 제약조건
   - **수정 내용**:
     1. INSERT 전 중복 체크 쿼리 추가 (주차 보고서 신규 생성 시)
     2. 중복 감지 시 "이미 N주차 보고서가 존재합니다" + 기존 보고서 링크 UI
        - draft/rejected → "기존 보고서 수정하기" 버튼
        - submitted 이후 → "기존 보고서 보기" 버튼
     3. catch 블록에서 23505(unique violation) 에러코드 감지 → 사용자 친화적 메시지
   - **테스트**: Supabase Management API로 4개 시나리오 직접 검증 (모두 PASS)
   - **빌드**: `npm run build` 성공

---

## 작업 내역 (2026-02-20, 세션 9)

### 완료된 작업
1. [푸시 알림 E2E 테스트] — 2개 테스트 파일 신규 생성, 26개 테스트 추가
   - `src/lib/push.test.ts` (11개): sendPushToUser / sendPushToUsers 단위 테스트
     - 활성 구독 전송, 구독 없음 skip, DB 에러 조용히 종료
     - 410/404 → 구독 비활성화, 기타 에러 → 비활성화 안 함
     - payload 기본값(icon, link) 확인
     - 복수 사용자 전송, 빈 배열, 일부 성공+실패 혼합
   - `src/app/api/push/push-api.test.ts` (15개): 4개 API 라우트 테스트
     - subscribe: 인증 없음 401, 신규 등록 200, 기존 업데이트 200, 잘못된 데이터 400
     - unsubscribe: 인증 없음 401, 해제 200, endpoint 누락 400
     - send: 인증 없음 401, member 403, admin 200, 파라미터 누락 400
     - notifications GET: 인증 없음 401, 알림 목록+unreadCount 반환
     - notifications PATCH: 특정 알림 읽음, 전체 읽음(mark_all_read)
   - **결과**: 전체 93개 테스트 통과 (67 → 93)

### Mock 전략
- `web-push`: `vi.mock('web-push')` → sendNotification mock
- Supabase: `createMockChain` 패턴 재사용 (notifications.test.ts와 동일)
- `createClient()`: `vi.mock('@/lib/supabase/server')` → 순차적 from() 결과
- `rate-limit`: `vi.mock('@/lib/rate-limit')` → always allowed
- `NextRequest`: `new NextRequest(new URL(...), { method, body })` 직접 생성

---

## 작업 내역 (2026-02-20, 세션 8)

### 완료된 작업
1. [RLS 정책 자동 테스트 스크립트] — `supabase/test-rls.mjs`
   - Supabase Management API로 10개 시나리오 25개 테스트 케이스 실행
   - PL/pgSQL 헬퍼 함수(`_test_rls_write`)로 데이터 변경 없이 쓰기 정책 검증
   - `SET LOCAL ROLE authenticated` + `request.jwt.claims`로 사용자 시뮬레이션
   - **결과: 25/25 전체 PASS**
   - 실행: `SUPABASE_ACCESS_TOKEN=xxx node supabase/test-rls.mjs`

### 테스트 커버리지
- T1~T3: members (SELECT 부서 필터링, INSERT/DELETE 역할 제한)
- T4~T5: weekly_reports (INSERT 작성자 제한, UPDATE 작성자+결재자)
- T6: member_departments (관리자/팀장 제한)
- T7: attendance_records (부서 제한)
- T8: push_subscriptions (관리자 조회)
- T9: notifications (본인 전용 — 데이터 없어 스킵)
- T10: report_programs (보고서 작성자 제한)

---

## 작업 내역 (2026-02-10, 세션 6)

### 완료된 작업
1. [보고서 부서 선택 통합] - `ff26f6b`
   - `ReportForm.tsx`: 부서 선택을 모든 보고서 타입에서 상단에 통일 배치
   - 기존: weekly는 상단, 나머지는 하단에 중복 → 상단 1개로 통일

2. [TanStack Query 성능 최적화 - 1차] - `92c6fdf`
   - **staleTime 통일**: members(5분), reports(2분), attendance(30초), departments(10분)
   - **placeholderData: keepPreviousData** 추가 (members, reports, departments)
     → 탭/필터 전환 시 이전 데이터 유지 + 백그라운드 갱신
   - **ReportListClient 전환**: useState+useEffect 수동 fetch → `useReports` + `useTeamLeaderMap` TanStack Query 훅
     - 부서 필터도 URL searchParams 기반으로 변경 (`?type=weekly&dept=xxx`)
     - `isFetching` 상태로 백그라운드 갱신 시 반투명 처리
   - **AttendanceClient 전환**: useState+useEffect → `useAttendanceMembers` + `useAttendanceRecordsBrief` 훅
   - **신규 훅**: `useReports` 강화 (reportType 필터, departmentIds 복수 필터, ReportListItem 타입)
   - **신규 훅**: `useTeamLeaderMap(departmentIds[])` - 복수 부서 팀장 ID 맵 조회
   - **신규 훅**: `useAttendanceMembers(deptId)`, `useAttendanceRecordsBrief(date)` - 출결용 경량 훅

3. [TanStack Query 성능 최적화 - 2차] - `1e7c1d8`
   - **나머지 5개 컴포넌트** 모두 수동 fetch → TanStack Query 전환
   - **AccountingSummary**: useState+useEffect → `usePreviousBalance(deptId, year, month)`
   - **AccountingRecordForm**: supabase.auth.getUser() → `useAuth()` + `useDepartments()`
   - **ExpenseRequestForm**: 동일 전환 (useAuth + useDepartments)
   - **ExpenseRequestList**: 전면 재작성 → `useAuth()` + `useDepartments()` + `useExpenseRequests()` + `useDeleteExpenseRequest()`
   - **ReportStatsContent**: useState+useEffect → `useReportStats(selectedDept, startDate)`
   - **신규 훅**: `usePreviousBalance`, `useExpenseRequests`, `useDeleteExpenseRequest` (accounting.ts)
   - **신규 훅**: `useReportStats` + `ReportStatsRow` 타입 (reports.ts)
   - **결과**: 전체 데이터 fetching 100% TanStack Query 전환 완료 (수동 fetch 패턴 0개)

### 커밋 이력
- `ff26f6b` - Move department selector to top for all report types (1파일)
- `92c6fdf` - Optimize performance: TanStack Query caching for all pages (6파일)
- `1e7c1d8` - Convert remaining 5 components from manual fetch to TanStack Query (7파일)

### 성능 개선 효과
| 상황 | 개선 전 | 개선 후 |
|------|---------|---------|
| 보고서 목록 재방문 | 매번 로딩 스피너 | 2분 내 즉시 표시 |
| 보고서 탭 전환 | 빈 화면 → 로딩 | 이전 데이터 유지 + 백그라운드 갱신 |
| 출결 페이지 재방문 | 매번 로딩 | 5분 내 즉시 표시 |
| 교인 명단 재방문 | 매번 로딩 | 5분 내 즉시 표시 |

---

## 작업 내역 (2026-02-10, 세션 5)

### 완료된 작업
1. [셀장 보고서 타입 추가] - `44abf90`
   - DB: `report_type` enum에 `cell_leader` 추가 (마이그레이션)
   - `database.ts`: ReportType에 `cell_leader` 추가
   - `ReportForm.tsx`: 셀장 보고서 폼 (진행순서/출결/새신자 제외)
     - 셀 모임명, 날짜, 참석자, 나눔 내용(`main_content`), 기도제목(`application_notes`), 사진, 기타사항
     - 장소 필드 셀장 보고서에서 숨김
   - `ReportListClient.tsx`: 셀장 보고서 탭 추가 (아이콘: 🏠)
   - `reports/new/page.tsx`: 셀장 보고서 작성 지원
   - `EditReportClient.tsx`: 셀장 보고서 수정 지원
   - `ReportDetail.tsx`: 셀장 보고서 상세 표시
     - "셀 모임 개요" (장소 제외), "나눔 내용", "기도제목 및 기타사항"
     - 인쇄 HTML: 셀장 보고서 전용 (진행순서 제외, 나눔 내용/기도제목 라벨)

### 커밋 이력
- `44abf90` - Add cell leader report type with sharing content and prayer requests (7파일)

### 셀장 보고서 필드 매핑
| UI 라벨 | DB 필드 |
|---------|---------|
| 셀 모임명 | `meeting_title` |
| 셀 모임 날짜 | `report_date` |
| 참석자 | `attendees` |
| 나눔 내용 | `main_content` |
| 기도제목 | `application_notes` |
| 사진 | `report_photos` |
| 기타사항 | `notes` JSON → `other_notes` |

---

## 작업 내역 (2026-02-10, 세션 4)

### 완료된 작업
1. [엑셀 사진 임포트 - CU2부] - DB 직접 업데이트 (코드 변경 없음)
   - `2청년 주소록_0207.cell` (한셀 파일, ZIP 기반) 파싱
   - 사진 임포트: 13장 JPEG 추출 → Supabase Storage 업로드 → 12명 `photo_url` 업데이트
   - 김재우는 cu2 미등록(cu1에 이미 사진 있음) → 스킵
   - 사진 없는 2명: 김민혁, 송준호

2. [청소년부 데이터 업데이트] - DB 직접 업데이트
   - `2026 청소년부 주소록.xlsx` → 사진 없음 (데이터만)
   - 8명 phone, birth_date, occupation(학교) 업데이트

3. [보호자(guardian) 컬럼 추가] - `78e1c67`
   - DB: `members` 테이블에 `guardian varchar(100)` 컬럼 추가 (마이그레이션)
   - 청소년부 8명 보호자 데이터 입력
   - `database.ts`: Member 타입에 guardian 추가
   - `members/[id]/page.tsx`: 상세 화면에 직업/소속 + 보호자 카드 표시 (조건부)
   - `members/[id]/edit/page.tsx`: Member 인터페이스에 guardian 추가
   - `MemberForm.tsx`: 보호자 입력 필드 + 수정/등록 시 저장

### 커밋 이력
- `78e1c67` - Add guardian field to members and display in member detail/form (5파일)

---

## 작업 내역 (2026-02-10, 세션 3)

### 완료된 작업
1. [엑셀 데이터 임포트 - CU1부] - DB 직접 업데이트 (코드 변경 없음)
   - `1청년부 전체 명단 (26.01.31).xlsx` 파싱
   - 셀 배정: 1셀 6명, 2셀 6명, 3셀 4명 (16명 `cell_id` 업데이트)
   - 사진 임포트: xlsx에서 28장 JPEG 추출 → Supabase Storage 업로드 → `photo_url` 업데이트
   - 사진 없는 7명: 송준선, 이승재, 한수연, 김동혁, 이지욱, 박승조, 구현서

2. [edit/new 페이지 Client 전환] - `defd87f`
   - `reports/new/page.tsx`: useState/useEffect → `useAuth()` + `useDepartments()` + `useMemo`
   - `reports/[id]/edit/page.tsx`: 서버 컴포넌트 126줄 → thin wrapper 10줄
   - `EditReportClient.tsx` 신규: `useAuth` + `useReportDetail` + `useReportPrograms` + `useReportNewcomers` + `useDepartments`
   - 캐싱된 데이터 재사용으로 edit 페이지 즉시 표시

2. [새신자 → 교인 전환 기능] - `4eb9383`
   - `ReportDetail.tsx`: 새신자 카드에 "교인 전환" 버튼 + "전환 완료" 배지
   - `members/new/page.tsx`: `newcomerId` searchParam으로 새신자 데이터 조회, 제목/설명 변경
   - `MemberForm.tsx`: `newcomerData` prop으로 폼 자동 채움 (이름, 연락처, 생년월일, 주소, 소속→직업, 부서)
   - 교인 등록 후 `newcomers.converted_to_member_id`에 member ID 기록
   - 이미 전환된 새신자는 버튼 대신 "전환 완료" 배지 표시

2. [보고서 열람 권한 제한] - `91395f5`
   - `canViewReport()` 함수 추가 (permissions.ts): 7단계 권한 체크
     - 작성자 → draft 차단 → 관리자 → 부서확인 → 팀장(is_team_leader=true) → 셀장(peer) → 멤버
   - DB: 김효정, 김선웅 `is_team_leader=true` 설정 (cu1 부서 팀장)
   - `ReportDetail.tsx`: `canAccessAllDepartments` → `canViewReport` 교체, `useTeamLeaderIds` 훅 추가
   - `ReportListClient.tsx`: 부서별 팀장 ID 조회 + `filteredReports` client-side 필터링
   - `queries/reports.ts`: `useTeamLeaderIds(departmentId)` 훅 추가

2. [알림 로직 + 권한 테스트] - `cfa3e8e`
   - `permissions.test.ts`: canViewReport 12개 테스트 추가 (총 34개)
   - `notifications.test.ts`: 21개 테스트 신규 (Supabase mock 헬퍼 포함)
     - getRecipientsByRole, createNotification, createNotifications
     - createApprovalNotification (상태별 수신자 라우팅, 메시지 치환)
     - getUnreadCount, markAsRead, markAllAsRead
   - 전체 67개 테스트 통과 (기존 34 → 67)

### 커밋 이력
- `defd87f` - Convert report edit/new pages to useAuth + TanStack Query client pattern (3파일)
- `4eb9383` - Add newcomer to member conversion feature (3파일)
- `91395f5` - Add report viewing permission based on team leader hierarchy (4파일)
- `cfa3e8e` - Add tests for canViewReport and notification logic (2파일)

### 보고서 열람 권한 규칙
| 역할 | 열람 범위 |
|------|-----------|
| 작성자 본인 | 항상 (draft 포함) |
| super_admin, president, accountant | 모든 보고서 |
| 부서 팀장 (is_team_leader=true) | 부서 전체 보고서 |
| 셀장 (is_team_leader=false, role=team_leader) | 셀장끼리만 |
| 일반 멤버 | 자기 보고서만 |
| 타인의 draft | 차단 |

---

## 작업 내역 (2026-02-10, 세션 2)

### 완료된 작업
1. [결재 캐시 무효화] - `060d3e8`
   - ReportDetail에서 결재/취소/삭제 후 TanStack Query 캐시 자동 무효화
   - `queryClient.invalidateQueries` 추가 (approvals + reports 키)

2. [보고서 상세 Client 전환] - `060d3e8`
   - `reports/[id]/page.tsx`: 서버 컴포넌트 130줄 → thin client 9줄
   - `ReportDetail.tsx`: props 7개 → `reportId` 1개, useAuth + 4개 쿼리 훅 사용
   - `queries/reports.ts`: useReportDetail, useReportPrograms, useReportNewcomers, useApprovalHistory 추가
   - 부서 접근 제한/결재 권한 체크 클라이언트에서 처리

3. [반려 재제출 기능] - `da87061`
   - 반려 사유 표시 카드 (빨간색) + "수정 후 재제출" 버튼
   - `edit/page.tsx`: rejected 상태도 수정 허용 (기존 draft만 가능)
   - `ReportForm.tsx`: 재제출 시 반려 필드(rejected_by, rejection_reason) 초기화
   - 재제출 시 결재 알림 발송 (기존엔 신규 제출만)

4. [셀 관리 페이지] - `8c0d68b`
   - `/settings/cells` 신규 페이지 (관리자 전용)
   - `CellManager.tsx`: 부서 선택 → 셀 CRUD (추가, 인라인 이름 수정, 순서 변경, 활성/비활성)
   - `departments.ts`: useAllCells, useCreateCell, useUpdateCell, useReorderCells 훅 추가
   - Sidebar + Header에 "셀 관리" 메뉴 추가

### 커밋 이력
- `060d3e8` - Refactor all pages to useAuth + TanStack Query client pattern (18파일)
- `da87061` - Add rejected report resubmission flow (3파일)
- `8c0d68b` - Add cell management page for admin users (5파일)

---

## 작업 내역 (2026-02-10, 세션 1)

### 완료된 작업
1. [페이지 로딩 최적화 Phase 2] - 나머지 5개 페이지 변환 완료
   - Dashboard, Members, Reports, Attendance, Users → useAuth + TanStack Query
   - 새 파일: `queries/dashboard.ts`, `queries/users.ts`, `MembersClient.tsx`, `AttendanceClient.tsx`, `UsersClient.tsx`
2. [문서 업데이트] - 05-components, 06-api

### 참고사항
- 전체 12개 페이지 모두 `useAuth()` + TanStack Query 패턴으로 전환 완료 (edit/new 포함)
- 아키텍처 교훈: 서버 컴포넌트 방식은 매번 서버 fetch → 캐싱 불가. 클라이언트 훅이 정답

---

## 작업 내역 (2026-02-09)

### 완료된 작업
1. [보고서 통계 대시보드] - 커밋 `5f99845`
2. [셀별 필터 기능] - DB + 타입 + 쿼리 + UI (4개 페이지)
3. [웹 푸시 알림 구현] - 커밋 `8055f38` ~ `4693462`
4. [iOS PWA 호환성 수정]
5. [Supabase 보안/성능 Advisor 해결]

---

## 작업 내역 (2026-02-08)

### 완료된 작업
1. [교인 사진 일괄 업로드] - BulkPhotoUpload 컴포넌트
2. [보고서 삭제 기능] - 관리자 전용

---

## 작업 내역 (2026-02-16, 세션 7)

### 완료된 작업
1. [셀장보고서 출석 토글 버그 수정] - PDCA 완료
   - **버그**: 셀장보고서에서 셀원 출석 체크 버튼을 눌러도 반응 없음
   - **근본 원인**: useCellAttendanceRecords 훅의 구조분해 기본값이 매 렌더마다 새 배열 참조 생성 → useEffect 의존성 매번 변경 → 토글 즉시 리셋
   - **수정 내용**:
     1. useMemo로 cellRecordsData 참조 안정화 (Line 224)
     2. useEffect guard: cellMembers 동일하면 prev 반환 (Lines 232-237)
   - **결과**: PDCA Check 100% Match Rate (gap-detector 분석 완료)
   - **배포**: Vercel 프로덕션 배포 완료
   - **문서**:
     - Gap Analysis: `docs/03-analysis/cell-attendance-toggle-fix.analysis.md`
     - Completion Report: `docs/04-report/cell-attendance-toggle-fix.report.md`
     - Changelog: `docs/04-report/changelog.md` (신규 생성)

### PDCA 사이클 정보
- Phase: Plan → Design → Do → Check → Act (✅ 모두 완료)
- Match Rate: 100% (7/7 항목 일치)
- Quality Score: 98/100
- Duration: 2 days (2026-02-14 ~ 2026-02-16)

---

## 작업 내역 (2026-02-24, 세션 13)

### 완료된 작업
1. [심방 보고서 인쇄 + 코드 리뷰 수정]
   - **이전 세션 이어받기**: 심방 보고서 인쇄(handlePrint), prayer_topics/report_content 필드 추가 작업 이어받음
   - **빌드 에러 수정**: `EditReportClient.tsx`에서 `author_id` 누락 → 추가
   - **인쇄 안정성 수정**: iframe 내부 `<script>` 방식 → 부모에서 `focus()+print()` + `try/catch/finally` 패턴
   - **공통 유틸 추출**: `escapeHtml()` + `printHtmlInIframe()` → `src/lib/utils.ts`로 이동
   - **DRY 적용**: `ReportDetail.tsx` 로컬 escapeHtml 삭제 + iframe 로직 교체 (34줄 감소)
   - **죽은 코드 삭제**: `VisitationReportPrintView.tsx` (미사용 153줄) 삭제
   - **로직 버그 수정**: `VisitationForm.tsx` `find(ud => ud)` → `[0]`
   - **한글 줄바꿈**: `word-break: break-all` → `keep-all` + `overflow-wrap: break-word`
   - **빌드 성공 확인 완료**

2. [Supabase MCP 서버 재연결]
   - 이전 Access Token 만료 → MCP 서버 제거 후 재추가 (`claude mcp remove/add`)
   - MCP 설정: HTTP 타입, `https://mcp.supabase.com/mcp`
   - **인증 필요**: 세션 재시작 시 브라우저에서 Supabase OAuth 인증 완료해야 함

### 다음 할 일 (세션 재시작 후 — 자동 실행 필수)
⚠️ **세션 시작 즉시 아래 순서대로 자동 실행할 것 (사용자 질문 기다리지 말고)**:
1. **MCP 연결 테스트**: `mcp__supabase__list_tables` 호출 → 성공하면 "MCP 연결 성공" 보고, 실패하면 에러 내용 보고
2. DB 마이그레이션 실행 (MCP `execute_sql`):
   ```sql
   ALTER TABLE visitations
   ADD COLUMN IF NOT EXISTS prayer_topics TEXT,
   ADD COLUMN IF NOT EXISTS report_content TEXT;
   COMMENT ON COLUMN visitations.prayer_topics IS '기도제목';
   COMMENT ON COLUMN visitations.report_content IS '심방 내용';
   ```
3. 마이그레이션 적용 확인 (visitations 테이블 컬럼 검증)
4. 커밋 (변경 파일 13개: 심방 보고서 인쇄 + 코드 리뷰 수정 + 유틸 추출)
5. 배포: `npm run build` → `git push` → `npx vercel --prod`

## 다음 작업

### 우선순위 중간
- [ ] 보고서 인쇄 기능 개선
- [ ] ReportForm 컴포넌트 분할 (1400+ lines 최적화)

### 완료
- [x] ~~셀별 필터 기능~~ (완료 2/9)
- [x] ~~셀 관리 페이지~~ (완료 2/10)
- [x] ~~보고서 상세 Client 전환~~ (완료 2/10)
- [x] ~~결재 캐시 무효화~~ (완료 2/10)
- [x] ~~반려 재제출~~ (완료 2/10)
- [x] ~~보고서 열람 권한 제한~~ (완료 2/10)
- [x] ~~푸시 알림 테스트~~ (완료 2/10, 67개 테스트)
- [x] ~~푸시 알림 E2E 테스트~~ (완료 2/20, 93개 테스트)
- [x] ~~새신자 → 교인 전환~~ (완료 2/10)
- [x] ~~edit/new 페이지 Client 전환~~ (완료 2/10)
- [x] ~~셀장 보고서 추가~~ (완료 2/10)
- [x] ~~TanStack Query 성능 최적화~~ (완료 2/10, 전체 수동 fetch 0개 달성)
- [x] ~~심방 일정표~~ (완료 2/23, 달력+목록 뷰)
- [x] ~~비밀번호 재설정 빈 화면~~ (완료 2/23, PKCE confirm 라우트 + Site URL 수정)

---

## 참고사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함
- **사용자 승인 필드**: `is_active` (is_approved 아님)
- **Supabase Storage**: member-photos 버킷
- **보고서 삭제 순서**: report_programs → newcomers → approval_history → attendance_records → notifications → report_photos → weekly_reports
- **셀 관리**: `/settings/cells` (관리자 전용), 모든 부서에 셀 추가 가능
- **결재 흐름**: draft → submitted → coordinator_reviewed → manager_approved → final_approved (rejected에서 재제출 가능)
- **보고서 열람 권한**: `canViewReport()` in permissions.ts, `is_team_leader` 플래그로 팀장/셀장 구분
- **cu1 팀장**: 김효정, 김선웅 (is_team_leader=true), 나머지는 셀장 (is_team_leader=false)
- **새신자 전환**: 보고서 상세 → "교인 전환" 버튼 → `/members/new?newcomerId=xxx` → 등록 후 `converted_to_member_id` 업데이트
- **셀장 보고서**: report_type=`cell_leader`, 필드: meeting_title(셀 모임명), attendees(참석자), main_content(나눔 내용), application_notes(기도제목), report_photos(사진)
- **심방 일정**: `/visitations` 페이지, 달력+목록 뷰 전환, 모든 사용자 등록/조회 가능, 본인 일정만 수정/삭제
  - DB: `visitations` 테이블, `visitation_status` enum (scheduled/completed/cancelled), `visitation_reason` enum (hospital/newcomer/regular/encouragement/other)
  - RLS: 인증 사용자 전체 조회, 본인 등록건만 INSERT/UPDATE/DELETE
  - 교인 선택: `member_id` (선택사항) + `member_name` (필수, 직접 입력도 가능)
  - 쿼리 훅: `useVisitations(year, month, deptId)`, `useCreateVisitation`, `useUpdateVisitation`, `useDeleteVisitation`
  - 상수: `VISITATION_REASON_LABELS`, `VISITATION_STATUS_LABELS` in constants.ts
- **Vercel 배포 규칙**: `npm run build` → `git push` → `npx vercel --prod` (로컬 빌드 필수, framework: nextjs)
- **비밀번호 재설정 흐름**: `resetPasswordForEmail(redirectTo: origin/auth/callback?next=/reset-password)` → Supabase 이메일 → `/auth/callback`에서 code 교환 → `/reset-password`로 리다이렉트 → `updateUser({ password })`
- **Supabase 인증 라우트**: `/auth/callback` (code 교환), `/auth/confirm` (PKCE token_hash 검증) — 둘 다 존재해야 함
- **Supabase Site URL**: `https://church-eight-delta.vercel.app` (대시보드에서 설정, localhost 아님)
