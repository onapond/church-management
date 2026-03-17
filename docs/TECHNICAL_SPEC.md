# 청파중앙교회 교육위원회 관리 시스템 - 기술 명세서

> **최종 업데이트**: 2026-03-03
> 이 문서 하나로 프로젝트 전체를 파악할 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 앱 이름 | 청파중앙교회 교육위원회 관리 시스템 |
| 목적 | 교회 교육부서의 출결 관리, 보고서 작성/결재, 교인 관리, 회계 관리 |
| 프로덕션 URL | https://church-eight-delta.vercel.app |
| GitHub | https://github.com/onapond/church-management |
| 호스팅 | Vercel (수동 배포) |

### 기술 스택

| 영역 | 기술 | 버전/비고 |
|------|------|-----------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | strict mode |
| 스타일링 | Tailwind CSS | v4, 모바일 우선 |
| 서버 상태 | TanStack Query | 캐싱, Optimistic Update |
| DB/인증/스토리지 | Supabase | PostgreSQL, Auth, Storage, Realtime |
| 차트 | Recharts | 동적 임포트 |
| 에디터 | Tiptap | 리치 텍스트 |
| 엑셀 | xlsx | 가져오기/내보내기 |
| 푸시 알림 | web-push + VAPID | Service Worker |
| 배포 | Vercel | CDN + Serverless |

---

## 2. 아키텍처

### 시스템 다이어그램

```
  브라우저 / 모바일 / 태블릿
           │
           ▼
  ┌─────────────────────┐
  │    Vercel (CDN)     │
  │  Next.js 16.1.6     │
  │  ┌───────┬────────┐ │
  │  │ Pages │ API    │ │
  │  │(App   │Routes  │ │
  │  │Router)│(/api)  │ │
  │  └───────┴────────┘ │
  │  Middleware (auth)   │
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │     Supabase        │
  │ ┌────────┬────────┐ │
  │ │Postgres│  Auth  │ │
  │ │  (DB)  │(email) │ │
  │ ├────────┼────────┤ │
  │ │Storage │Realtime│ │
  │ │(photos)│(알림)  │ │
  │ └────────┴────────┘ │
  └─────────────────────┘
```

### 데이터 패턴

모든 페이지는 **`'use client'` thin wrapper 패턴**을 사용:
1. `page.tsx`는 `'use client'` 선언 후 Client 컴포넌트 렌더
2. Client 컴포넌트가 `useAuth()` + TanStack Query 훅으로 데이터 로드
3. 캐시 덕분에 재방문 시 즉시 표시

---

## 3. 데이터베이스

### 테이블 목록 (17개 테이블 + 2개 뷰)

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|-----------|
| `departments` | 부서 | code, name |
| `users` | 사용자 | email, name, role, is_active |
| `meetings` | 회의 | title, department_id, meeting_date, created_by |
| `members` | 교인 명단 | name, phone, birth_date, photo_url |
| `weekly_reports` | 보고서 | department_id, report_date, week_number, status |
| `attendance_records` | 출석 기록 | member_id, attendance_date, attendance_type |
| `visitations` | 심방 일정/보고 | visit_date, member_name, status, reason |
| `notifications` | 인앱 알림 | user_id, title, is_read |
| `accounting_records` | 회계장부 | department_id, record_date, income, expense |

### 특이 사항 및 보정 이력 (2026-03-03)

**주차 데이터 재동기화:**
과거 로직 오류로 인해 `week_number`가 날짜와 어긋난 데이터를 아래 SQL로 전수 보정함. (2/15 -> 7주차로 정상화)
```sql
UPDATE weekly_reports
SET week_number = ((report_date - (EXTRACT(DOW FROM report_date)::integer)) - '2026-01-04'::date) / 7 + 1
WHERE year = 2026 AND report_type = 'weekly';
```

**출결 저장 404 에러 해결:**
`attendance_records` 테이블에 `upsert` 시 `onConflict` 파라미터 불일치 문제 해결을 위해 옵션 제거(자동 감지).

---

## 4. 권한 시스템

### permissions.ts 핵심 함수

| 함수 | 설명 |
|------|------|
| `canViewReport` | 보고서 열람 7단계 권한 체크 |
| `isTeamLeader` | user_departments에서 부서 팀장 여부 확인 |
| `canAccessAccounting` | 회계 기능 접근 권한 확인 |
| `canCreateMeeting` | 회의 생성 가능 역할 체크 |

### meetings 권한

- 조회: 로그인 후 승인된 사용자 전체
- 생성: `super_admin`, `president`, `team_leader`
- 연결: `department_id`로 부서와 직접 연결
- 확장 전제: 결정사항/Task/AI 요약은 후속 Phase에서 별도 추가

---

## 5. 결재 워크플로우

`draft` → `submitted` → `coordinator_reviewed` → `manager_approved` → `final_approved`
(반려 시 `rejected` 상태에서 수정 후 재제출 가능)

## 2026-03-15 Meeting Minutes Extension
- Added \\public.meeting_minutes\\ with columns: \\meeting_id\\ (unique FK), \\discussion_notes\\, \\decisions\\, \\handoff_notes\\, \\updated_by\\, \\created_at\\, \\updated_at\\.
- RLS: authenticated active users can select; leaders/admins with meeting create permission can insert and update minutes for meetings in their scope.
- UI: meeting detail now reads and upserts structured minutes via TanStack Query without changing Phase 1 meeting routes.
- Permission alignment: `canEditMeetingContent` is scoped by `department_id` so the client edit state matches remote RLS behavior.

