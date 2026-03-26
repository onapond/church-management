# ?�션 ?�트

## ?�업 ?�역 (2026-03-24, ?�션 21)

### ?�료???�업

1. [RLS ?�치 ?�용 ???�??출결 403 ?�결]
   - `attendance_modify_author` ?�책 Supabase???�용 (apply_migration)
   - 보고???�성??author_id)가 ?�신??보고??출결 기록 INSERT/UPDATE/DELETE 가??   - rls-patch-001.sql?� ?��? ?�용 ?�료 ?�태?�??(?�인)

2. [saveOrUpdateReport ?�립 ?�수 추출 ??Gap-1 ?�결]
   - `useReportSubmit.ts`??submit 콜백 ???�라???�???�정 로직(60�? 추출
   - `SaveOrUpdateResult` ?�별 ?�니???�?�으�?중복 감�? 결과 반환
   - createdReportId 롤백 로직 ?��?

3. [useReportForm ??추출 ??Phase 3 ?�료]
   - `hooks/useReportForm.ts` ?�규 ?�성 (513�?
   - 추출 ??��: ???�태 12�? ?�로그램/?�신???�로?�트/?�산/?�진 ?�태+?�들?? ?� 출결 ?�태+?�들?? 출결 ?�약 useEffect, ?�??초기??useEffect
   - `handleDepartmentChange`, `toggleAllSections` ?�들??추�?
   - `ReportForm.tsx`: 1,206�???**834�?* (-372�?
   - 빌드 ?? ?�스??126�??�과 ??
### ?�재 ?�태
- ReportForm.tsx: 834�?(목표 700줄에 근접, JSX 비중??커서 ???�상 줄이?�면 JSX 분리 ?�요)
- ?�스?? 126�??�과
- RLS: attendance_modify_author ?�용 ?�료

### ?�음 ?�업
- [ ] ReportForm JSX ?�션�?컴포?�트 분리 (?�택??Phase 4 ??weekly/cell_leader/project 별도 컴포?�트)
- [ ] ?�제 ?�??계정?�로 출결 ?�???�작 ?�인 (RLS 검�?

---

## ?�업 ?�역 (2026-03-24, ?�션 20)

### ?�료???�업

1. [코드 ?�질 개선 ??Critical 4�?+ Warning 5�??�정]
   - `dashboard.ts`: createClient() 모듈 ?�벨 ??queryFn ?��? ?�동 (?�증 컨텍?�트 ?�정)
   - `middleware.ts`: /visitations 보호 경로 추�?
   - `utils.ts`: formatDate/calculateAge UTC ?�싱 ??문자??split 방식?�로 ?�정
   - `ReportForm.tsx`: 죽�? 코드 3�??�거, 출결 ?�러 처리 복원
   - `login/page.tsx`: Supabase ?��? ?�러 메시지 ?�출 ?�거
   - `ReportForm.tsx`: sectionOrder 모듈 ?�벨 ?�수 ?�동, useEffect try-catch 추�?
   - `members/new/page.tsx`: UUID ?�식 검�?추�?
   - `ReportPrintView.tsx`: ParsedNotes ?�터?�이?? ?�드코딩 ?�름 ??constants, formatDate UTC ?�정
   - `constants.ts`: APPROVAL_SIGNATORIES 추�?

2. [ReportForm 리팩?�링 ??PDCA ?�료 (93%)]
   - Plan/Design 문서 ?�성
   - `utils/reportDataBuilder.ts`: buildReportData ?�수 ?�수 (139�?
   - `hooks/useReportSubmit.ts`: handleSubmit 418�???커스?� ???�임 (4�?
   - `utils/reportDataBuilder.test.ts`: ?�스??12�?추�?
   - ReportForm.tsx: 1,594�???1,206�?(-388�?
   - 빌드 ?? ?�스??126�??�과 ?? Match Rate 93% ??
### ?�음 ?�업
- [ ] Phase 3 ?�택?? useReportForm.ts ?�태 초기????추출 (목표 700�?
- [ ] saveOrUpdateReport ?�립 ?�수 추출 (Gap-1)
- [ ] RLS ?�치 ?�용 ?�인 (?�??권한 문제)

---

## ?�업 ?�역 (2026-03-14, ?�션 19)

### ?�료???�업

1. [Meeting Management Phase 1 구현]
   - `meetings` ?�이�?추�???migration ?�성
   - ?�의 목록, ?�성, ?�세 ?�이지 추�?
   - 부???�결 �?기본 권한(`super_admin`, `president`, `team_leader` ?�성 / ?�체 멤버 조회) 반영
   - ?�이?�바/모바???�비게이?�에 ?�의 메뉴 추�?
   - 기술 명세??�??�용???�내???�데?�트

### ?�인 ?�요
- Supabase??`supabase/migrations/create_meetings.sql` ?�제 ?�용 ?�요
- 결정?�항/Task/AI Summary??placeholder�?추�???
---

## ?�업 ?�역 (2026-03-03, ?�션 18)

### ?�료???�업

1. [?�?�보고서 출결 ?�???�류 ?�정]
   - **?�상**: ?�?�보고서 ?�????"출결?�?�중?�류가 발생?�습?�다" ?�업 �?콘솔 404 ?�러 발생.
   - **?�인**: `upsert` ?�출 ??`onConflict` ?�라미터???�표�?구분??문자??`member_id,attendance_date,attendance_type`)???�달?�으?? Supabase API(PostgREST)가 ?��? ?�제 ?�덱?��? 매칭?��? 못함.
   - **?�정**: `ReportForm.tsx`?�서 `onConflict` ?�션???�거?�여 Supabase가 ?�니???�약 조건???�동?�로 감�??�도�?개선.
   - **추�? 조치**: 출결 ?�???�패(403 ?? ?�에??보고???�체???�?�되?�록 `toast.warning`?�로 ?�외 처리 강화.

2. [주차 계산 중복 ?�류 ?�결]
   - **?�상**: 3/1(9주차) 보고???�성 ??2/15 보고?��? 주차가 겹친?�는 중복 ?�류 발생.
   - **?�인**: DB???�?�된 2/15 보고?��? 과거 로직 ?�류�??�해 9주차�?기입?�어 ?�었??(?�제??7주차).
   - **?�결**: SQL 쿼리�??�해 2026??모든 주차 보고?�의 `week_number`�?`report_date` 기�??�로 ?�수 ?�계??�?보정 ?�료.
   - **결과**: ?�늘 ?�짜??9주차 보고???�상 ?�성 가???�인.

3. [권한(RLS) 문제 진단 �??�치 ?�안]
   - **진단**: ?�정 ?�?�의 권한 부�?403)?� ?�?�과 ?�?�의 부???�이??불일�??�문??가?�성 ?�음.
   - **?�안**: 보고???�성??`author_id`)가 ?�당 보고?�에 ?�결??출결 기록??관리할 ???�도�??�는 RLS ?�치 SQL ?�성 �?공유.

### 배포 �?빌드
- `npm run build`: ?�공
- `npx vercel --prod`: ?�로?�션 배포 ?�료 (Aliased: https://church-eight-delta.vercel.app)

### ?�음 ?�업
- [ ] ?�정 ?�???�??RLS ?�치 ?�용 ???�스???�인
- [ ] ReportForm 컴포?�트 분할 리팩?�링 (1500+ lines)

---

## ?�업 ?�역 (2026-02-28, ?�션 17)
... (?�하 기존 ?�용 ?��?)

## 2026-03-15 Session Update
- Implemented Meeting Management Phase 2 UI and query flow for structured meeting minutes.
- Added local migration file: \\supabase/migrations/005_create_meeting_minutes.sql\\.
- Verified through Supabase MCP that remote \\meetings\\ and \\meeting_minutes\\ tables exist with RLS enabled and expected policies.
- Important: remote \\list_migrations\\ still does not show these changes because direct MCP SQL execution was required after \\pply_migration\\ stalled over HTTP.
- Restored \\canViewReport\\ to the previous department-based behavior and aligned meeting edit permission with department-scoped RLS.
- Verification now passes locally: \\npm test\\, \\npm run build\\, and \\tsc --noEmit\\ (after build generates \\ .next/types \\).
- Streamlined the meeting create UX so the initial save can include structured minutes, removing the extra save step after entering the detail page.

---

## 2026-03-26 Handoff

### Scope handled in this stage
- Investigated the high-priority report issue: users reported that a report could appear to disappear while writing or submitting.
- Focused only on report save stability and draft recovery.
- Did not touch attendance/report/accounting permission models or RLS rules.

### Confirmed root cause
- In `src/components/reports/hooks/useReportSubmit.ts`, a newly created `weekly_reports` row could be deleted in the catch path if a later step failed.
- That means the base report record was created first, then a later failure in programs/newcomers/project items/attendance/photo handling could make the UI look like the whole report vanished.

### Implemented in this stage
- Prevented the "new report gets deleted on later failure" behavior in the report submit flow.
- Added local draft backup restore in `src/components/reports/ReportForm.tsx`.
- Added draft autosave status UI in `src/components/reports/ReportForm.tsx`.
- Added draft autosave snapshot saving through `useReportSubmit`.
- Extended `useReportForm` so `ReportForm` can restore local draft state safely.

### Files touched
- `src/components/reports/ReportForm.tsx`
- `src/components/reports/hooks/useReportForm.ts`
- `src/components/reports/hooks/useReportSubmit.ts`
- `src/components/reports/utils/reportDataBuilder.ts`

### Current behavior after this stage
- Local backup:
  - Form state is saved to browser local storage.
  - On re-entry, the backup is restored automatically.
- Autosave:
  - Draft autosave is enabled.
  - Autosave only targets draft flow.
  - Submit is still explicit button-driven.
- Failure handling:
  - If a new base report was already created and a later step fails, the flow now keeps the base record instead of removing it and routes recovery through edit flow.

### Verified
- `npm test` passed: 126 tests
- `npm run build` passed

### Known remaining risks
- Edit flow is still not fully atomic.
- Existing report edit still uses delete-then-insert for child tables:
  - `report_programs`
  - `newcomers`
  - `project_content_items`
  - `project_schedule_items`
  - `project_budget_items`
- If edit save fails mid-flight, the parent report can remain while some child rows are partially replaced or cleared.
- Photo files are not part of local backup restore.
- Autosave currently centers on the base draft record; child-table persistence still needs a safer next-stage design.

### Required next stage
1. Refactor edit save path to avoid destructive child-table replacement before successful new data persistence.
2. Make report save more transaction-like, ideally via server-side orchestration or RPC.
3. Decide autosave coverage for child tables and attendance linkage explicitly.
4. Add focused tests for:
   - new draft autosave creation
   - local backup restore
   - partial failure after base report creation
   - edit-flow child data preservation on failure

### Notes for next agent
- The worktree is still generally dirty; review `git status` carefully before commit.
- `CURRENT_TASK.md` is currently not in the expected AGENTS.md state; there is a `CURRENT TASK.md` file in the root.
- Build warning about Next.js `middleware` -> `proxy` deprecation remains and was not addressed in this stage.

## 2026-03-26 Follow-up

### Completed in this stage
- Reworked report edit child-table persistence to avoid delete-first replacement in edit mode.
- Added `replaceChildRows` utility to preserve existing rows until replacement insert/update succeeds.
- Wired edit save for `report_programs`, `newcomers`, `project_content_items`, `project_schedule_items`, and `project_budget_items` to use the safer replacement sequence.
- Preserved existing child row `id` values through report form state so retained rows can be updated instead of recreated blindly.
- Added focused tests for child-row replacement sequencing and failure behavior.
- Moved report core DB persistence behind `POST /api/reports/save` so create/edit/autosave now share a server orchestration path with existing auth cookies and RLS.

### Verified
- `npm test` passed: 129 tests
- `npm run build` passed
- `npx tsc --noEmit` passed

### Remaining risks
- Report save is still not fully transactional; insert/update/delete steps can still partially apply, but destructive child-data loss risk is reduced because delete now happens last.
- Attendance edit flow still has its own delete/rewrite path and was not changed in this stage.
- Photo upload remains best-effort and outside transactional recovery.

## 2026-03-26 Handoff - Server Report Save Orchestration

### Scope handled in this stage
- Moved core report DB persistence behind `POST /api/reports/save`.
- Kept the change additive: attendance/report/accounting approval flows, auth, and RLS were not redesigned.
- Left photo upload as a separate client-side best-effort step after the base report save succeeds.

### What changed
- Added server route: `src/app/api/reports/save/route.ts`
- Added shared server-side persistence orchestration: `src/components/reports/utils/reportPersistence.ts`
- Added request/response payload types: `src/components/reports/utils/reportSavePayload.ts`
- Refactored `src/components/reports/hooks/useReportSubmit.ts` so the client now:
  - calls `/api/reports/save` for create/edit/autosave DB persistence
  - uploads photos afterward
  - preserves duplicate handling and partial-save recovery routing
- Kept the safer child-row replacement logic from the previous stage via:
  - `src/components/reports/utils/reportChildPersistence.ts`
  - `src/components/reports/utils/reportChildPersistence.test.ts`

### Current behavior
- Draft autosave and explicit submit now share the same server save path for report base row and child rows.
- Edit saves no longer use client-only direct Supabase write orchestration for the core DB bundle.
- Child tables still use non-destructive replacement order:
  - insert new rows
  - update retained rows
  - delete removed rows last
- Photo upload is still outside the server save transaction boundary.

### Verified
- `npm test` passed: 129 tests
- `npm run build` passed
- `npx tsc --noEmit` passed

### Confirmed remaining risks
- This is server-side orchestration, but not yet a DB transaction or RPC-backed atomic save.
- `attendance_records` still has its own delete/rewrite pattern and has not yet been moved to the same non-destructive replacement approach.
- Photo upload and `report_photos` insert are still best-effort and can diverge from the report save result.
- The Next.js warning about `middleware` -> `proxy` remains unrelated and unresolved.

### Required next section
1. Move from API orchestration to a real transactional DB path if feasible:
   - Supabase RPC / SQL function preferred
   - keep existing RLS/auth posture intact
2. Decide whether attendance should be folded into the same transactional unit or handled by a second hardened phase.
3. Define failure semantics for photos:
   - leave as best-effort
   - or move metadata/file coordination into a more explicit recovery flow
4. Add focused tests for the new server save route:
   - duplicate response
   - edit save happy path
   - partial attendance warning path
   - autosave target update path

### Recommended first step next section
- Inspect whether Supabase SQL/RPC can safely replace the API-level orchestration for:
  - `weekly_reports`
  - `report_programs`
  - `newcomers`
  - `project_content_items`
  - `project_schedule_items`
  - `project_budget_items`
- If full transaction coverage is not realistic immediately, harden `attendance_records` next using the same replace-last approach.

## 2026-03-26 Handoff - Transactional Report Save RPC

### Completed in this stage
- Added migration `supabase/migrations/006_save_report_bundle_rpc.sql` with `public.save_report_bundle(payload jsonb)`.
- Reworked `src/components/reports/utils/reportPersistence.ts` so report save now:
  - normalizes report payload in server TypeScript
  - calls Supabase RPC for core DB persistence
  - keeps notification creation in app code after successful save
- Folded `cell_leader` attendance persistence into the RPC path while keeping warning-based handling for attendance-only failures.
- Added focused unit tests in `src/components/reports/utils/reportPersistence.test.ts` for:
  - duplicate response handling
  - edit save happy path
  - partial attendance warning propagation
  - autosave target update path
- Updated `src/types/database.ts` and report save payload typing for the new RPC contract.

### Verified
- `npx tsc --noEmit` passed
- `npm run build` passed
- `npm test` passed: 133 tests
- Remote Supabase apply/verify passed:
  - applied `supabase/migrations/006_save_report_bundle_rpc.sql`
  - verified `public.save_report_bundle` exists in `information_schema.routines`

### Remaining risks
- The route still performs preflight edit-permission validation outside the RPC; DB writes are transactional, but permission validation is not fully consolidated in SQL.
- Photo upload remains outside the RPC transaction boundary.
- The Next.js `middleware` -> `proxy` deprecation warning is still unrelated and unresolved.

### Required next stage
1. Confirm the RPC behaves correctly against real remote RLS policies, especially for:
   - draft autosave updates
   - edit saves by author/admin
   - cell leader attendance warning path
2. Decide whether route-level edit permission validation should stay duplicated or be enforced inside SQL as well.
3. Evaluate whether photo metadata/file coordination should move into a stronger recovery flow.

## 2026-03-26 Handoff - Report Save RPC Applied

### What was completed
- Report save core persistence now uses `public.save_report_bundle(payload jsonb)` through `POST /api/reports/save`.
- Local code changes completed for:
  - RPC-backed report persistence
  - typed RPC payload support
  - focused persistence tests
  - related docs/context updates
- Remote Supabase apply completed for:
  - `supabase/migrations/006_save_report_bundle_rpc.sql`
- Remote verification completed:
  - confirmed `public.save_report_bundle` exists in `information_schema.routines`

### Files changed in this stage
- `src/components/reports/utils/reportPersistence.ts`
- `src/components/reports/utils/reportPersistence.test.ts`
- `src/components/reports/utils/reportSavePayload.ts`
- `src/types/database.ts`
- `supabase/migrations/006_save_report_bundle_rpc.sql`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`
- `docs/TECHNICAL_SPEC.md`
- `docs/USER_GUIDE.md`
- `.claude/session-notes.md`

### Verified in this stage
- `npm run build` passed
- `npx tsc --noEmit` passed
- `npm test` passed: 133 tests
- Remote function verification passed for `public.save_report_bundle`

### Important implementation notes
- Route-level edit permission check still happens in `src/app/api/reports/save/route.ts` before RPC execution.
- Server-side request normalization still happens in TypeScript; DB writes are grouped in the RPC.
- Attendance failure semantics are intentionally softer than core report persistence:
  - report bundle save remains successful
  - RPC returns warning: `Attendance records were not fully saved.`
- Photo upload is still outside the RPC transaction boundary.

### Current risks / open questions
- Real remote RLS behavior has not yet been validated end-to-end through actual authenticated app save flows after RPC deployment.
- Permission logic is split:
  - route preflight validation
  - RLS / DB execution
- The migration was applied by direct management SQL execution, so migration history synchronization may still need manual confirmation depending on the team workflow.

### Recommended next step
1. Test real save flows against the deployed DB function:
   - draft autosave update
   - edit save by report author
   - edit save by admin role
   - `cell_leader` save with attendance warning path
2. Decide whether permission enforcement should also move into SQL/RPC for stronger consistency.
3. Evaluate whether photo persistence needs a recovery or compensation path.

## 2026-03-26 Follow-up - Report Save Permission Consistency

### Completed in this stage
- Added `canManageReport` in `src/lib/permissions.ts` so route-level and client-side report edit checks share the same status/author/admin logic.
- Fixed report edit client preflight to use the real report `status` instead of treating every edit as `draft`.
- Added route-level tests for `POST /api/reports/save` covering:
  - 401 unauthenticated
  - 400 missing required fields
  - 403 forbidden edit
  - 200 allowed draft edit by author
  - 409 duplicate response
- Hardened RPC response parsing so `save_report_bundle` success responses without `reportId` now fail loudly.
- Added/updated focused permission and persistence tests.

### Verified
- `npx tsc --noEmit` passed
- `npm test` passed: 141 tests
- `npm run build` passed

### Notes
- This stage did not change attendance, accounting, approval workflow, auth model, or RLS policy intent.
- Remaining unrelated warning persists: Next.js `middleware` -> `proxy` deprecation.

## 2026-03-26 Architecture Handoff - Report Save Stabilization

### Why this handoff exists
- The report save area has started showing a structural pattern where fixing one issue exposes a neighboring issue.
- This is not just a single bug problem; it is a boundary/ownership problem across UI state, client submit flow, route validation, RPC persistence, and post-save side effects.
- Next work should not continue as isolated point fixes. It should proceed as a constrained architecture-hardening pass with explicit boundaries and regression tests.

### Current architecture snapshot

#### Save flow layers
1. Form/UI state:
   - `src/components/reports/ReportForm.tsx`
   - `src/components/reports/hooks/useReportForm.ts`
2. Client submit/autosave flow:
   - `src/components/reports/hooks/useReportSubmit.ts`
3. Server auth + preflight validation:
   - `src/app/api/reports/save/route.ts`
4. Server-side request normalization + RPC call:
   - `src/components/reports/utils/reportPersistence.ts`
5. DB transaction boundary:
   - `public.save_report_bundle(payload jsonb)` via `supabase/migrations/006_save_report_bundle_rpc.sql`
6. Side effects outside the DB transaction:
   - approval notification creation
   - photo upload to storage
   - `report_photos` metadata insert
7. Client-side resilience helpers:
   - local backup restore
   - draft autosave

#### What is already hardened
- Core report + child-table writes now go through the RPC transaction path.
- Edit path no longer clears key child rows up front before replacement succeeds.
- Route-level tests exist for `POST /api/reports/save` basic auth/validation/duplicate/edit cases.
- Permission logic is partially unified through `canManageReport`.
- RPC response parsing now fails loudly when success data is malformed and missing `reportId`.

### The structural problem

#### The main issue
- Report save responsibilities are still split across too many layers.
- Each layer currently knows a little too much about permission, failure semantics, and recovery behavior.
- That makes local fixes fragile: a correction at the route, client hook, or RPC adapter often leaves the neighboring layer inconsistent.

#### Specific sources of fragility
1. Permission checks are distributed:
   - client preflight
   - route preflight
   - DB/RLS/RPC behavior
2. Save semantics are split:
   - report bundle = RPC transaction
   - attendance = warning-tolerant inside RPC
   - photos = post-save best-effort outside transaction
   - local backup/autosave = separate browser-level recovery path
3. `ReportForm` still carries broad orchestration knowledge:
   - autosave timing
   - local backup lifecycle
   - submit mode differences
   - duplicate/recovery UI behavior
4. Failure handling is not centrally modeled:
   - duplicate
   - forbidden
   - warning-only attendance failure
   - photo failure
   - malformed route/RPC response
   - local autosave failure

### Confirmed current risks

#### 1. `targetReportId` autosave route validation gap
- `src/app/api/reports/save/route.ts` currently validates edit permission only when `body.editReportId` is present.
- Draft autosave updates use `targetReportId`, not `editReportId`.
- That means autosave update requests can bypass route-level preflight and rely only on deeper layers.
- If the DB function ever runs with broader privilege assumptions than intended, this becomes a security-sensitive gap.
- This is the highest-priority next fix.

#### 2. Client preflight can false-negative
- `src/components/reports/hooks/useReportSubmit.ts` still performs a client-side role lookup before edit submit.
- If the `users` fetch fails transiently or returns no role, the client can block a valid save before the server decides.
- This is not a security hole, but it is a reliability/UX bug source.
- Client preflight should be treated only as optional UX assistance, not as a strong gate.

#### 3. Photos remain outside transaction/recovery boundary
- Report bundle success does not guarantee photo success.
- Possible split states:
  - report saved, file upload failed
  - file uploaded, `report_photos` insert failed
  - some photos uploaded, others not
- This is acceptable only if the UI and docs clearly frame photos as best-effort.
- If not, a recovery/compensation design is needed later.

#### 4. Autosave and explicit submit can compete
- Draft autosave and explicit submit share the same route but are still independent client triggers.
- Risk cases:
  - autosave request lands just before explicit submit
  - stale `draftReportId` is reused
  - duplicate success/warning toasts
  - navigation timing collisions
- This needs at least lightweight client-side serialization or ?�submit pauses autosave??behavior.

#### 5. Route/API response parsing is still optimistic
- `saveReportViaApi` assumes JSON response parsing succeeds.
- If an upstream server error ever returns a non-JSON body, the client falls into generic error handling after `response.json()` fails.
- This should be hardened with a safer parse path and a fallback message.

#### 6. Permission model is still not fully documented as a single source of truth
- The practical rule today is split between:
  - `src/lib/permissions.ts`
  - route preflight
  - RPC/RLS behavior
- This is manageable for now, but future fixes will keep drifting unless the intended boundary is documented explicitly.

### Architecture interpretation

#### Current intended boundary, as implemented today
- Route layer:
  - auth check
  - coarse permission preflight
  - request shape sanity check
- Persistence layer:
  - request normalization
  - RPC invocation
  - notification trigger after success
- DB/RPC:
  - transactional save for core bundle
  - warning-tolerant attendance semantics
- Client:
  - form state
  - autosave/local backup
  - user messaging
  - photo upload follow-up

#### Where this boundary is weak
- `targetReportId` permission path is not aligned with `editReportId`.
- Client preflight still overlaps with route authority too much.
- Photos are operationally part of ?�save??from the user perspective, but technically not part of the transactional unit.

### Required next section approach

#### Goal
- Do not continue with ad hoc bug-by-bug fixes.
- Do a bounded stabilization pass for the report save boundary.
- Keep the change additive and avoid touching attendance/accounting/approval architecture beyond the save edge.

#### Guardrails
- Do not redesign the approval state machine.
- Do not redesign attendance screen flow.
- Do not redesign accounting.
- Do not bypass RLS.
- Do not move to a broad refactor of unrelated report UI sections.
- Keep the work focused on save boundary consistency and recovery semantics.

### Recommended execution plan for the next section

#### Phase 1. Permission boundary consistency
- Extend route validation so `targetReportId` draft autosave updates go through the same author/admin/status validation as `editReportId`.
- Reuse `canManageReport` rather than introducing parallel permission branches.
- Decide whether client preflight should:
  - be removed entirely for edit mode, or
  - degrade gracefully and defer to the server on lookup failure.
- Preferred direction: reduce client preflight authority and trust the route as the app-layer gate.

#### Phase 2. Failure semantics hardening
- Harden `saveReportViaApi` to survive non-JSON or malformed responses.
- Normalize client handling for:
  - duplicate
  - forbidden
  - validation error
  - server failure
  - attendance warning
- Keep success-with-warning distinct from hard failure.

#### Phase 3. Autosave collision control
- Prevent autosave from racing with explicit submit.
- Candidate solutions:
  - pause autosave while submit is in flight
  - ignore autosave results older than the latest submit intent
  - serialize draft save requests per form instance
- Keep this minimal; avoid introducing a broad queue system unless needed.

#### Phase 4. Photo follow-up clarity
- At minimum:
  - treat photo upload failure explicitly as best-effort in UI copy
  - avoid implying full atomic save when photos are involved
- Optional later phase:
  - stronger recovery flow for failed photo metadata/file coordination

#### Phase 5. Documentation sync
- Update technical docs to state the real save boundary:
  - report bundle transactional
  - attendance warning-tolerant
  - photos post-save best-effort
  - route handles auth/preflight
  - RPC handles core transaction

### Files most likely to be involved next
- `src/app/api/reports/save/route.ts`
- `src/app/api/reports/save/route.test.ts`
- `src/components/reports/hooks/useReportSubmit.ts`
- `src/components/reports/utils/reportPersistence.ts`
- `src/components/reports/utils/reportPersistence.test.ts`
- `src/lib/permissions.ts`
- `docs/TECHNICAL_SPEC.md`
- `.claude/session-notes.md`

### Verification requirements for the next section
- Focused tests:
  - autosave update with `targetReportId` allowed for valid draft author/admin
  - autosave update with `targetReportId` rejected for invalid user
  - malformed/non-JSON route response handling on client
  - no regression for duplicate response handling
  - no regression for attendance warning propagation
- Full verification:
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run build`

### What should not be forgotten
- `CURRENT TASK.md` / `CURRENT TASK.md` naming mismatch remains a repo hygiene issue.
- The Next.js `middleware` -> `proxy` deprecation warning is still unrelated and unresolved.
- The worktree is generally dirty; do not assume only report-save files are changed.

### Recommended first move in the next section
- Start with route-level `targetReportId` permission enforcement and the matching tests.
- That is the highest-signal fix because it closes a real boundary inconsistency without broadening scope.

## 2026-03-26 Follow-up - Report Save Boundary Hardening

### Completed in this stage
- Extended POST /api/reports/save preflight validation so draft autosave updates using targetReportId now pass through the same canManageReport rule as editReportId edits.
- Removed the blocking client-side report edit role lookup from useReportSubmit; the route remains the main app-layer permission gate.
- Hardened saveReportViaApi so non-JSON or malformed route responses become structured save errors instead of crashing response parsing assumptions.
- Added lightweight in-hook request serialization so draft autosave and explicit submit are less likely to race each other inside one form instance.
- Added focused tests for:
  - targetReportId forbidden autosave path
  - targetReportId allowed draft-author autosave path
  - non-JSON route response handling
  - malformed success payload handling

### Verified
- npm test passed: 146 tests
- npx tsc --noEmit passed
- npm run build passed

### Remaining notes
- Photo upload is still outside the report RPC transaction boundary.
- Next.js middleware -> proxy deprecation warning remains unrelated and unresolved.
- CURRENT TASK.md naming mismatch remains repo hygiene only.

## 2026-03-26 Deep Handoff - Next Section for Report Save Boundary

### Why this handoff matters
- The recent boundary-hardening pass improved the report save architecture, but a follow-up code review found 2 concrete risks that should be handled before calling the save boundary stable.
- These are not broad refactor items. They are tightly scoped boundary-consistency fixes.
- Next work should stay inside the report save edge and avoid unrelated UI or domain refactors.

### Confirmed findings from the review

#### Finding 1. Route/RPC target mismatch when both IDs are present
- Severity: High
- Current route logic uses:
  - `managedReportId = body.editReportId ?? body.targetReportId`
- Current RPC logic uses:
  - `target_report_id` first
  - `edit_report_id` second
- That means a malformed or hostile request containing both values can be validated against one report in the route layer but updated against another report in the RPC layer.
- This is a real boundary inconsistency because the app-layer permission check and the DB write target can diverge.

#### Exact code locations
- Route preflight: `src/app/api/reports/save/route.ts`
- RPC precedence: `supabase/migrations/006_save_report_bundle_rpc.sql`

#### Required fix direction
- The route must reject requests that provide both `editReportId` and `targetReportId` at the same time.
- Do not silently choose one.
- The app-layer contract should be explicit:
  - draft autosave update => `targetReportId` only
  - edit save => `editReportId` only
- Add route tests for:
  - both IDs present => 400
  - edit-only still allowed when valid
  - target-only still allowed when valid
- Optional hardening:
  - also add a defensive validation branch in the RPC path later, but the route fix is the immediate priority.

### Finding 2. False autosave error UI during explicit submit
- Severity: Medium
- Current behavior:
  - `ReportForm.tsx` schedules autosave with a timer.
  - If submit starts just before that timer fires, `saveDraftSnapshot()` returns `null` because `isSubmittingRef.current` is true.
  - `ReportForm.tsx` currently interprets any falsy autosave result as a real failure and sets `autosaveStatus = 'error'`.
- Result:
  - a valid explicit submit can still produce an "autosave failed" UI state shortly before navigation.
  - this is especially bad because users are already sensitive to report-save trust issues.

#### Exact code locations
- Autosave early return: `src/components/reports/hooks/useReportSubmit.ts`
- Autosave status handling: `src/components/reports/ReportForm.tsx`

#### Required fix direction
- Distinguish between:
  - real autosave failure
  - autosave skipped because explicit submit is in progress
- Preferred implementation options:
  1. return a richer autosave result from `saveDraftSnapshot`, for example:
     - `{ status: 'saved', reportId }`
     - `{ status: 'skipped' }`
     - `{ status: 'failed' }`
  2. or expose a dedicated `isSubmitInFlight` signal and make `ReportForm.tsx` avoid switching to `error` when autosave was intentionally skipped.
- The important rule is:
  - submit-related autosave suppression must not surface as save failure UI.
- Add focused tests for:
  - autosave skipped during submit does not produce error state
  - real autosave failure still produces error state

### Recommended execution order for the next section
1. Fix the dual-ID contract at the route layer.
2. Add route tests for dual-ID rejection.
3. Fix autosave skipped-vs-failed semantics between `useReportSubmit.ts` and `ReportForm.tsx`.
4. Add focused tests for autosave status behavior.
5. Run full verification.
6. Update docs/session notes only after the tests pass.

### Scope guardrails for the next section
- Do not redesign the report form.
- Do not redesign report RPC shape unless strictly necessary.
- Do not move photo upload into the transaction in this section.
- Do not change attendance, accounting, approval, or auth architecture.
- Do not broaden into unrelated cleanup just because nearby code is imperfect.

### Likely files for the next section
- `src/app/api/reports/save/route.ts`
- `src/app/api/reports/save/route.test.ts`
- `src/components/reports/hooks/useReportSubmit.ts`
- `src/components/reports/hooks/useReportSubmit.test.ts`
- `src/components/reports/ReportForm.tsx`
- `.claude/session-notes.md`

### Concrete acceptance criteria for the next section
- Requests with both `editReportId` and `targetReportId` are rejected before persistence.
- Valid autosave requests with only `targetReportId` still work.
- Valid edit requests with only `editReportId` still work.
- Explicit submit no longer causes false "autosave failed" UI state.
- Existing duplicate handling still works.
- Existing malformed/non-JSON response handling still works.
- Existing attendance warning behavior still works.

### Required verification commands for the next section
- Focused:
  - `npm test -- src/app/api/reports/save/route.test.ts src/components/reports/hooks/useReportSubmit.test.ts`
- Full:
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run build`

### Remaining risks after the next section even if these fixes land
- Photo upload and `report_photos` metadata insert are still outside the report RPC transaction boundary.
- Real remote authenticated end-to-end verification is still desirable for:
  - draft autosave update
  - author edit save
  - admin edit save
  - cell leader attendance warning path
  - photo follow-up failure behavior

### Recommended first line to remember when resuming
- Fix boundary consistency before adding more hardening: route validation target and actual persistence target must always be the same report.

## 2026-03-26 Follow-up - Narrow Report Save Boundary Fixes

### Completed in this stage
- Rejected POST /api/reports/save requests that provide both editReportId and targetReportId so route validation and RPC target cannot diverge.
- Added focused route coverage for the dual-id 400 path while preserving valid edit-only and target-only flows.
- Changed report draft autosave to return explicit saved / skipped / failed states from useReportSubmit.
- Updated ReportForm autosave UI handling so autosave skipped during explicit submit no longer shows a false failure state.

### Verified
- Focused tests passed: npm test -- src/app/api/reports/save/route.test.ts src/components/reports/hooks/useReportSubmit.test.ts
- npm test passed: 147 tests
- npx tsc --noEmit passed
- npm run build passed

### Scope notes
- Kept this as a narrow additive hardening pass inside the report save boundary only.
- No changes to attendance flow, accounting flow, approval state machine, auth model, or RLS intent.

## 2026-03-26 Follow-up - Middleware to Proxy Rename

### Completed in this stage
- Replaced the deprecated root Next.js entry src/middleware.ts with src/proxy.ts.
- Kept the actual auth/session logic unchanged by continuing to reuse src/lib/supabase/middleware.ts.

### Verified
- npm run build passed.
- The previous Next.js middleware -> proxy deprecation warning no longer appears in build output.

## 2026-03-26 Final Handoff

### Completed in the latest stages
- Hardened the report save boundary without broad refactoring.
- POST /api/reports/save now rejects requests that provide both editReportId and targetReportId.
- Draft autosave now distinguishes saved / skipped / failed, so explicit submit no longer causes a false autosave failure UI.
- Replaced the deprecated root Next.js middleware entry with src/proxy.ts.
- Removed obsolete CURRENT TASK.md because it did not match the active report-save work.

### Verified
- Focused tests passed: npm test -- src/app/api/reports/save/route.test.ts src/components/reports/hooks/useReportSubmit.test.ts
- Full tests passed: npm test (147 tests)
- Type check passed: npx tsc --noEmit
- Build passed: npm run build

### Current architecture state
- Core report bundle writes are transactional through public.save_report_bundle(payload jsonb).
- Attendance inside the RPC remains warning-tolerant rather than hard-fail.
- Photo upload and report_photos metadata insert are still outside the RPC transaction boundary.
- Route-level auth/preflight remains the app-layer gate before RPC execution.

### Remaining risks
- Real authenticated end-to-end verification against remote RLS is still desirable for actual save flows.
- Photo upload remains best-effort and can diverge from the main report save result.
- Permission enforcement is still split between route preflight and DB/RLS behavior.

### Recommended next task
1. Verify real report save flows against the deployed RPC/RLS boundary:
   - draft autosave update
   - author edit save
   - admin edit save
   - cell_leader attendance warning path
2. Decide whether photo follow-up should remain best-effort or move to an explicit recovery flow.
3. Only after that, consider whether any permission rule should also be consolidated deeper into SQL/RPC.

### Scope guardrails for the next agent
- Do not redesign report UI sections.
- Do not broaden into attendance/accounting/approval refactors.
- Do not change RLS intent.
- Keep changes additive and narrowly scoped to report-save verification/recovery semantics.