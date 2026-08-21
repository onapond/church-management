# 아키텍처 · 코드 품질 감사 (2026-08-21)

> 이 문서는 **읽기 전용 감사 결과**다. 이 감사에서 소스 코드는 수정하지 않았다.
> 실제 수정 작업은 `CURRENT_TASK.md`의 Phase 0(P0) 항목부터 시작한다.

- 대상 커밋: `b6bad47` (main)
- 소스 규모: `src/` 158개 파일, 약 26,990 LOC
- 방법: 9개 영역 병렬 감사 → 영역별 반박 검증(adversarial verify) → 중복 제거 및 우선순위화
- 검증 통과 지적사항: **169건** (P0 8 / P1 17 / P2 8 / P3 7로 통합 정리)
- 시각화 보고서: https://claude.ai/code/artifact/22532bab-104f-40a3-8416-e8ee56b959d3

---

## 0. 실행 검증 기록

감사 시점에 `node_modules`가 없어 감사 에이전트는 빌드 도구를 실행하지 못했다.
아래는 `npm ci` 후 **직접 실행한 실제 결과**다.

| 명령 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | 통과 (exit 0, 에러 0건) |
| `npm test` | 통과 — **168/168** (11개 파일) |
| `npm run lint` | 통과 (`--max-warnings=0`에서 경고 0건) |
| `npm run build` | **실패** — `/pending` prerender 중단 |

### build 실패에 대한 정확한 해석

코드 회귀가 아니다. `.env.local`이 없는 환경이라
`process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()`이 터진 것이다.

```
TypeError: Cannot read properties of undefined (reading 'trim')
Export encountered an error on /(auth)/pending/page: /pending, exiting the build.
```

다만 **실패 방식 자체가 발견**이다.

1. 환경변수 누락이 원인을 전혀 알 수 없는 `TypeError`로 나타난다.
2. 터지는 지점이 정적 prerender 중인 `/pending` 페이지다.
3. 세 Supabase factory(`client.ts` / `server.ts` / `middleware.ts`)의 `!` 단언을
   명시적 검증(누락 시 명확한 메시지)으로 바꾸면 원인이 즉시 드러난다.

`.env*`는 `.gitignore`에 등록되어 있고 커밋 이력에도 없다 — 이 부분은 문제없다.

### 문서 정정

- `CLAUDE.md` / `docs/`에 적힌 **"테스트 93개"는 실제 168개**다.

---

## 1. 종합 평가

한 명의 개발자가 실사용 중인 교회 업무 앱을 빠르게 만들어낸 결과물로서는 상당히 잘 만들어져 있다.
문제는 "보안 개념 부재"가 아니라 **"일관성 부재"**다.

### 실제로 잘 되어 있는 것

- **인증 계층 자체는 견고하다.** `@supabase/ssr` 쿠키 처리, 모든 서버 렌더에서 `getUser()` 호출,
  `login/page.tsx:12`와 `auth/callback/route.ts:10`의 오픈 리다이렉트 방어까지 정석대로 되어 있다.
- **RPC 보안 컨텍스트가 정확하다.** `save_report_bundle`이 `security invoker` + `set search_path = public`로
  선언되어 RLS가 RPC 내부에서도 적용된다. (직접 확인)
- **XSS 방어 개념이 있다.** 리치텍스트 렌더 경로는 전부 `DOMPurify.sanitize`를 통과하고
  (`ReportDetail.tsx:471-473, 505, 523-525`), `VisitationClient.tsx:154-176`은 인쇄 템플릿의 모든 값을
  `escapeHtml` 처리한다.
- **TypeScript 위생이 표면적으로 깨끗하다.** `: any` 0건, `as any` 0건, `@ts-ignore` 0건.
  (단 P2-1 참조 — 실제로는 검사되지 않고 있다.)
- **번들 분리가 제대로 되어 있다.** recharts / tiptap / xlsx 모두 `next/dynamic`으로 분리됨.
- **자식 행 비파괴적 교체 패턴**(`reportChildPersistence.ts:29`)은 정확한 판단이었다.
- **`npm run verify` 게이트가 이미 정의되어 있다** (`package.json:13`). 실행만 안 될 뿐이다.

### 핵심 구조적 약점

> **이 앱에는 서버 쓰기 경계가 없다.**
> 거의 모든 mutation이 브라우저 → PostgREST 직접 호출이고, 유일한 실제 방어선인 RLS가
> (a) 저장소에서 재현 불가능하며 (b) 여러 곳에서 `USING (true)` / `WITH CHECK (true)` / `else true`로
> 열려 있고 (c) UI 권한 술어(`src/lib/permissions.ts`)와 체계적으로 어긋난다.

`src/app/api/reports/save/route.ts`가 유일한 실질 서버 라우트인데, 그것이 감싸는 RPC조차
`grant`/`revoke`가 0건이라 PostgREST로 직접 호출 가능하다.
즉 **라우트의 권한 검사는 우회 가능하다.** 이 하나의 사실이 P0/P1 항목 대부분을 생성한다.

두 번째 약점은 **저장소가 프로덕션 상태를 기술하지 못한다는 것**이다.
7개 테이블에 `CREATE TABLE`이 없고, 마이그레이션 디렉터리가 2개이며 번호가 충돌하고,
`supabase db reset`으로 새 환경을 만들 수 없다.
재해 복구 불가 + 통합 테스트 불가 + 코드 리뷰로 RLS 검증 불가를 동시에 의미한다.

---

## 2. 근본 원인 (Root Causes)

### RC1. 서버 쓰기 경계 부재
브라우저가 anon key로 DB를 직접 호출하는 구조에서 `src/lib/permissions.ts`는 UI 힌트일 뿐이다.
그런데 개발은 계속 permissions.ts를 "권한 계층"으로 취급했고 RLS는 사후에 따라붙었다.

