# 세션 노트

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

## 다음 작업

### 우선순위 높음
- [ ] 푸시 알림 E2E 테스트

### 우선순위 중간
- [ ] 보고서 인쇄 기능 개선

### 완료
- [x] ~~셀별 필터 기능~~ (완료 2/9)
- [x] ~~셀 관리 페이지~~ (완료 2/10)
- [x] ~~보고서 상세 Client 전환~~ (완료 2/10)
- [x] ~~결재 캐시 무효화~~ (완료 2/10)
- [x] ~~반려 재제출~~ (완료 2/10)
- [x] ~~보고서 열람 권한 제한~~ (완료 2/10)
- [x] ~~푸시 알림 테스트~~ (완료 2/10, 67개 테스트)
- [x] ~~새신자 → 교인 전환~~ (완료 2/10)
- [x] ~~edit/new 페이지 Client 전환~~ (완료 2/10)

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
