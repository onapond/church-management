# 세션 노트 - 2026년 1월 29일

## 프로젝트 정보

- **프로젝트명**: 청파중앙교회 교육위원회 통합 관리 시스템
- **GitHub**: https://github.com/onapond/church-management
- **Supabase 프로젝트**: https://zikneyjidzovvkmflibo.supabase.co

---

## 오늘 완료한 작업

### 1. 핵심 기능 구현
- [x] 대시보드 - 역할별 결재 대기, 출석 통계, 빠른 작업
- [x] 결재함 (`/approvals`) - 결재 대기 목록, 처리 완료 목록
- [x] 통계 페이지 (`/stats`) - 부서별 출석 현황, 주간 추이 차트
- [x] 출결 관리 - 엑셀 스타일 테이블, 부서/날짜 필터

### 2. 권한 시스템 수정
- [x] `super_admin` 역할 추가 - 모든 기능 접근 가능
- [x] 보고서 작성 버튼 - super_admin, president, manager, pastor, leader 모두 표시
- [x] 결재함 접근 - super_admin 추가
- [x] 출결 관리 - `user_departments` 테이블 의존 제거, `users.department_id` 직접 사용

### 3. UI/UX 개선
- [x] 모바일 반응형 디자인 (결재함, 통계 페이지)
- [x] 시간 선택 UI 개선 - `type="time"` → `select` 드롭다운 (5분 단위)
- [x] 사진 업로드 캐시 문제 해결 - 타임스탬프 쿼리 파라미터 추가

### 4. 버그 수정
- [x] 사진 업로드 버킷 통일 (`member-photos`)
- [x] RLS 정책 오류 해결
- [x] `isTeamLeader` → `canWriteReport` 변수명 수정

### 5. 인프라
- [x] Git 저장소 설정 및 GitHub 연동
- [x] Cloudflare Tunnel로 임시 외부 접속 설정

---

## 기억해야 할 사항

### 계정 정보

| 구분 | 정보 |
|------|------|
| 테스트 계정 | `test@church.com` / `test1234` |
| 테스트 역할 | `super_admin` |
| GitHub 계정 | `onapond` |
| Supabase | `tlsdygks1992-dotcom` 계정으로 생성됨 (확인 필요) |

### 데이터베이스

| 테이블 | 용도 |
|--------|------|
| `users` | 사용자 (role, department_id 포함) |
| `departments` | 부서 (code는 enum) |
| `members` | 교인 명단 |
| `attendance_records` | 출결 기록 |
| `weekly_reports` | 주차 보고서 |
| `report_programs` | 보고서 진행순서 |
| `newcomers` | 새신자 명단 |
| `approval_history` | 결재 이력 |

### Storage 버킷

| 버킷명 | 용도 |
|--------|------|
| `member-photos` | 교인 사진 저장 (사용 중) |
| `photos` | 사용 안 함 (삭제 가능) |

### 역할 (user_role enum)

| 역할 | 코드 | 권한 |
|------|------|------|
| 슈퍼관리자 | `super_admin` | 모든 기능 |
| 회장 | `president` | 협조, 모든 부서 조회 |
| 부장 | `manager` | 결재 권한 |
| 목사 | `pastor` | 최종 확인 |
| 팀장 | `leader` | 보고서 작성 |
| 일반 | `member` | 자기 부서만 |

### 부서 (department_code enum)

- `CU` - CU 워십팀 (14명 등록됨)
- 기타 부서는 Supabase에서 확인

### 결재 흐름

```
팀장(제출/submitted)
  → 회장(협조/coordinator_reviewed)
  → 부장(결재/manager_approved)
  → 목사(확인/final_approved)
```

---

## 현재 상태

### 작동 중
- 로컬 개발 서버: `npm run dev` (localhost:3000)
- Cloudflare Tunnel: 임시 URL (터널 재시작 시 변경됨)