**증상:** 작성자 자가 최종승인 · 보고서 생성 시 부서/역할 검증 전무 · `approval_history`/`notifications` 위조 ·
교인 삭제 부분 파괴 · `/stats` 무방비 · 출결 쓰기 무제한 · RPC 직접 호출

### RC2. RLS가 3~4개의 상충하는 비-버전관리 소스에 존재
`supabase/rls-policies.sql`(수동 실행 스크립트, 602행 문법 오류로 중단), `supabase/schema.sql`,
`supabase/schema-complete.sql`, `supabase/migrations/001~019`, 루트 `migrations/001~007`이
같은 테이블에 서로 다른 정책을 정의한다.
Postgres permissive 정책은 OR 합성이므로 **가장 넓은 것이 이긴다.**

**증상:** `weekly_reports` SELECT 정책 4벌 공존 · `users` UPDATE 정책 2벌 · `report_photos_modify` 미생성 ·
018의 프라이버시 강화가 `approval_history`/Storage에서 새어나감 · 016의 `else true` 폴백

### RC3. 스키마가 저장소에 없음 (production-only schema)
`cells`, `member_departments`, `report_photos`, `department_photos`, `accounting_records`,
`expense_requests`, `expense_items` — 7개 테이블에 DDL이 없다.
`report_type` enum과 `get_my_role()` 함수도 없다.
CLAUDE.md 자체가 인정: *"remote migration history was not updated by the direct MCP SQL execution path."*

**증상:** `db reset` 불가 → 스테이징/재해복구/온보딩 불가 → RPC 통합 테스트 불가 →
타입 생성기 사용 불가 → `Database` 제네릭 미전달 → 모든 DB 접근이 `any`

### RC4. 관측 불가 + CI 부재 → 사후 패치 루프
`.github/` 없음, 에러 모니터링 0개, 3개 에러 바운더리가 전부 `NODE_ENV === 'development'` 가드.
`npm run verify`는 정의만 되어 있고 아무도 강제하지 않는다.

**증상:** 프로덕션 클라이언트 렌더 크래시 무음 · CLAUDE.md의 29개 Notes 섹션이 전부
"사용자 제보 → 사후 패치" 형태 · 168개 테스트가 커밋에 대해 실행되지 않음 ·
인코딩 손상이 프로덕션까지 도달

### RC5. 추출 없는 반복 — 모듈 경계가 강제되지 않음
`src/queries/`는 관례일 뿐 경계가 아니고(`createClient()` 직접 호출 32건),
`src/lib/permissions.ts`도 마찬가지로 admin 역할 배열이 5벌 인라인 존재한다.

**증상:** Storage 업로드 5벌(제한값 5MB vs 10MB) · `StatusBadge` 3벌 · `formatFileSize` 3벌 ·
`Department` 타입 11벌 · `ReportType` 유니온 9벌(1개는 `visitation` 누락) · 피드백 보드 2벌

### RC6. 인코딩 파이프라인 손상 (CP949 → UTF-8 오변환)
BOM 6개 파일, mojibake가 소스와 문서 양쪽에 존재.
`scripts/check-required-docs.mjs`는 파일 존재 여부만 확인한다.

**증상:** `/settings/cells` 페이지 전체가 깨진 글자로 배포됨 ·
`members/bulk-photos`/`members/[id]/edit` 헤더 손상 ·
CLAUDE.md 94줄 / PROJECT_CONTEXT.md 101줄 / TECHNICAL_SPEC.md 54줄 / README.md 21줄 판독 불가

---

## 3. P0 — 즉시 수정 (8건)

> 기준: 외부인 접근 가능 · 실제 개인정보 노출 · 되돌릴 수 없는 데이터 파괴 · 관리자 계정 탈취 가능

### P0-1. 자가 가입만으로 대시보드 진입 — 승인 게이트가 동작하지 않음 (S)
- **위치**: `supabase/migrations/001_add_user_approval.sql:15-24`, `src/app/(dashboard)/layout.tsx:33-37`,
  `src/components/users/UserManagement.tsx:54,68`
- **문제**: 가입 트리거는 `is_approved = FALSE, is_active = TRUE`로 행을 만든다.
  앱의 유일한 게이트는 `is_active`를 본다. `grep -rn is_approved src/` → **0건**.
  `is_approved`는 어디서도 읽히지 않는 죽은 컬럼이고, '승인 대기' 필터도 `!user.is_active`라
  신규 가입자는 목록에 뜨지도 않는다. 미들웨어는 `is_active` 검사를 명시적으로 제거했다.
- **영향**: 인터넷의 누구나 가입하면 즉시 `role='member', is_active=true` 계정을 얻고 대시보드에 진입한다.
  그 상태에서 `USING(true)` 정책들을 통해 전체 사용자 명단(이메일·전화·역할), 전체 출결기록,
  전체 심방기록, 전체 회의록·안건 PDF를 읽는다. 관리자는 침입을 인지할 수단이 없다.
- **수정**: `handle_new_user` 트리거의 `is_active`를 `FALSE`로, `users.is_active` 기본값도 `FALSE`로.
  `is_approved` 컬럼 제거.
- **선행 조치**: 프로덕션 계정 전수 조사 (§6 SQL 참조)

### P0-2. `/settings/cells` 페이지 전체가 깨진 한글로 배포 중 (S)
- **위치**: `src/components/settings/CellManager.tsx`(13곳),
  `src/app/(dashboard)/members/bulk-photos/page.tsx:27,29`,
  `src/app/(dashboard)/members/[id]/edit/page.tsx`
