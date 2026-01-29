# 청파중앙교회 교육위원회 통합 관리 시스템

## 프로젝트 개요

청파중앙교회 교육위원회의 주차 보고서, 출결 관리, 결재 시스템을 통합 관리하는 웹 애플리케이션입니다.

### 기술 스택

- **Frontend**: Next.js 16 (App Router, Turbopack)
- **Backend**: Supabase (Database, Auth, Storage)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Tunnel (개발), Vercel (프로덕션 예정)

---

## 주요 기능

### 1. 인증 시스템
- Supabase Auth 기반 이메일/비밀번호 로그인
- 역할 기반 접근 제어 (RBAC)

### 2. 사용자 역할

| 역할 | 코드 | 권한 |
|------|------|------|
| 슈퍼관리자 | `super_admin` | 모든 기능 접근 |
| 회장 | `president` | 협조, 모든 부서 조회 |
| 부장 | `manager` | 결재 권한, 모든 부서 조회 |
| 목사 | `pastor` | 최종 확인, 모든 부서 조회 |
| 팀장 | `leader` | 보고서 작성, 자기 부서만 |
| 일반 | `member` | 자기 부서만 조회 |

### 3. 결재 흐름

```
팀장(제출) → 회장(협조) → 부장(결재) → 목사(확인)
```

- **submitted**: 제출됨 (회장 협조 대기)
- **coordinator_reviewed**: 회장 협조 완료 (부장 결재 대기)
- **manager_approved**: 부장 결재 완료 (목사 확인 대기)
- **final_approved**: 최종 승인 완료

---

## 페이지 구조

### 대시보드 (`/dashboard`)
- 역할별 결재 대기 보고서 표시
- 금주 출석 통계
- 빠른 작업 카드
- 최근 보고서 목록

### 출결 관리 (`/attendance`)
- 엑셀 스타일 출결표
- 부서/날짜별 필터링
- 예배/모임 출석 체크
- 실시간 통계 표시

### 주차 보고서 (`/reports`)
- 보고서 목록 조회
- 새 보고서 작성 (`/reports/new`)
- 보고서 상세 및 결재 (`/reports/[id]`)
- 인쇄 기능 (PDF 양식 일치)

### 결재함 (`/approvals`)
- 역할별 결재 대기 목록
- 대기중/처리완료 탭
- 통계 카드

### 통계 (`/stats`)
- 기간별 필터 (월간/분기/연간)
- 부서별 필터
- 주간 출석 추이 차트
- 부서별 출석 현황 테이블

### 교인 명단 (`/members`)
- 교인 목록 조회
- 새 교인 등록 (`/members/new`)
- 교인 상세 (`/members/[id]`)

### 안내 (`/guide`)
- 시스템 사용 안내

---

## 데이터베이스 스키마

### users (사용자)
```sql
- id: UUID (PK, auth.users 연결)
- email: VARCHAR
- name: VARCHAR
- role: user_role ENUM
- department_id: UUID (FK → departments)
- created_at: TIMESTAMP
```

### departments (부서)
```sql
- id: UUID (PK)
- name: VARCHAR
- code: VARCHAR (약어)
- created_at: TIMESTAMP
```

### members (교인)
```sql
- id: UUID (PK)
- name: VARCHAR
- phone: VARCHAR
- photo_url: VARCHAR
- department_id: UUID (FK → departments)
- is_active: BOOLEAN
- created_at: TIMESTAMP
```

### attendance_records (출결 기록)
```sql
- id: UUID (PK)
- member_id: UUID (FK → members)
- attendance_date: DATE
- attendance_type: VARCHAR ('worship' | 'meeting')
- is_present: BOOLEAN
- checked_via: VARCHAR ('manual' | 'qr' | 'face')
- created_at: TIMESTAMP
```

### weekly_reports (주차 보고서)
```sql
- id: UUID (PK)
- department_id: UUID (FK → departments)
- author_id: UUID (FK → users)
- report_date: DATE
- title: VARCHAR
- status: report_status ENUM
- coordinator_id: UUID (FK → users)
- manager_id: UUID (FK → users)
- final_approver_id: UUID (FK → users)
- discussion_notes: TEXT
- other_notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### report_programs (보고서 프로그램)
```sql
- id: UUID (PK)
- report_id: UUID (FK → weekly_reports)
- order_index: INTEGER
- time: VARCHAR
- duration: VARCHAR
- activity: VARCHAR
- assigned_person: VARCHAR
- notes: TEXT
```

### newcomers (새신자)
```sql
- id: UUID (PK)
- report_id: UUID (FK → weekly_reports)
- name: VARCHAR
- school: VARCHAR
- grade: VARCHAR
- contact: VARCHAR
- invited_by: VARCHAR
- notes: TEXT
```

### approval_history (결재 이력)
```sql
- id: UUID (PK)
- report_id: UUID (FK → weekly_reports)
- user_id: UUID (FK → users)
- action: VARCHAR
- comment: TEXT
- created_at: TIMESTAMP
```

---

## 설치 및 실행

### 환경 변수 설정

`.env.local` 파일 생성:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 개발 서버 실행

```bash
npm install
npm run dev
```

### 외부 접속 (Cloudflare Tunnel)

```bash
npx cloudflared tunnel --url http://localhost:3000
```

---

## 반응형 디자인

모든 페이지는 웹과 모바일에 최적화되어 있습니다:

- **모바일**: 세로 레이아웃, 터치 친화적 UI
- **태블릿**: 중간 레이아웃
- **데스크탑**: 가로 레이아웃, 테이블 뷰

---

## 인쇄 기능

보고서 상세 페이지에서 인쇄 버튼 클릭 시:
- 새 창에서 인쇄용 레이아웃 표시
- PDF 양식과 동일한 결재란 포함
- 브라우저 기본 인쇄 다이얼로그 사용

### 결재란 구조
```
┌────────┬────────────┬────────────┐
│  결재  │   작성자   │    부장    │
├────────┼────────────┼────────────┤
│        │   (서명)   │  강현숙    │
├────────┼────────────┼────────────┤
│  협조  │   신요한   │  전홍균    │
└────────┴────────────┴────────────┘
```

---

## Git 저장소

- **GitHub**: https://github.com/onapond/church-management

### 커밋 히스토리

```bash
git log --oneline
```

---

## 배포

### 현재: Cloudflare Tunnel (개발용)
- URL: 터널 실행 시 자동 생성
- 컴퓨터가 켜져 있어야 작동

### 예정: Vercel (프로덕션)
1. Vercel 계정 로그인
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포

---

## 테스트 계정

| 이메일 | 비밀번호 | 역할 |
|--------|----------|------|
| test@church.com | test1234 | super_admin |

---

## 향후 개발 예정

- [ ] QR 코드 출결 체크
- [ ] 푸시 알림
- [ ] 출석 통계 리포트 PDF 내보내기
- [ ] 연간 출석 현황 대시보드
- [ ] 교인 사진 업로드

---

## 문의

프로젝트 관련 문의사항은 GitHub Issues를 통해 등록해주세요.
