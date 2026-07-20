# 버그 이력 및 해결 기록

## 해결된 버그

### 2026-01-30

#### 1. 모임/교육 보고서 내용 미표시
- **증상**: 모임/교육 보고서의 주요내용, 참석자 등이 상세 페이지에서 표시되지 않음
- **원인**: ReportDetail.tsx에서 `report_type`이 'weekly'가 아닌 경우의 렌더링 분기 누락
- **해결**:
  - `src/components/reports/ReportDetail.tsx`에 모임/교육 보고서 전용 섹션 추가
  - 모임 개요 (일시, 장소, 참석자), 주요내용/교육내용 섹션 렌더링
- **관련 파일**: `src/components/reports/ReportDetail.tsx`

#### 2. 부서 필터 상태 유실
- **증상**: 교인 상세 페이지에서 목록으로 돌아갈 때 부서 필터가 초기화됨
- **원인**: URL에 부서 파라미터가 전달되지 않음
- **해결**:
  - 목록 → 상세 이동 시 `?dept=` 파라미터 포함
  - 상세 페이지에서 '목록으로' 버튼 클릭 시 파라미터 유지
- **관련 파일**:
  - `src/components/members/MemberList.tsx`
  - `src/app/(dashboard)/members/[id]/page.tsx`

### 2026-01-31

#### 3. [아카이브] Netlify CLI Windows 배포 실패
- **증상**: `netlify deploy --prod` 명령 실행 시 "Failed publishing static content" 오류
- **원인**: `@netlify/plugin-nextjs` 플러그인의 Windows 호환성 문제
- **해결**: Vercel로 이전하여 더 이상 해당 없음
- **관련 파일**: N/A

#### 4. TypeScript 빌드 오류 (implicit any)
- **증상**: `npm run build` 시 여러 파일에서 "Parameter implicitly has an 'any' type" 오류
- **원인**: 콜백 함수 파라미터에 타입 명시 누락
- **해결**:
  - `NotificationBell.tsx`: `payload: { new: Notification; old: Notification | null }`
  - `stats/page.tsx`: `(m: { id: string; department_id: string }) =>`
  - `ReportForm.tsx`: `(a: { attendance_type: string; is_present: boolean }) =>`
- **관련 파일**:
  - `src/components/notifications/NotificationBell.tsx`
  - `src/app/(dashboard)/stats/page.tsx`
  - `src/components/reports/ReportForm.tsx`