- **문제**: CP949 저장 파일이 UTF-8로 재해석된 상태. 죽은 코드가 아니다 —
  `settings/cells/page.tsx`가 렌더하고 `Sidebar.tsx`가 '셀 관리'로 링크한다.
  ```
  <h1>援먯씤 ?ъ쭊 ?쇨큵 ?낅줈??</h1>      → 교인 사진 일괄 업로드
  toast.error('? 異붽????ㅽ뙣?덉뒿?덈떎.')  → 셀 추가에 실패했습니다.
  ```
- **수정**: 세 파일의 한글 복원 후 UTF-8(BOM 없음) 저장.
  재발 방지로 `check-required-docs.mjs`에 mojibake 정규식 검사 추가,
  `.gitattributes`에 `*.ts text working-tree-encoding=UTF-8` 지정.

### P0-3. 심방기록(기도제목·심방내용) 전체가 모든 인증 사용자에게 공개 (S)
- **위치**: `supabase/rls-policies.sql:575-578`,
  `supabase/migrations/create_visitations.sql:43-46`, `004_add_visitation_report_fields.sql:2-7`
- **문제**: `FOR SELECT USING (true)`가 두 파일에 이중 존재.
  004가 추가한 `prayer_topics`(기도제목), `report_content`(심방 내용)가 그대로 포함된다.
  INSERT/UPDATE/DELETE는 제한되어 있어 **SELECT만 유독 열려 있는 비대칭**이다.
- **영향**: 가장 민감한 목회 데이터가 부서·역할 구분 없이 전 인증 사용자에게 노출.
  018이 "셀장 보고서에는 나눔·기도 내용이 담긴다"며 가시성을 좁힌 것과 정면 모순.
- **수정**: 018이 `weekly_reports`에 적용한 패턴 이식 —
  관리자 역할 OR `created_by = auth.uid()` OR 해당 부서 `is_team_leader`.
  `create_visitations.sql`의 중복 정책도 DROP.

### P0-4. 보고서 인쇄 경로의 저장형 XSS → 관리자 세션 탈취 (S)
- **위치**: `src/components/reports/ReportDetail.tsx:742, 745, 749`, `src/lib/utils.ts:91-102`
- **문제**: 세 `generate*PrintHTML` 함수에서 이스케이프 누락.
  같은 함수 안의 다른 값(`programRows`/`attendanceRows`/`newcomerRows`)은 전부 `escapeHtml()`을 거친다.
  ```
  <h3>논의사항</h3><pre>${pn.discussion_notes||''}</pre>   // :742
  <title>${ti}</title></head><body><h1>${ti}</h1>          // :745, :749
  ```
  `printHtmlInIframe` → `frameDoc.write(html)`로 **같은 오리진** iframe에 쓰인다.
  `<pre>` 안이어도 태그는 그대로 파싱된다.
- **영향**: 보고서 작성 권한이 있는 누구나(셀장 포함) `<img src=x onerror=…>`를 심고 제출.
  결재자가 인쇄 버튼을 누르면 프로덕션 오리진에서 실행된다.
  Supabase 세션은 `document.cookie`에 저장되며 httpOnly가 아니므로 **관리자 토큰이 탈취**된다.
  CSP도 없어 완화 장치가 없다.
- **수정**: 세 함수의 모든 보간부에 `escapeHtml()` 적용. 리치텍스트는 `DOMPurify.sanitize()` 통과 후 삽입.
  `printHtmlInIframe`은 `iframe.srcdoc` + `sandbox` 속성으로 전환.

### P0-5. 서비스워커가 인증된 REST 응답을 URL 키 공유 캐시에 저장 (S)
- **위치**: `public/sw.js:81-84, 91-95, 160-180`, `src/app/layout.tsx:63`
- **문제**: `*/auth/*`만 캐시 제외하고 그 외 모든 supabase GET은 `staleWhileRevalidate`로 들어간다.
  캐시 키는 URL뿐이고 JWT는 `Authorization` **헤더**로 전송된다.
  로그아웃 시 `caches.delete(API_CACHE)`를 호출하는 코드가 없다.
- **영향**: 공용 PC에서 부장 로그아웃 → 셀장 로그인 시 동일 REST URL에 대해
  **이전 사용자의 캐시된 응답**이 반환된다. RLS는 서버에서만 작동하고 캐시는 이를 우회한다.
  (엄밀히는 `Vary: Authorization` 부재가 전제이며 저장소로 확인 불가 —
  다만 **stale 데이터 표시**는 무조건 성립: 결재 직후에도 옛 상태가 보인다.)
- **수정**: `if (url.hostname.includes('supabase')) return`으로 전면 제외. 정적 자산 캐싱은 유지.

### P0-6. 교인 삭제가 부분 파괴 후 "성공"으로 보고 (M)
- **위치**: `src/queries/members.ts:55-72`, `src/components/members/MemberList.tsx:139-163`,
  `src/lib/permissions.ts:85-87`, `supabase/rls-policies.sql:152-172, 201-218`
- **문제**: (1) Storage 사진 `remove()` — 결과 미검사, (2) `member_departments` DELETE — 결과 미검사,
  (3) `members` DELETE — 에러만 검사.
  그런데 RLS에 **`members` DELETE 정책이 존재하지 않는다.**
  반면 `member_departments_modify_teamlead`는 `FOR ALL`이라 (2)는 팀장에게 성공한다.
  Postgres RLS로 0행 삭제는 `error: null`을 반환한다.
- **영향**: 팀장이 교인을 삭제하면 사진이 지워지고, 부서 연결이 지워지고, `members` 행은 남는다.
  낙관적 UI가 행을 제거한 뒤 `onError`가 발화하지 않아 롤백도 없다.
  `useMembers`가 `member_departments`를 통해 조회하므로
  **그 교인은 관리자를 포함한 모든 부서 뷰에서 영구히 사라진다.** UI로는 복구 불가.