### 제한 사항
- **로컬 의존**: 컴퓨터가 켜져 있어야만 접속 가능
- **URL 변경**: Cloudflare Tunnel URL은 재시작마다 변경됨

---

## 내일 해야 할 작업 (핵심: 웹 배포)

### 1단계: Vercel 배포 (최우선)

**목표**: 어디서든, 어떤 환경에서든 접속 가능한 영구 URL 확보

**방법 A: Vercel CLI**
```bash
npx vercel login
# 이메일로 로그인 후
npx vercel --prod
```

**방법 B: Vercel 웹 대시보드**
1. https://vercel.com 접속
2. GitHub 계정 `onapond`로 로그인
3. `church-management` 저장소 Import
4. 환경 변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

**환경 변수 값** (`.env.local`에서 복사):
```
NEXT_PUBLIC_SUPABASE_URL=https://zikneyjidzovvkmflibo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV
```

### 2단계: 도메인 설정 (선택)

Vercel 배포 후 기본 URL: `https://church-management-xxx.vercel.app`

커스텀 도메인이 필요하면 Vercel 대시보드에서 설정 가능

### 3단계: 배포 후 테스트

- [ ] 로그인 테스트
- [ ] 출결 관리 테스트
- [ ] 보고서 작성/제출 테스트
- [ ] 사진 업로드 테스트
- [ ] 모바일 접속 테스트

---

## 추후 개발 예정 (우선순위 순)

### 높음
- [ ] 프로덕션 배포 완료
- [ ] 실제 사용자 계정 생성 (강현숙, 신요한, 전홍균 등)
- [ ] 이메일 인증 설정 확인

### 중간
- [ ] 보고서 인쇄 기능 최종 검토
- [ ] 결재 알림 (이메일 또는 푸시)
- [ ] 출석 통계 리포트 PDF 내보내기

### 낮음
- [ ] QR 코드 출결 체크
- [ ] 푸시 알림
- [ ] 연간 출석 현황 대시보드

---

## 트러블슈팅 참고

### Vercel 로그인 안 될 때
1. 브라우저 시크릿 모드 시도
2. `npx vercel login` CLI 사용
3. 이메일 인증 방식 사용

### 사진 업로드 안 될 때
1. Supabase Storage → `member-photos` 버킷 확인
2. RLS 정책 확인 (INSERT, UPDATE, SELECT, DELETE)
3. 브라우저 캐시 강력 새로고침 (Ctrl+Shift+R)

### enum 값 추가 안 될 때
```sql
-- 1단계: enum에 값 추가
ALTER TYPE department_code ADD VALUE 'NEW_CODE';

-- 2단계: 별도 쿼리로 사용
INSERT INTO departments (name, code) VALUES ('새부서', 'NEW_CODE');
```

---

## 파일 구조 요약

```
C:/dev/church/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # 로그인
│   │   └── (dashboard)/
│   │       ├── dashboard/         # 대시보드
│   │       ├── attendance/        # 출결 관리
│   │       ├── reports/           # 보고서
│   │       ├── approvals/         # 결재함
│   │       ├── stats/             # 통계
│   │       └── members/           # 교인 명단
│   ├── components/
│   │   ├── layout/                # Sidebar, Header
│   │   ├── attendance/            # AttendanceGrid
│   │   ├── reports/               # ReportForm, ReportDetail
│   │   └── members/               # MemberForm, MemberList
│   └── lib/supabase/              # Supabase 클라이언트
├── docs/
│   ├── PROJECT_DOCUMENTATION.md   # 프로젝트 문서
│   └── SESSION_NOTES.md           # 이 파일
└── .env.local                     # 환경 변수 (git 제외)
```

---

## 다음 세션 시작 시

1. 이 문서 (`docs/SESSION_NOTES.md`) 읽기
2. `npm run dev`로 로컬 서버 시작
3. Vercel 배포 진행
4. 배포 완료 후 URL 이 문서에 기록

---

*마지막 업데이트: 2026-01-29*
