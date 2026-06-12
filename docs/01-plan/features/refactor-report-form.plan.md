# Plan: refactor-report-form

## 개요
- **기능명**: ReportForm 리팩토링
- **작성일**: 2026-03-24
- **우선순위**: 중간
- **예상 범위**: 중간 (파일 분리, 훅 추출, 로직 분리)

## 배경 및 목적

`src/components/reports/ReportForm.tsx`는 현재 **1,594줄**로, 6개의 보고서 유형을 하나의 파일에서 처리하고 있다.

### 현재 문제점
| 문제 | 상세 |
|------|------|
| `handleSubmit` 430줄 | 검증, 보고서 저장, 프로그램/새신자/프로젝트/출결 저장, 사진 업로드, 알림, 라우팅 — 7가지 책임 |
| 상태 20개+ | 6개 보고서 유형 전체의 상태가 한 컴포넌트에 공존 |
| 테스트 불가 | `handleSubmit` 함수 단위 테스트 없음 |
| 유지보수 어려움 | 신규 보고서 유형 추가 시 리스크 높음 |

### 목표
- 컴포넌트를 **300줄 이하**로 유지
- `handleSubmit` 로직을 **훅 + 서브함수**로 분리
- 보고서 유형별 로직 고립 (한 유형 수정이 다른 유형에 영향 없도록)
- 기존 기능 동작 그대로 유지 (행동 변경 없는 리팩토링)

---

## 구현 방식 선택

### 방식 A: 커스텀 훅으로 저장 로직 분리 ⭐ 추천
`handleSubmit` 내부를 `useReportSubmit()` 훅으로 추출하고, 저장 책임별로 서브함수 분리.

**장점**: 최소 변경, 리스크 낮음, 테스트 용이
**단점**: 컴포넌트 자체 크기는 크게 줄지 않음

### 방식 B: 보고서 유형별 폼 컴포넌트 분리
`WeeklyReportForm`, `CellLeaderForm`, `ProjectForm` 등으로 분리.

**장점**: 유형별 완전 독립, 가독성 최고
**단점**: 공통 코드 중복 위험, 변경 범위 큼

### 방식 C: A + B 혼합
공통 저장 훅(A) + 유형별 필드 섹션 컴포넌트(B의 부분 적용).

**장점**: 균형 잡힌 분리
**단점**: 설계 복잡도 중간

**결정: 방식 A (커스텀 훅 분리)** — 리스크 최소, 검증 가능한 단계적 진행

---

## 영향 범위

### 수정 파일
| 파일 | 변경 유형 |
|------|----------|
| `src/components/reports/ReportForm.tsx` | 리팩토링 (기능 변경 없음) |

### 신규 파일
| 파일 | 역할 |
|------|------|
| `src/components/reports/hooks/useReportSubmit.ts` | 저장 로직 전체 (handleSubmit 핵심) |
| `src/components/reports/hooks/useReportForm.ts` | 폼 상태 초기화 및 editMode 데이터 로딩 |
| `src/components/reports/utils/reportDataBuilder.ts` | `reportData` 객체 생성 (순수 함수) |

### 영향 없는 파일
- `ProgramTable`, `AttendanceInput`, `NewcomerSection`, `PhotoUploadSection`, `CellMemberAttendance` — 변경 없음
- `src/app/(dashboard)/reports/new/page.tsx`, `edit/page.tsx` — props 인터페이스 동일 유지
- DB 스키마, API 없음

---

## 단계별 실행 계획

### Phase 1 — reportDataBuilder 추출 (순수 함수)
**대상**: `handleSubmit` 내 `reportData` 객체 생성 로직 (현재 lines 628~673)

```
reportDataBuilder.ts 생성
  buildReportData(form, reportType, options) → reportData 객체 반환
  buildCellLeaderAttendees(memberAttendance, form) → string
```

- 순수 함수이므로 단위 테스트 바로 추가 가능
- 리스크: 없음

### Phase 2 — useReportSubmit 훅 추출
**대상**: `handleSubmit` 내 저장 로직 전체

```
useReportSubmit.ts 생성
  반환: { submit, isLoading, error }
  내부 함수:
    saveReport(reportData) → reportId
    savePrograms(reportId, programs)
    saveNewcomers(reportId, newcomers, deptId)
    saveProjectItems(reportId, content, schedule, budget)
    saveAttendance(reportId, memberAttendance, form, authorId)
    uploadPhotos(reportId, photoFiles)
    sendNotification(reportId, isDraft)
```

- `ReportForm.tsx`의 `handleSubmit`을 `const { submit } = useReportSubmit(...)` 한 줄로 교체
- 각 서브함수 개별 테스트 가능

### Phase 3 — useReportForm 훅 추출 (선택적)
**대상**: 20개+ 상태 변수 및 editMode 초기화 로직

```
useReportForm.ts 생성
  반환: { form, setForm, programs, setPrograms, ... }
  editMode 시 existingReport → 상태 초기화 로직 포함
```

- 컴포넌트 상단 100줄 단순화
- Phase 1, 2 완료 후 진행

---

## 검증 기준

| 항목 | 기준 |
|------|------|
| 빌드 | `npm run build` 성공 |
| 기존 테스트 | 114개 전부 통과 |
| 신규 테스트 | `reportDataBuilder` 순수 함수 최소 5개 케이스 |
| 동작 확인 | 주차보고서 / 셀장보고서 / 프로젝트 각 1건 저장 확인 |
| 파일 크기 | `ReportForm.tsx` 최종 700줄 이하 목표 (Phase 1+2 후) |

---

## 비고
- `handleSubmit` 내 권한 체크(line 621)는 별도 이슈(Critical #3)로 추후 서버 이동 권장
- 보고서 유형별 컴포넌트 분리(방식 B)는 추후 Phase 4로 고려 가능
- 리팩토링 중 기능 추가 금지 (행동 동일성 원칙)