- **수정**: 규칙 결정(팀장 삭제 허용 여부) 후 **순서 반전** —
  `members` DELETE를 `.select()`와 함께 먼저 실행해 실제 삭제를 확인한 뒤에만 나머지 정리.
  모든 statement의 `error` 검사.

### P0-7. meeting-pdfs Storage 정책의 `else true` (M)
- **위치**: `supabase/migrations/016_...:75, 109, 137, 158, 171`, `015_...:54, 86, 112, 144`, `008_...:69`
- **문제**: INSERT/UPDATE/DELETE 네 정책 모두
  `CASE when split_part(name,'/',1) = 'agenda' and <uuid regex> then (...) else true end` 형태.
  회의록 PDF 경로는 `{meetingId}/...`라 첫 세그먼트가 `agenda`가 아니므로 **항상 `else true`**로 떨어진다.
  게다가 DELETE 정책(:158)의 UUID 정규식은 그룹이 하나 빠져(하이픈 3개) agenda 경로까지 붕괴한다.
- **영향**: `role='member'` 활성 사용자가 **모든 회의록 PDF와 모든 부서 안건 PDF를 삭제**하거나
  임의 내용으로 덮어쓸 수 있다. 공식 회의록 위·변조 가능.
  테이블 계층은 제대로 제한되어 있어 **메타데이터는 지켜지고 실제 파일만 무방비**인 비대칭.
- **수정**: 020 마이그레이션에서 (a) :158 정규식을 5그룹으로 수정,
  (b) 네 정책의 `else` 분기를 `meetings` 조인(생성자 OR 관리자 OR 부서 팀장)으로 교체.

### P0-8. `report-photos` 버킷이 public — 018의 프라이버시 무력화 (M)
- **위치**: `supabase/migrations/019_...:10-21, 23-33`,
  `src/components/reports/hooks/useReportSubmit.ts:142-151`
- **문제**: 019가 버킷을 `public = true`로 만들고 `on conflict do update set public = true`로 강제 갱신한다
  (008이 meeting-pdfs를 `public=false`로 만드는 것과 대조적).
  바로 아래 SELECT 정책을 정의하지만 public 버킷의 `/storage/v1/object/public/...` 경로는
  RLS를 거치지 않으므로 **죽은 코드**다.
- **영향**: 셀장 보고서 첨부 사진이 **인증 없이 URL만으로 영구히 열람 가능**.
  URL이 유출되거나 퇴임한 팀장이 URL을 보관하면 접근이 계속된다.
  `member-photos`/`department-photos`도 동일하며(미성년자 프로필 사진 포함) 버킷 정의가 저장소에 없다.
- **수정**: 세 버킷 `public = false` 전환 + `createSignedUrl(path, ttl)`로 읽기(meeting-pdfs 패턴).
  `useReportSubmit`이 공개 URL 대신 상대 경로를 저장하도록 수정하고 기존 행은 마이그레이션으로 정규화.
  `next.config.ts`의 `remotePatterns`도 조정.

---

## 4. P1 — 이번 주기 수정 (17건)

| ID | 제목 | 규모 |
| --- | --- | --- |
| P1-1 | 결재 워크플로 우회 — 작성자가 스스로 `final_approved` 처리 가능 | M |
| P1-2 | `save_report_bundle` RPC 직접 호출 가능 — 라우트 검증 우회 | M |
| P1-3 | 집계 쿼리가 행 제한에 잘려 통계·이월잔액이 조용히 틀림 | M |
| P1-4 | `approval_history`/`notifications` 위조 + 감사 추적 유실 | M |
| P1-5 | 마이그레이션 체인 재생 불가 — 스키마가 프로덕션에만 존재 | L |
| P1-6 | CI 부재 + 프로덕션 에러 모니터링 0 | S |
| P1-7 | `is_team_leader`를 삭제한 뒤 읽어 팀장 권한 소실 | S |
| P1-8 | `/stats` 페이지에 권한 검사 전무 | S |
| P1-9 | 심방 모듈 토스트가 절대 렌더되지 않음 | S |
| P1-10 | 보고서/회의 삭제가 Storage 먼저 — 사진 영구 손실 | M |
| P1-11 | `week_number` 비-널 선언이 거짓 — 대시보드에 "제주" 렌더 | S |
| P1-12 | `permissions.ts` 우회 — 권한 판정이 컴포넌트에 인라인 복제 | M |
| P1-13 | `AttendanceGrid` 읽기 경로가 에러 무시 — 전원 결석 렌더 | M |
| P1-14 | `/reports/new?type=foo` 같은 URL이 페이지 크래시 | S |
| P1-15 | 쿼리 무효화 누락 — 부서 이동 후 출결 화면 5분간 stale | M |
| P1-16 | `MemberForm`의 delete-first 부서 링크 교체 | S |
| P1-17 | `xlsx` 0.18.5 취약 버전 + devDependency 오분류 | S |

### 상세

**P1-1** `supabase/rls-policies.sql:268-274` — 정책 주석은 "작성자 본인 (draft/rejected 상태)"이지만
실제 조건에 status가 없다. `BEFORE UPDATE` 트리거도 없고, 결재 단계 판정은 클라이언트 전용 함수이며
상태 전이는 브라우저가 직접 실행한다.
```sql
CREATE POLICY "reports_update_author" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
```
→ 콘솔에서 `update({ status:'final_approved', final_approver_id:'<목사 uuid>' })` 실행 시
모든 결재를 건너뛴 '최종승인' 보고서 생성 가능. `users_select USING(true)`라 uuid 확보도 쉽다.
**수정**: status 제약 추가 + `approve_report(report_id, action, comment)` SECURITY DEFINER RPC로 분리.