#### 5. [아카이브] Netlify 503 오류 (플랜 한도 초과)
- **증상**: Netlify 무료 플랜 한도 초과로 503 오류
- **해결**: Vercel로 이전 완료 (https://church-eight-delta.vercel.app)
- **관련 파일**: N/A

#### 6. Git add 'nul' 파일 오류
- **증상**: `git add .` 실행 시 'nul' 파일 관련 오류
- **원인**: Windows 예약 파일명 ('nul')이 프로젝트 루트에 생성됨
- **해결**: `nul` 파일 제외하고 특정 파일만 `git add` 실행
- **관련 파일**: 프로젝트 루트의 `nul` 파일 (삭제 불가, 무시 처리)

#### 7. 알림 시스템 역할 매핑 오류
- **증상**: 결재 알림이 잘못된 사용자에게 전송될 수 있음
- **원인**: 기존 역할명과 DB 역할명 불일치 (manager vs accountant)
- **해결**:
  - `src/lib/notifications.ts`에서 STATUS_TO_RECIPIENT_ROLE 매핑 수정
  - 부장 역할을 'accountant'로 매핑 (DB 스키마 기준)
- **관련 파일**: `src/lib/notifications.ts`

#### 8. Tiptap TextStyle import 오류
- **증상**: `npm run build` 시 "Export default doesn't exist in target module" 오류
- **원인**: `@tiptap/extension-text-style` 패키지는 named export 사용
- **해결**:
  ```typescript
  // 변경 전
  import TextStyle from '@tiptap/extension-text-style'
  // 변경 후
  import { TextStyle } from '@tiptap/extension-text-style'
  ```
- **관련 파일**: `src/components/ui/RichTextEditor.tsx`

---

## 알려진 이슈 (미해결)

### 1. 실시간 알림 구독 초기화
- **증상**: 페이지 새로고침 시 Supabase realtime 채널 재구독 지연 발생 가능
- **영향**: 새로고침 직후 몇 초간 실시간 알림 수신 지연
- **임시 해결**: 페이지 로드 시 알림 목록 API 호출로 최신 상태 동기화
- **우선순위**: 낮음

### 2. 사진 업로드 용량 제한
- **증상**: 큰 이미지 업로드 시 Supabase Storage 제한에 걸림
- **영향**: 5MB 이상 이미지 업로드 실패
- **권장 해결**: 클라이언트에서 이미지 리사이즈 후 업로드
- **우선순위**: 중간

---

## 버그 보고 형식

새로운 버그 발견 시 아래 형식으로 기록:

```markdown
#### [버그 제목]
- **증상**: 사용자가 경험하는 문제
- **재현 방법**: 버그를 재현하는 단계
- **원인**: 분석된 근본 원인
- **해결**: 적용된 해결 방법
- **관련 파일**: 수정된 파일 목록
```

---

## 2026-06-19 Resolved - Meeting Agenda Board Participant Leaders

#### Meeting agenda board blocked leader-meeting participants
- **Symptom**: The meeting agenda board displayed the "department heads/admins only" message for leader-meeting participants who should be able to post agenda items and comment before the meeting.
- **Root cause**: Agenda participation was gated on `user_departments.is_team_leader = true`, which represents a department-head flag, not every active `team_leader` participant in the leader meeting.
- **Fix**:
  - `canParticipateInMeetingAgenda` now allows active `team_leader` users.
  - The agenda department selector now uses linked departments for non-admin leaders.
  - Migration `016_allow_meeting_agenda_participant_leaders.sql` aligns agenda item insert, comment insert, and agenda PDF Storage policies with the same rule.
- **Related files**:
  - `src/lib/permissions.ts`
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/lib/permissions.test.ts`
  - `supabase/migrations/016_allow_meeting_agenda_participant_leaders.sql`

#### Meeting agenda board had no edit actions
- **Symptom**: Users could post pre-meeting agenda items and comments, but could not edit them afterward.
- **Root cause**:
  - `MeetingAgendaBoard` had create/delete/status actions but no item update mutation or edit UI.
  - Comments had create/delete actions but no update mutation/UI and no comment update RLS policy.
- **Fix**:
  - Added inline agenda item editing for title, type, and content.
  - Added inline comment editing for comment text.
  - Added migration `017_add_meeting_agenda_edit_policies.sql` for agenda item/comment update RLS.
- **Related files**:
  - `src/components/meetings/MeetingAgendaBoard.tsx`
  - `src/queries/meetings/useMeetings.ts`
  - `supabase/migrations/017_add_meeting_agenda_edit_policies.sql`

## 2026-06-29 Resolved - Report Photos Missing And Implicit Submit

#### Submitted report detail did not show attached photos
- **Symptom**: Users attached photos while submitting a report, but the submitted report detail page showed no photos.
- **Root cause**: The submit flow inserted `report_photos` metadata, but report detail never queried or rendered `report_photos`.
- **Fix**:
  - Added `report_photos` typing in `src/types/database.ts`.
  - Added `useReportPhotos` in `src/queries/reports.ts`.
  - Rendered attached photos in `src/components/reports/ReportDetail.tsx`.
- **Related files**:
  - `src/types/database.ts`
  - `src/queries/reports.ts`
  - `src/components/reports/ReportDetail.tsx`

#### Report form could submit while typing
- **Symptom**: A report could move to submitted while the user was still writing.
- **Root cause**: Native form behavior can submit when Enter is pressed in normal inputs, using the default submit button.
- **Fix**:
  - `src/components/reports/ReportForm.tsx` now blocks implicit Enter-key submits and accepts submission only from the explicit submit button.
  - Photo upload failures in `src/components/reports/hooks/useReportSubmit.ts` now surface instead of silently completing the success path.
  - Existing-draft submit recovery now tracks the saved report id when photo upload fails after the base report save.
  - Photo-bearing final submissions now save as draft first, upload photos, then submit the same report so upload failure remains recoverable from the edit page.
- **Related files**:
  - `src/components/reports/ReportForm.tsx`
  - `src/components/reports/hooks/useReportSubmit.ts`

#### Activity photo gallery could leave orphan Storage files
- **Symptom**: If `department_photos` metadata insert failed after Storage upload, the image file could remain in `department-photos` without a gallery row.
- **Root cause**: `PhotosClient` continued after DB insert failure without removing the just-uploaded Storage object.
- **Fix**:
  - Remove the Storage object when `department_photos` insert fails.
  - Check Storage and DB delete errors explicitly.
  - Add `scripts/audit-photo-integrity.sql` for read-only table/storage consistency checks.
- **Related files**:
  - `src/components/photos/PhotosClient.tsx`
  - `src/types/database.ts`
  - `src/queries/photos.ts`
  - `scripts/audit-photo-integrity.sql`
## 2026-07-01 Resolved - Peer Cell-Leader Report Visibility

#### Ordinary cell leaders could read peer cell-leader reports
- **Symptom**: Cell leaders could open other cell leaders' reports, exposing private sharing/prayer content.
- **Root cause**:
  - `canViewReport` allowed any `role = team_leader` user to read submitted reports in their linked department.
  - The `reports_select_all` RLS policy from migration 003 allowed any authenticated user to select non-draft reports.
- **Fix**:
  - Ordinary cell leaders (`role = team_leader`, `is_team_leader = false`) can now read only their own reports.
  - Department/team leaders (`is_team_leader = true`) retain department-level visibility.
  - Report list and dashboard recent-report queries now scope fetches by author and led departments.
  - Added migration `018_restrict_peer_cell_leader_report_visibility.sql` to tighten report and child-table SELECT policies.
- **Related files**:
  - `src/lib/permissions.ts`
  - `src/lib/permissions.test.ts`
  - `src/queries/reports.ts`
  - `src/queries/dashboard.ts`
  - `src/components/reports/ReportListClient.tsx`
  - `src/components/dashboard/DashboardContent.tsx`
  - `supabase/migrations/018_restrict_peer_cell_leader_report_visibility.sql`

## 2026-07-20 Resolved - Report Photo Storage Permission Coverage

#### Report photo uploads could fail outside the previously tested department
- **Symptom**: CU2 report photo upload was reported as failing after a prior report-photo fix.
- **Root cause**:
  - The 2026-06-29 fix was global report UI/persistence hardening, not youth-only, but it did not replace the `report-photos` Storage upload policies.
  - Report photo object paths are department-neutral (`{reportId}/...`), so upload authorization must resolve the parent report from the path instead of relying on department-specific assumptions.
- **Fix**:
  - Added migration `019_fix_report_photo_storage_policies.sql`.
  - The migration creates/updates the `report-photos` bucket and adds Storage object select/insert/update/delete policies keyed by the report id in the object path.
  - `report_photos` metadata policies are restated with the same active author/admin write rule and parent-report-based read rule.
- **Related files**:
  - `supabase/migrations/019_fix_report_photo_storage_policies.sql`
