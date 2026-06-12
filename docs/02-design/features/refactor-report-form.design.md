# Design: refactor-report-form

## 개요
- **기능명**: ReportForm 리팩토링
- **작성일**: 2026-03-24
- **Plan 참조**: `docs/01-plan/features/refactor-report-form.plan.md`
- **구현 방식**: 방식 A — 커스텀 훅 + 순수 함수 분리

---

## 현재 구조 분석

```
ReportForm.tsx (1,594줄)
├── lines   1-152   imports, 타입, 모듈 상수
├── lines 154-588   컴포넌트 body (상태 20개+, effects, 핸들러)
│   ├── supabase/router/toast/queryClient 초기화
│   ├── 섹션 네비게이션 상태 + IntersectionObserver
│   ├── 사진 업로드 상태
│   ├── notes JSON 파싱 (parsedNotes)
│   ├── 프로젝트 섹션 토글 상태
│   ├── form 필드 상태 (11개 필드)
│   ├── 셀장보고서: 셀/셀원/출결 상태 + effects
│   ├── 프로그램 / 새신자 / 셀출결 상태 초기화
│   ├── 프로젝트 세부계획/일정/예산 상태
│   ├── 출결 요약 로드 useEffect
│   └── 각종 핸들러 (addProgram, removeProgram 등)
├── lines 589-1007  handleSubmit (418줄, 7가지 책임)
│   ├── 0. 유효성 검사
│   ├── 1. 권한 체크 (editMode)
│   ├── 2. reportData 객체 빌드
│   ├── 3. report 저장/수정 + 하위항목 삭제 (editMode)
│   ├── 4. programs / newcomers / project items 저장
│   ├── 5. 셀 출결 저장
│   ├── 6. 사진 업로드
│   ├── 7. 제출 알림 + 캐시 무효화 + 라우팅
│   └── catch: 롤백 + 에러 표시
└── lines 1008-1594 JSX 렌더링
```

---

## 목표 구조

```
src/components/reports/
├── ReportForm.tsx               ← 700줄 이하 (렌더링 + UI 상태만)
├── hooks/
│   ├── useReportSubmit.ts       ← 신규: 저장 로직 전체
│   └── useReportForm.ts         ← 신규 (Phase 3): 폼 상태 초기화
├── utils/
│   └── reportDataBuilder.ts     ← 신규: reportData 빌드 순수 함수
├── ProgramTable.tsx             (변경 없음)
├── AttendanceInput.tsx          (변경 없음)
├── NewcomerSection.tsx          (변경 없음)
├── PhotoUploadSection.tsx       (변경 없음)
├── CellMemberAttendance.tsx     (변경 없음)
└── types.ts                     (변경 없음)
```

---

## Phase 1: `utils/reportDataBuilder.ts`

### 역할
`handleSubmit` 내 `reportData` 객체 빌드 로직(현재 lines 627-673)을 순수 함수로 추출.
입력 → 출력이 명확한 순수 함수이므로 단위 테스트 즉시 추가 가능.

### 인터페이스

```typescript
// ── 입력 타입 ────────────────────────────────────────
export interface ReportDataInput {
  form: {
    department_id: string
    report_date: string
    sermon_title: string
    sermon_scripture: string
    discussion_notes: string
    other_notes: string
    meeting_title: string
    meeting_location: string
    attendees: string
    main_content: string
    application_notes: string
    organization: string
  }
  reportType: ReportType
  reportYear: number
  weekNumber: number
  isDraft: boolean
  cellAttendance: CellAttendance[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  memberAttendance: MemberAttendanceItem[]
  selectedCellId: string
  enabledSections: ProjectSectionId[]
}

// ── 출력 타입 ─────────────────────────────────────────
export interface ReportDataPayload {
  report_type: string
  department_id: string
  report_date: string
  week_number: number | null
  year: number
  total_registered: number
  worship_attendance: number
  meeting_attendance: number
  cell_id: string | null
  meeting_title: string | null
  meeting_location: string | null
  attendees: string | null
  main_content: string | null
  application_notes: string | null
  notes: string          // JSON 직렬화
  status: string
  submitted_at: string | null
}

// ── 공개 함수 ─────────────────────────────────────────
export function buildReportData(input: ReportDataInput): ReportDataPayload

export function buildCellLeaderAttendees(
  memberAttendance: MemberAttendanceItem[],
  fallback: string
): string
```

### 파일 경로
`src/components/reports/utils/reportDataBuilder.ts`

---

## Phase 2: `hooks/useReportSubmit.ts`

### 역할
`handleSubmit`의 모든 Supabase 뮤테이션 로직을 커스텀 훅으로 추출.
ReportForm에서는 `const { submit, isLoading, error } = useReportSubmit(...)` 한 줄로 교체.

### 인터페이스

```typescript
// ── 훅 옵션 ──────────────────────────────────────────
export interface UseReportSubmitOptions {
  supabase: ReturnType<typeof createClient>
  authorId: string
  reportType: ReportType
  departments: Department[]
  weekNumber: number
  editMode: boolean
  existingReport?: ExistingReport
  // 폼 상태 (읽기 전용)
  form: ReportDataInput['form']
  programs: Program[]
  newcomers: Newcomer[]
  contentItems: ProjectContentItem[]
  scheduleItems: ProjectScheduleItem[]
  budgetItems: ProjectBudgetItem[]
  cellAttendance: CellAttendance[]
  memberAttendance: MemberAttendanceItem[]
  selectedCellId: string
  photoFiles: File[]
  enabledSections: ProjectSectionId[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  // 외부 의존성
  toast: ReturnType<typeof useToastContext>
  queryClient: QueryClient
  router: ReturnType<typeof useRouter>
  // 중복 보고서 발견 시 콜백
  onDuplicateFound: (id: string, status: string) => void
}

// ── 훅 반환값 ─────────────────────────────────────────
export interface UseReportSubmitReturn {
  submit: (isDraft: boolean) => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useReportSubmit(
  options: UseReportSubmitOptions
): UseReportSubmitReturn
```