> **정정**: `/api/reports/save`를 통한 status 위조는 **불가능**하다.
> 라우트는 문자열 필드만 받고 서버에서 `buildReportData()`로 조립하며 거기서 `status`가 화이트리스트된다
> (`reportDataBuilder.ts:139`). 위조 경로는 PostgREST 직접 호출 하나뿐이다.

**P1-2** `006_save_report_bundle_rpc.sql:1-4, 43-45` — `security invoker`인데 `grant`/`revoke`가 0건이라
Postgres 기본 `EXECUTE TO PUBLIC`이 유효하다. 클라이언트 타입에도 노출(`database.ts:480`).
한편 라우트의 권한 프리플라이트는 전부 `if (managedReportId) { ... }` 안에 있어
**신규 생성 경로는 아무 검증도 하지 않는다**(`route.ts:47-97`). `canWriteReport`는 import조차 되지 않는다.
→ 부서 링크가 없는 `role='member'`가 임의 `department_id`로 `submitted` 보고서 생성 가능.
**수정**: RLS `reports_insert`의 `WITH CHECK`에 부서 소속 검사 추가(진짜 수정 지점) + 라우트 심층 방어.

**P1-3** `stats-queries.ts:91-95, 181-191`, `queries/accounting.ts:75-85`,
`AccountingClient.tsx:102-117`, `AccountingRecordForm.tsx:91-107`, `ExpenseRequestForm.tsx:150-165` —
`.limit()` 없이 `attendance_records` 전체를 긁어 JS에서 합산.
회계는 동일한 "전체 원장 → JS reduce" 코드가 **4벌** 존재.
PostgREST는 `max_rows` 초과 시 에러 없이 조용히 자른다.
→ 이월금이 잘리면 그 시점 이후 모든 `accounting_records.balance`가 잘못된 값으로 영구 저장.
**수정**: `department_attendance_stats()`, `department_balance_as_of()` SQL 함수로 집계를 Postgres에 내림.
> **주의**: `config.toml:18`의 `max_rows = 1000`은 **로컬 dev 설정**이다.
> Settings › API에서 프로덕션 실제 값을 먼저 확인할 것. 부서당 1000행은 2~4년치라 아직 임계점 미도달 가능성 높음.

**P1-4** `rls-policies.sql:306-316, 435-438`, `ReportDetail.tsx:307, 381-389`,
`notifications.ts:113-138`, `NotificationItem.tsx:21-23`, `public/sw.js:236-241` —
① `approval_history_insert`가 `report_id`/`to_status`/`comment` 무제약, UPDATE 정책 없음.
② `approval_history_select USING (true)` — 볼 수 없는 보고서의 반려 사유·결재 코멘트가 전원에게 노출.
③ `notifications_insert WITH CHECK (true)` + 클릭 시 `router.push(link)` 무검증
(로그인 페이지에는 동일 방어가 있는데 이 경로만 누락).
추가로 두 `approval_history` insert가 결과를 구조분해하지 않아 실패가 완전히 무음.
→ 인증된 누구나 목사 알림함에 피싱 링크를 심을 수 있다.
**즉시 가능한 저비용 수정**: `NotificationItem`과 `sw.js`에 링크 가드 적용.

**P1-5** 저장소에 `CREATE TABLE`이 없는 테이블 7개. 마이그레이션 디렉터리 2개 번호 충돌
(`006_photos_tables` vs `006_save_report_bundle_rpc`), 루트에 `003_` 접두사 3개.
`create_meetings.sql`이 `019_*` 뒤에 정렬되는데 `005`가 `meetings(id)`를 참조(의존성 역순) + UTF-8 BOM.
`rls-policies.sql:602`는 `CREATE POLICY` 줄이 통째로 누락된 문법 오류로 `DO $$` 블록에서 중단.
`schema-complete.sql`은 가드 없는 `DROP TABLE ... CASCADE` 11건으로 시작하며
`schema.sql`과 한 글자 차이 이름으로 나란히 있다.
**수정**: `supabase db dump --schema public`으로 baseline 추출 → 커밋 → CI에 `db reset` 추가.

**P1-6** `.github/` 없음. `"verify"`가 이미 정의되어 있지만 실행되지 않음.
세 에러 바운더리가 전부 `NODE_ENV === 'development'` 가드.
→ `next build`는 vitest를 돌리지 않으므로 테스트를 깨뜨린 커밋도 배포된다.
클라이언트 렌더 크래시는 프로덕션에서 완전히 무음.
> **완화 요인**: `next.config.ts`가 `ignoreBuildErrors`/`ignoreDuringBuilds`를 설정하지 않으므로
> `npm run build`는 타입 체크를 수행한다. 서버 에러도 Vercel 함수 로그에 남는다.
> 무음인 것은 **클라이언트 렌더 크래시**뿐이다.

**P1-7** `UserManagement.tsx:164-186` — 결정론적 버그.
```ts
await supabase.from('user_departments').delete().eq('user_id', userId)   // 전 행 삭제
const { data: existingDept } = await supabase
  .from('user_departments').select('is_team_leader')
  .eq('user_id', userId).maybeSingle()                                   // 삭제 후 읽음 → 항상 null
await supabase.from('user_departments').upsert({
  is_team_leader: existingDept?.is_team_leader || updateData.role === 'team_leader'
})
```
→ 관리자가 부장/회장의 부서를 수정하면 `is_team_leader`가 조용히 false가 되어
**결재 권한과 부서 보고서 열람 권한을 잃는다 — 성공 토스트와 함께.**
역방향으로는 `|| role === 'team_leader'` 폴백이 "일반 셀장 vs 부서 팀장" 계층을 무너뜨린다.
또한 다중 부서 사용자가 조용히 하나로 축소된다.

