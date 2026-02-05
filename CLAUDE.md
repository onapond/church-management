# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 청파중앙교회 교육위원회 관리 시스템

## 프로젝트 개요
- **앱 이름**: 청파중앙교회 교육위원회 관리 시스템
- **기술 스택**: Next.js 16.1.6, Supabase, TypeScript, Tailwind CSS v4
- **배포**: Vercel (https://church-eight-delta.vercel.app)
- **GitHub**: https://github.com/onapond/church-management

## 시작 시 필수 확인 문서
**새 세션 시작 시 반드시 아래 파일들을 먼저 읽어주세요:**
1. `.claude/session-notes.md` - 최근 작업 내역 및 프로젝트 컨텍스트
2. `.claude/bugs.md` - 알려진 버그 및 해결 이력
3. `docs/REACT_BEST_PRACTICES.md` - React/Next.js 코드 작성 시 성능 최적화 가이드

## 기능 분석 문서
시스템의 구현된 기능과 구조에 대한 상세 문서는 `docs/status/` 폴더를 참조하세요:

| 문서 | 설명 |
|------|------|
| [README.md](docs/status/README.md) | 문서 목록 및 시스템 개요 |
| [01-system-overview.md](docs/status/01-system-overview.md) | 기술 스택, 배포 정보, 아키텍처 |
| [02-features.md](docs/status/02-features.md) | 페이지별 구현된 기능 목록 |
| [03-workflow.md](docs/status/03-workflow.md) | 결재/인증/알림 워크플로우, 권한 체계 |
| [04-database.md](docs/status/04-database.md) | 테이블 구조, ERD, Enum 값 |
| [05-components.md](docs/status/05-components.md) | 컴포넌트 구조 및 계층 |
| [06-api.md](docs/status/06-api.md) | Supabase 클라이언트, API, 유틸리티 |

## 컨텍스트 관리 규칙

### 세션 노트 작성 조건
**컨텍스트가 90% 이상 사용되기 전에** 반드시 다음을 수행:
1. `.claude/session-notes.md`에 작업 내역 요약 추가
2. 다음 세션에서 맥락을 이어갈 수 있도록 상세히 기록:
   - 완료된 작업
   - 진행 중인 작업 (중단된 부분 명시)
   - 다음에 해야 할 작업
   - 관련 파일 경로
   - 주요 결정사항 및 이유

### 세션 노트 형식
```markdown
## 작업 내역 (YYYY-MM-DD)

### 완료된 작업
1. [기능명] - 설명
   - 관련 파일: `src/...`

### 진행 중 / 미완료
- [작업명]: 현재 상태, 중단 지점

### 다음 작업
- [ ] 작업1
- [ ] 작업2

### 참고사항
- 중요한 결정사항이나 주의점
```

## 코드 작성 규칙

### React/Next.js 성능 최적화 가이드
**코드 작성 시 반드시 `docs/REACT_BEST_PRACTICES.md`를 참조하세요.**

이 가이드는 Vercel Engineering의 React 모범 사례를 기반으로 하며, 우선순위별로 8개 카테고리, 57개 규칙을 포함합니다:

| 우선순위 | 카테고리 | 영향도 | 주요 규칙 |
|----------|----------|--------|-----------|
| 1 | Waterfall 제거 | CRITICAL | `Promise.all()`, Suspense boundaries |
| 2 | 번들 사이즈 | CRITICAL | barrel import 금지, dynamic import |
| 3 | 서버사이드 | HIGH | `React.cache()`, parallel fetching |
| 4 | 클라이언트 | MEDIUM-HIGH | SWR dedup, passive listeners |
| 5 | 리렌더링 | MEDIUM | `memo`, 파생 상태, `useTransition` |
| 6 | 렌더링 | MEDIUM | `content-visibility`, JSX 호이스팅 |
| 7 | JavaScript | LOW-MEDIUM | Set/Map 사용, 조기 반환 |
| 8 | 고급 패턴 | LOW | `useLatest`, 일회성 초기화 |

**자주 적용해야 하는 규칙:**
- URL 상태는 `useEffect` 대신 파생 상태로 직접 계산
- 모달/팝업은 별도 `memo` 컴포넌트로 분리
- 이벤트 핸들러는 `useCallback`으로 메모이제이션
- 무거운 컴포넌트는 `next/dynamic`으로 동적 임포트

### 일반
- 한글 주석/메시지 사용 (한국 교회 시스템)
- TypeScript strict mode 준수
- 컴포넌트는 `'use client'` 또는 서버 컴포넌트로 명확히 구분

### 파일 구조
```
src/
├── app/
│   ├── (dashboard)/     # 인증 필요 페이지
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── reports/
│   │   ├── members/
│   │   └── ...
│   └── api/             # API 라우트
├── components/
│   ├── layout/          # Header, Sidebar
│   ├── reports/         # 보고서 관련
│   ├── members/         # 교인 관련
│   └── notifications/   # 알림 관련
├── lib/
│   ├── supabase/        # Supabase 클라이언트
│   └── ...
└── types/
    └── database.ts      # DB 타입 정의
```

### Supabase
- 서버: `import { createClient } from '@/lib/supabase/server'`
- 클라이언트: `import { createClient } from '@/lib/supabase/client'`
- 타입: `src/types/database.ts` 참조

### 스타일링
- Tailwind CSS v4 사용
- 반응형: `lg:` 프리픽스로 데스크톱 스타일 구분
- 모바일 우선 설계

## 배포 프로세스

### Vercel 배포 (현재 사용)
```bash
# 1. 코드 변경 후 커밋
git add .
git commit -m "커밋 메시지"
git push origin main

# 2. Vercel에 배포
npx vercel --prod
```

- **프로덕션 URL**: https://church-eight-delta.vercel.app
- **Vercel 대시보드**: https://vercel.com/onaponds-projects/church

### 참고
- GitHub 자동 배포 미연결 (수동 배포 필요)
- 이전 Netlify 배포는 무료 플랜 한도 초과로 중단됨

## 주요 테이블
- `users`: 사용자 (역할: super_admin, president, accountant, team_leader, member)
- `departments`: 부서 (ck, cu_worship, youth, cu1, cu2, leader)
- `members`: 교인 명단
- `weekly_reports`: 보고서 (weekly, meeting, education 유형)
- `attendance_records`: 출결 기록
- `notifications`: 알림
- `push_subscriptions`: 푸시 구독

## 자주 사용하는 명령어
```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 빌드
npm run lint         # ESLint 검사
npx tsc --noEmit     # 타입 체크
npx vercel --prod    # Vercel 프로덕션 배포
```

## 아키텍처

### 인증 흐름
- `src/middleware.ts` - 모든 요청에서 Supabase 세션 갱신
- `src/lib/supabase/middleware.ts` - 쿼키 기반 세션 관리
- `src/app/(dashboard)/layout.tsx` - 인증되지 않은 사용자 `/login`으로 리다이렉트

### 결재 워크플로우
보고서 상태 흐름: `draft` → `submitted` → `coordinator_reviewed` → `manager_approved` → `final_approved`
- 상태 변경 시 `approval_history` 테이블에 이력 저장
- `src/lib/notifications.ts` - 상태 변경에 따른 알림 수신자 매핑

### 다중 부서 지원
- 교인은 `member_departments` 조인 테이블을 통해 여러 부서 소속 가능
- `is_primary` 플래그로 주 소속 부서 표시
- 쿼리 시 `members` → `member_departments` → `departments` 조인 필요

### 성능 패턴
- Supabase 클라이언트: 싱글톤 패턴 사용 (`src/lib/supabase/client.ts`)
- Optimistic Updates: 삭제/읽음 처리 시 즉시 UI 반영 후 API 호출
- Recharts: 동적 임포트로 메인 번들에서 분리
- URL 상태: `searchParams`에서 파생 (useEffect 동기화 금지)
- 모달/팝업: `memo` 컴포넌트로 분리하여 부모 리렌더 방지
- 리스트 필터링: `useMemo`로 메모이제이션
- 이벤트 핸들러: `useCallback`으로 참조 안정화

**상세 가이드:** `docs/REACT_BEST_PRACTICES.md` 참조