### 내부 서브함수 (비공개)

| 함수명 | 책임 | 현재 위치 |
|--------|------|----------|
| `checkDuplicate` | 중복 보고서 존재 여부 확인 | lines 724-778 |
| `saveOrUpdateReport` | report 레코드 insert/update | lines 677-793 |
| `savePrograms` | report_programs insert | lines 795-802 |
| `saveNewcomers` | newcomers insert | lines 805-828 |
| `saveProjectItems` | project_content/schedule/budget insert | lines 831-865 |
| `saveAttendance` | attendance_records upsert/delete | lines 867-923 |
| `uploadPhotos` | Storage 업로드 + report_photos insert | lines 925-955 |
| `sendSubmitNotification` | createApprovalNotification 호출 | lines 957-968 |

### ReportForm.tsx 교체 후 모습

```typescript
// Before: handleSubmit 418줄
const handleSubmit = async (e, isDraft) => { ... 418줄 ... }

// After: 5줄
const { submit, isLoading: loading, error, clearError } = useReportSubmit({
  supabase, authorId, reportType, departments, weekNumber, editMode,
  existingReport, form, programs, newcomers, contentItems, scheduleItems,
  budgetItems, cellAttendance, memberAttendance, selectedCellId,
  photoFiles, enabledSections, attendanceSummary,
  toast, queryClient, router,
  onDuplicateFound: (id, status) => { setExistingReportId(id); setExistingReportStatus(status) },
})
const handleSubmit = (e: React.FormEvent, isDraft = false) => {
  e.preventDefault()
  submit(isDraft)
}
```

---

## Phase 3: `hooks/useReportForm.ts` (선택적)

### 역할
20개+ 상태 변수 및 editMode 초기화 로직을 훅으로 추출.
Phase 1+2 완료 후 별도 진행.

### 인터페이스

```typescript
export interface UseReportFormReturn {
  form: FormFields
  setForm: Dispatch<SetStateAction<FormFields>>
  programs: Program[]
  setPrograms: Dispatch<SetStateAction<Program[]>>
  newcomers: Newcomer[]
  setNewcomers: Dispatch<SetStateAction<Newcomer[]>>
  cellAttendance: CellAttendance[]
  setCellAttendance: Dispatch<SetStateAction<CellAttendance[]>>
  contentItems: ProjectContentItem[]
  setContentItems: Dispatch<SetStateAction<ProjectContentItem[]>>
  scheduleItems: ProjectScheduleItem[]
  setScheduleItems: Dispatch<SetStateAction<ProjectScheduleItem[]>>
  budgetItems: ProjectBudgetItem[]
  setBudgetItems: Dispatch<SetStateAction<ProjectBudgetItem[]>>
  enabledSections: ProjectSectionId[]
  setEnabledSections: Dispatch<SetStateAction<ProjectSectionId[]>>
  parsedNotes: ParsedNotesType
}

export function useReportForm(
  reportType: ReportType,
  existingReport: ExistingReport | undefined,
  defaultDate: string,
  departments: Department[]
): UseReportFormReturn
```

---

## 구현 순서

```
Step 1  utils/reportDataBuilder.ts 생성
        └── buildReportData, buildCellLeaderAttendees 구현
        └── ReportForm.tsx에서 import 후 교체
        └── reportDataBuilder.test.ts 작성 (최소 5 케이스)

Step 2  hooks/useReportSubmit.ts 생성
        └── 내부 서브함수 8개 구현
        └── useReportSubmit 훅 구현 (isLoading/error 상태 포함)
        └── ReportForm.tsx handleSubmit → submit 교체

Step 3  빌드 + 테스트 통과 확인
        └── npm run build
        └── npm test (114개 + 신규 5개 이상)

Step 4  (선택) hooks/useReportForm.ts 생성
        └── 상태 초기화 로직 이전
        └── ReportForm.tsx 상단 정리
```

---

## 검증 기준

| 항목 | 기준 |
|------|------|
| 빌드 | `npm run build` 에러 없음 |
| 기존 테스트 | 114개 전부 통과 |
| 신규 테스트 | `reportDataBuilder.test.ts` 최소 5 케이스 |
| ReportForm 크기 | Phase 1+2 후 900줄 이하, Phase 3 후 700줄 이하 |
| 동작 동일성 | weekly/cell_leader/project 보고서 각 저장 동작 동일 |

---

## 제약사항 (리팩토링 원칙)

- **기능 추가 금지**: 행동을 바꾸지 않는 순수 구조 개선만
- **props 인터페이스 유지**: `ReportFormProps` 외부 인터페이스 변경 없음
- **DB 쿼리 변경 없음**: Supabase 쿼리 로직은 이동만 할 뿐 수정하지 않음
- **기존 서브컴포넌트 유지**: ProgramTable 등 5개 파일 변경 없음