**P1-8** `stats/page.tsx:5-7`, `StatsClient.tsx` — `useAuth|role|isAdmin|permissions` grep **0건**.
`/stats`는 `adminNavigation`에만 나타나는 네비게이션 게이트일 뿐이다.
형제 화면들은 전부 컴포넌트 레벨 검사가 있다(`UsersClient:27`, `CellManager:94`, `ApprovalsClient:61`).
→ `role='member'` 포함 아무 활성 사용자가 URL 직접 입력으로 전체 통계 + Excel 내보내기 획득.
RLS도 막지 않는다(`attendance_select USING (true)`).

**P1-9** `VisitationClient.tsx:7,20`, `VisitationForm.tsx:8,20` —
`@/hooks/useToast`의 로컬 state 훅을 쓰는데 `<ToastContainer>`는 `ToastProvider.tsx:51` 한 곳뿐이고
별도 state를 쓴다. `addToast` 호출 8곳이 전부 no-op.
**수정**: `useToastContext()`로 교체. **import 2줄.**

**P1-10** `reportDeletion.ts:3-24`, `meetingDeletion.ts:3-24` — Storage 먼저, DB 나중.
019:94는 작성자에게 사진 삭제를 status 무관 허용하는 반면 `reports_delete_author`는 draft/rejected만 허용.
→ 상태가 캐시로 어긋난 순간 사진만 영구 삭제되고 보고서는 남으며 catch도 안 걸린다.
**수정**: 순서 반전 — DB row 먼저 삭제 + `.select()` 확인 후 Storage 정리.

**P1-11** `types/shared.ts:61`, `queries/reports.ts:17`, `dashboard.ts:81-92,113`,
`DashboardContent.tsx:250` — `week_number`가 DB에서 nullable인데 read model이 `number`로 선언.
→ 관리자 결재 대기 목록에서 비-weekly 보고서가 `부서명 - 제주`로 렌더(React가 null을 버림).
`ReportDetail.tsx:412`는 제대로 가드하고 있어 패턴은 이미 알려져 있었다.

**P1-12** admin 역할 배열 **5벌** 인라인 존재하며 서로 다름.
`DashboardContent.tsx:23-28`이 `adminRoles`에 `accountant`를 넣었는데 중앙 `isAdmin`은 2개뿐 →
accountant는 대시보드에서 버튼을 보고 목록에서는 못 본다.
`members/[id]/edit/page.tsx:41`과 `members/[id]/page.tsx:60`은 `team_leader`를 통과시키는데
중앙 `canEditMembers`는 `is_team_leader`를 요구 →
**일반 셀장이 동료 편집 폼을 열 수 있고**, 저장은 RLS가 막지만 0행 UPDATE는 `error: null`이라
**성공한 것처럼 보인 채 아무것도 안 써진다.**
추가로 `members/[id]/page.tsx`의 early return이 `setLoading(false)` 앞에 있어
RLS 거부 시 **스켈레톤 영구 고착**.

**P1-13** `AttendanceGrid.tsx:173, 189, 201, 225` — `loadData()`의 네 조회 전부가 `error`를
구조분해하지 않고 `|| []` 폴백. (쓰기 경로는 제대로 처리하는 것과 대조적.) 616줄, 테스트 0개.
→ 조회 실패 시 **모든 교인이 미출석으로 표시**되고, 팀장이 다시 체크하면 `upsert`가 기존 행을 덮어쓴다.
CLAUDE.md 2026-06-11의 CU1 출석 사고와 같은 계열.
**수정**: 하나라도 실패하면 명시적 오류 상태를 렌더하고 **편집 비활성화**.

**P1-14** `reports/new/page.tsx:62,85`, `ReportListClient.tsx:62,302-303` —
`(searchParams.get('type') as ReportType)` 후 `REPORT_TYPE_CONFIG[reportType].icon` 무가드 deref.
```ts
const REPORT_TYPES = ['weekly','meeting','education','cell_leader','project','visitation'] as const
export function toReportType(v: string | null, fallback: ReportType): ReportType {
  return (REPORT_TYPES as readonly string[]).includes(v ?? '') ? (v as ReportType) : fallback
}
```

**P1-15** `MemberForm.tsx:282`, `queries/members.ts:75`, `queries/attendance.ts:45` —
`['members']`만 무효화하고 `['attendance']`(staleTime 5분)/`['stats']`/`['dashboard']`는 미처리.
쿼리 키 팩토리가 없고 `invalidateQueries`가 66곳에 문자열 리터럴로 흩어져 있다.
**수정**: `src/queries/keys.ts` 타입 팩토리 + 엔티티별 fan-out 명시 선언.

**P1-16** `MemberForm.tsx:220-242` — `member_departments` 무조건 DELETE 후 INSERT.
프로젝트는 이미 정확한 패턴(`reportChildPersistence.ts:29-76`)을 만들어 뒀고
CLAUDE.md에도 *"avoid delete-first behavior in edit mode"*라고 기록했다 —
**그 수정이 이 call site에는 적용되지 않았다.**
→ 리더가 자기가 이끌지 않는 부서를 선택하면 DELETE는 성공하고 INSERT는 실패하여
교인이 부서 링크 0개가 되어 모든 목록·통계에서 사라진다.

**P1-17** `package.json:48` — `devDependencies`인데 런타임 클라이언트 코드 5곳이 사용.
브라우저에서 직접 `XLSX.read` 하며 크기 제한 없음.
npm의 xlsx는 0.18.5에서 멈춰 CVE-2023-30533(프로토타입 오염), CVE-2024-22363(ReDoS)이 남아 있다.
**수정**: `dependencies`로 이동 + SheetJS 공식 CDN 0.20.2+ 또는 `exceljs`로 교체 + 크기/매직바이트 검사.

---

## 5. P2 · P3 요약

### P2 — 계획된 리팩터링 (8건)

| ID | 제목 | 규모 | 선행 조건 |
| --- | --- | --- | --- |
| P2-1 | Supabase 클라이언트에 `Database` 제네릭 미전달 — 모든 DB 접근이 `any` | L | P1-5 |
| P2-2 | `save_report_bundle`(467줄)에 테스트 0개 + RPC 자체 결함 3건 | L | P1-5 |
| P2-3 | `src/queries/`가 경계가 아님 — 핵심 쓰기 경로 전부가 계층 밖 | L | — |
| P2-4 | 코드 중복 대청소 — Storage 5벌, StatusBadge 3벌, 타입 11벌 | L | — |
| P2-5 | 서버 컴포넌트 미활용 — 26개 페이지 중 17개가 pass-through `'use client'` | L | — |
| P2-6 | `noUncheckedIndexedAccess` 부재 + 도메인 유니온 미사용 | M | — |
| P2-7 | 인덱스 누락 + 페이지네이션 전무 + `select('*')` 목록 조회 | M | — |
| P2-8 | 대형 컴포넌트 분해 — ReportForm 1038 / MeetingAgendaBoard 806 / ReportDetail 773 | L | — |

**P2-1 핵심**: 세 factory가 타입 인자 없이 호출되어 기본값 `<Database = any>`가 적용된다.
**증거**: `queries/reports.ts:295,313,331`이 `types/database.ts`에 **존재하지 않는 세 테이블**을
아무 항의 없이 쿼리한다. `src/queries/**`의 ~60개 `data as X` 단언이 전부 `any`로부터의 단언이라
절대 에러를 내지 않는다. **표면적으로 깨끗한 타입 위생이 실제로는 검사되지 않고 있다.**

**P2-2 RPC 결함 3건**:
- **(a) 반려 사유 소실** — UPDATE가 결재 관련 12개 컬럼을 `jsonb_populate_record` 결과로 무조건 덮어쓰는데
  draft 저장 시 payload에 그 키들이 없어 NULL이 채워진다.
  `canManageReport`가 `rejected` 수정을 허용하므로
  **반려된 보고서를 열어 임시저장하면 `rejection_reason`이 조용히 지워진다.**
- **(b) 중복 감지가 RLS로 필터됨** — `security invoker`라 duplicate probe가 호출자 RLS를 탄다.
  018 이후 볼 수 없는 행을 놓친다. weekly는 UNIQUE 제약에 걸려 500(설계된 409 대신),
  cell_leader는 제약이 없어 **중복이 조용히 생성**된다.
- **(c) 관리자 편집이 결재 체인을 지움** — `withResubmissionReset`이 13개 컬럼을 null로 만들고
  `canManageReport`는 admin에게 status 무관 true를 반환한다.
  관리자가 `final_approved` 보고서를 편집 제출하면 결재 기록이
  **`approval_history` 흔적 없이** 사라지고 status가 `submitted`로 강등된다. 응답은 정상 200.

**P2-3 핵심**: `createClient()` 직접 호출 **32건**.
결재 승인·반려, 보고서 삭제, 회계 기록, 지출결의서, 사용자 역할·부서, 사진 업로드·삭제, 회의 피드백 —
의미 있는 mutation이 거의 전부 계층 밖.
`AttendanceGrid`가 가장 극단적: 부모가 TanStack으로 가져와 props로 내리는데
그리드가 `useState`로 복사한 뒤 마운트 즉시 동일 데이터를 재조회한다(2세트 왕복).
props→state 복사라 부모 갱신이 절대 반영되지 않는다. 훅 5개는 호출자 0건.

**P2-8 최우선 항목**: `ReportDetail.tsx:60-88`의 `checkApprovalPermission`이
앱에서 가장 위험한 로직인데 view 파일 안의 module-private 함수라
`permissions.test.ts`가 import조차 할 수 없다.
`src/lib/reports/approvalStages.ts`로 추출하고 단위 테스트를 붙이는 것이 이 항목의 최우선이다.
또한 **현재 `generateProjectPrintHTML`은 제목만 있는 페이지를 출력하는 실제 버그다.**

### P3 — 개선 제안 (7건)

- **P3-1 죽은 코드 제거 (~700줄, S)** — `ReportPrintView.tsx`(312줄, import 0건) ·
  `src/lib/errors.ts` 전체(import 0건인데 CLAUDE.md는 아키텍처로 문서화 중) ·
  `src/app/api/notifications/route.ts`(호출자 0건인데 **앱의 유일한 rate limit을 품고 있음**) ·
  죽은 훅 5개 · `canViewReport`의 `authorIsTeamLeader` 파라미터(`void`로 폐기되는데 테스트가 15회 넘김 —
  **허위 커버리지**) · `netlify.toml`·`@netlify/plugin-nextjs`(Vercel 배포인데 잔존)
- **P3-2 접근성 (L)** — 전체 `src/`에 `aria-*` 1건, `tabIndex` 0건, TSX `role=` 0건.
  출석 토글 버튼에 접근명·`aria-pressed` 없음. 사진 타일/달력 셀이 `<div onClick>`이라 키보드 도달 불가.
  모든 모달에 `role="dialog"`·Escape·포커스 트랩 없음.
- **P3-3 CSP + 보안 헤더 (M)** — CSP·`frame-ancestors`·`Permissions-Policy` 0건.
  Report-Only로 먼저 배포해 위반 수집 후 강제 전환.
- **P3-4 문서 인코딩 복구 + CLAUDE.md 구조 개편 (S)** — CLAUDE.md 299줄 중 54%가
  29개 append-only 날짜 섹션이고 5개가 같은 날 같은 경계를 다룬다.
  Notes를 `docs/CHANGELOG.md`로, 교인 데이터 조작 기록 3건은 `.claude/session-notes.md`로 이관.
  "테스트 93개" 하드코딩 제거(실제 168개).
- **P3-5 나머지 RLS 정리 (M)** — `department_photos` 정책 전무(`WITH CHECK (true)`) ·
  `attendance_select USING(true)` 축소 · `users_select USING(true)` 축소(현재 email·phone까지 전송) ·
  `users_update_self`에 `is_active` 고정 추가(**정지된 사용자가 스스로 복구 가능**) ·
  001의 `Admin can update users`(president 무제약 UPDATE) DROP ·
  `report_feedback` UPDATE·DELETE 정책 부재
- **P3-6 나머지 API 라우트 위생 (M)** — 4개 핸들러가 `request.json()`을 try/catch 없이 읽음 ·
  `push/subscribe` update 분기가 error를 버리고 200 반환 · DB 조회 실패를 403으로 반환(500이어야 함) ·
  500 응답이 Postgres 원문 그대로 전달.
  **중요**: `/api/push/send`는 RLS 스코프 클라이언트로 구독을 조회해 **본인 외에는 전달 자체가 안 되고**,
  `triggerPush`는 서버에서 `typeof window === 'undefined'`로 즉시 return하므로
  **보고서 제출 push는 무조건 드롭된다.**
  service-role 도입 시 `userIds` 검증과 endpoint URL 검증(SSRF)을 반드시 함께 넣을 것.
  rate limit은 인메모리 `Map`이라 서버리스에서 무의미하고 호출자 없는 라우트에만 걸려 있다.
- **P3-7 소소한 정확성 항목 (M)** — `useThisWeekReport` 쿼리 키에 `getThisSunday()` 누락 ·
  `PhotosClient`가 비동기 로드 전 state 초기화로 `/photos` 직접 진입 시 고착 ·
  `useReportForm`의 FileReader가 완료 순서로 append해 **인덱스 어긋남** ·
  `VisitationClient.tsx:322`의 `toISOString().slice(0,10)`이 UTC라
  **KST 00~09시에 '오늘' 강조가 하루 밀림**(`toLocalDateString` 유틸이 이미 있음) ·
  `canEditMeetingContent`의 `if (!departmentId) return true` fail-open ·
  `canCreateMeeting`이 role만 봐서 일반 셀장에게 버튼 노출 후 RLS가 조용히 거부 ·
  `BulkPhotoUpload` 언마운트 시 `createObjectURL` 미회수 ·
  **`layout.tsx:22`가 `.single()` error를 버려 조회 실패 시 `/pending` 게이트가 통째로 건너뛰어짐** ·
  PWA 업데이트 프롬프트가 실질 no-op(**구** 워커에 postMessage)

---

## 6. 저장소로 확인 불가 — 프로덕션에서 먼저 확인할 것

P0-1 · P0-8 · P1-3의 첫 단계는 **수정이 아니라 현재 상태 확인**이어야 한다.
실제 RLS 정책·버킷 설정·`max_rows` 값은 프로덕션에만 존재한다(RC3).

```sql
-- RLS 활성화 여부와 실제 정책 전수
select tablename, rowsecurity from pg_tables where schemaname='public';
select * from pg_policies where schemaname='public';

-- 버킷 public 여부 / 크기·MIME 제한
select id, public, allowed_mime_types, file_size_limit from storage.buckets;

-- P0-1: 승인 없이 들어온 계정 탐지
select id, email, role, is_active, created_at from users
 where is_active = true
   and id not in (select user_id from user_departments)
 order by created_at desc;
```

- Supabase 대시보드에서 **회원가입 활성화 여부**도 확인할 것.
  유지한다면 이메일 도메인 제한이나 초대코드 추가를 권한다.
- Settings › API에서 **`max_rows` 실제 값**을 확인할 것(P1-3).

---

## 7. 개선 로드맵

| Phase | 내용 | 비고 |
| --- | --- | --- |
| **0** | P0 8건 차단 | 이번 주. 상세는 `CURRENT_TASK.md` |
| **1** | P1-6 — CI(`npm run verify`) + Sentry | **다른 P1보다 먼저.** 이후 모든 수정의 회귀를 잡는다 |
| **2** | P1-1 · P1-2 · P1-4 + P3-5 — RLS 정합화 | ↓ 아래 필수 산출물 참조 |
| **3** | P1-5 — `supabase db dump` baseline 커밋 + CI `db reset` | P2-1/P2-2의 잠금을 푼다 |
| **4** | P2-1 · P2-2 — 타입 생성 + RPC 통합 테스트 | Phase 3 선행 필수 |
| **5** | P2-3 · P2-4 — 쿼리 계층 경계 강제 + 중복 통합 | 결재 → 회계 → 사용자·사진 순 |
| **6** | P2-5 · P2-7 · P2-8 — 성능·구조 | `checkApprovalPermission` 추출 최우선 |

### Phase 2의 필수 산출물

> `src/lib/permissions.ts`의 **각 술어와 대응 RLS 정책을 1:1로 매핑한 표**를
> `docs/TECHNICAL_SPEC.md`에 만들고 테스트로 강제할 것.
> 그것이 이 부류 버그(UI 권한과 RLS 불일치)의 재발을 막는 유일한 구조적 장치다.
