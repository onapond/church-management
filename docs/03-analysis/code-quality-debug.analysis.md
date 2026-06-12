# Design-Implementation Gap Analysis Report

> **Summary**: Gap analysis between the "code quality debug" plan and actual implementation
>
> **Author**: gap-detector
> **Created**: 2026-02-19
> **Status**: Approved

---

## Analysis Overview
- **Analysis Target**: Code Quality Debug (4-Phase Plan)
- **Design Document**: `C:\Users\4ever\.claude\plans\staged-bubbling-planet.md`
- **Implementation Path**: `C:\dev\church\src\`
- **Analysis Date**: 2026-02-19

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Phase 1: Cache Invalidation | 100% | PASS |
| Phase 2: Data Logic Bugs | 100% | PASS |
| Phase 3: Error Handling + UX | 100% | PASS |
| Phase 4: Security | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## Phase 1: Cache Invalidation (8 files)

### 1. MemberForm.tsx
- **Plan**: `invalidateQueries(['members'])` + remove `router.refresh()`
- **Implementation**: Line 5 imports `useQueryClient`, line 263 calls `await queryClient.invalidateQueries({ queryKey: ['members'] })`. No `router.refresh()` present.
- **Status**: PASS

### 2. members/[id]/page.tsx
- **Plan**: `invalidateQueries(['members'])` after photo upload
- **Implementation**: Line 5 imports `useQueryClient`, line 151 calls `queryClient.invalidateQueries({ queryKey: ['members'] })` inside `handlePhotoUpload`. No `router.refresh()` present.
- **Status**: PASS

### 3. UserManagement.tsx
- **Plan**: 3 handlers with `invalidateQueries(['users'])`, remove `router.refresh()` x3
- **Implementation**:
  - `handleApprove` (line 78): `await queryClient.invalidateQueries({ queryKey: ['users'] })`
  - `handleDelete` (line 108): `await queryClient.invalidateQueries({ queryKey: ['users'] })`
  - `handleSave` (line 174): `await queryClient.invalidateQueries({ queryKey: ['users'] })`
  - No `router.refresh()` anywhere in file.
- **Status**: PASS

### 4. AccountingRecordForm.tsx
- **Plan**: `invalidateQueries(['accounting'])`
- **Implementation**: Line 108 calls `await queryClient.invalidateQueries({ queryKey: ['accounting'] })`.
- **Status**: PASS

### 5. ExpenseRequestForm.tsx
- **Plan**: `invalidateQueries(['expense-requests','accounting'])`
- **Implementation**: Lines 193-194 call both:
  - `await queryClient.invalidateQueries({ queryKey: ['expense-requests'] })`
  - `await queryClient.invalidateQueries({ queryKey: ['accounting'] })`
- **Status**: PASS

### 6. MemberList.tsx
- **Plan**: Remove `router.refresh()`
- **Implementation**: No `router.refresh()` in MemberList.tsx. Uses `useDeleteMember` mutation with TanStack Query for cache invalidation.
- **Status**: PASS

### 7. ReportForm.tsx
- **Plan**: `['dashboard']` invalidation
- **Implementation**: Lines 808-809 call both:
  - `await queryClient.invalidateQueries({ queryKey: ['reports'] })`
  - `await queryClient.invalidateQueries({ queryKey: ['dashboard'] })`
- **Status**: PASS

### 8. ReportDetail.tsx
- **Plan**: `['dashboard']` invalidation for approve/cancel/delete
- **Implementation**: Three locations verified:
  - Cancel (lines 329-331): approvals + reports + dashboard
  - Delete (lines 363-365): approvals + reports + dashboard
  - Approve (lines 450-452): approvals + reports + dashboard
- **Status**: PASS

### Remaining router.refresh() calls (outside plan scope)
The following files still use `router.refresh()` but were NOT in the plan scope (they are auth-related navigation, not data mutation):
- `Sidebar.tsx:36` (logout)
- `Header.tsx:38` (logout)
- `reset-password/page.tsx:41` (password reset)
- `login/page.tsx:39,123` (login)
- `pending/page.tsx:16` (pending approval)

These are appropriate uses of `router.refresh()` for auth state changes, not data mutations.

---

## Phase 2: Data Logic Bugs

### 2-1. Timezone Bug (CRITICAL)

- **Plan**: Replace ALL `toISOString().split('T')[0]` with `toLocalDateString()` in:
  - `stats-queries.ts`
  - `queries/dashboard.ts`
  - `queries/accounting.ts`
  - `accounting/AccountingClient.tsx`
  - Plus: `excel.ts`, `ReportStatsContent.tsx`, `AttendanceClient.tsx`, `PhotosClient.tsx`, `reports/new/page.tsx`

- **Implementation**:
  - `toLocalDateString()` utility defined in `src/lib/utils.ts` (line 44)
  - Grep for `toISOString().split` returns **0 matches** across entire `src/` directory
  - All listed files now import and use `toLocalDateString()`:
    - `stats-queries.ts`: lines 3, 44, 180
    - `queries/dashboard.ts`: lines 5, 15
    - `queries/accounting.ts`: lines 5, 20, 73, 99
    - `AccountingClient.tsx`: lines 6, 89
    - `excel.ts`: lines 1, 76, 133
    - `ReportStatsContent.tsx`: lines 5, 80, 119
    - `AttendanceClient.tsx`: lines 4, 20
    - `PhotosClient.tsx`: lines 6, 35
    - `reports/new/page.tsx`: lines 5, 31
    - `AccountingRecordForm.tsx`: lines 7, 31
    - `ExpenseRequestForm.tsx`: lines 7, 40, 46, 63
- **Status**: PASS

### 2-2. Dynamic List key={index} (CRITICAL)

- **Plan**: Add unique `_key` field with `genKey()` to types. Change all `key={index}` to `key={item._key}`.

- **Implementation**:
  - `src/components/reports/types.ts`: All 6 types have `_key: string` field. `genKey()` function defined (timestamp + counter based).
  - Types confirmed: Program, Newcomer, CellAttendance, ProjectContentItem, ProjectScheduleItem, ProjectBudgetItem
  - Dynamic list keys verified:
    - `ProgramTable.tsx`: `key={program._key}` (lines 184, 208)
    - `AttendanceInput.tsx`: `key={cell._key}` (line 124)
    - `NewcomerSection.tsx`: `key={newcomer._key}` (lines 199, 225)
    - `ReportForm.tsx` contentItems: `key={item._key}` (line 1157)
    - `ReportForm.tsx` scheduleItems: `key={item._key}` (line 1198)
    - `ReportForm.tsx` budgetItems: `key={item._key}` (line 1249)
  - **Note**: `ReportPrintView.tsx` still uses `key={index}` (lines 135, 183, 230, 259, 273), but this is acceptable since print views are read-only static renders with no reordering/deletion, so index keys are appropriate.
- **Status**: PASS

---

## Phase 3: Error Handling + UX (6 files)

### 3-1. Error Handling

#### ExpenseRequestForm.tsx:134 (item save fail)
- **Plan**: throw + toast on item save fail
- **Implementation**: Lines 141-146: checks `itemsError`, calls `toast.error()`, and `return` (stops execution)
- **Status**: PASS

#### ExpenseRequestForm.tsx:159-177 (accounting loop)
- **Plan**: Error handling in accounting loop
- **Implementation**: Lines 183-188: Inside the loop, checks `ledgerError`, calls `toast.error()`, sets `setLoading(false)`, and `return` (stops execution)
- **Status**: PASS

#### AccountingRecordForm.tsx:62 (balance query fail)
- **Plan**: Error on balance query fail
- **Implementation**: Lines 73-78: checks `balanceError`, calls `toast.error('...')`, sets `setLoading(false)`, and `return`
- **Status**: PASS

#### ReportForm.tsx:741,773 (attendance/photo save fail)
- **Plan**: Toast on attendance/photo save fail
- **Implementation**:
  - Attendance (line 745): `toast.error('...')`
  - Photo (line 778): `toast.warning('...')`
- **Status**: PASS

### 3-2. UX Feedback

#### AccountingRecordForm.tsx - success toast
- **Plan**: `toast.success()` on save
- **Implementation**: Line 107: `toast.success('...')`
- **Status**: PASS

#### ExpenseRequestForm.tsx - success toast
- **Plan**: `toast.success()` on save
- **Implementation**: Line 192: `toast.success('...')`
- **Status**: PASS

#### PhotosClient.tsx:84 - disabled={uploading}
- **Plan**: `disabled={uploading}` on upload button
- **Implementation**: Line 415: `disabled={uploadFiles.length === 0 || uploading}`
- **Status**: PASS (even stricter than planned -- also disabled when no files selected)

---

## Phase 4: Security (3 files)

### 1. push/send/route.ts - role check
- **Plan**: Role check (admin/president/accountant only)
- **Implementation**: Lines 19-29:
  - Queries user role from DB
  - `allowedRoles = ['super_admin', 'president', 'accountant']`
  - Returns 403 Forbidden if role not in allowed list
- **Status**: PASS

### 2. auth/callback/route.ts - open redirect protection
- **Plan**: Same origin only
- **Implementation**: Line 10:
  - `const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'`
  - Rejects protocol-relative URLs (`//evil.com`) and absolute URLs
  - Falls back to `/dashboard`
- **Status**: PASS

### 3. notifications/route.ts - limit parameter validation
- **Plan**: `Math.min(Math.max(limit, 1), 100)`
- **Implementation**: Lines 33-34:
  - `const rawLimit = parseInt(searchParams.get('limit') || '20', 10)`
  - `const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100)`
  - Also handles NaN case (defaults to 20)
- **Status**: PASS (even more robust than planned -- handles NaN)

---

## Items Intentionally Not Implemented (as documented)

The plan explicitly listed these as "separate work" and they remain unimplemented, which is correct:

| Item | Status | Notes |
|------|--------|-------|
| RLS policy hardening | Not in scope | Supabase dashboard work |
| window.confirm() to custom modal | Not in scope | Large UI change |
| ReportForm split (1378 lines) | Not in scope | Separate refactoring |
| AbortController for fetch races | Not in scope | Minor impact |
| aria-label accessibility | Not in scope | Not a bug |
| Attendance department filter | Not in scope | Needs impact assessment |

---

## Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| Reports cache invalidation | ReportForm.tsx:808 | Also invalidates `['reports']` in addition to `['dashboard']` |
| Approvals cache invalidation | ReportDetail.tsx | All 3 handlers also invalidate `['approvals']` key |
| NaN handling in limit | notifications/route.ts:34 | Extra NaN guard beyond plan |
| No-files-selected guard | PhotosClient.tsx:415 | Also disables when no files selected |

These are improvements beyond the plan that enhance robustness.

---

## Summary

All 4 phases of the code quality debug plan have been fully implemented:

- **27 individual check items** verified across 15+ source files
- **0 missing implementations** (every planned change is present)
- **4 bonus improvements** beyond what was planned
- **Match Rate: 100%**

The implementation not only meets but exceeds the plan specifications in several areas (NaN handling, additional cache keys, stricter button disabling).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-19 | Initial gap analysis | gap-detector |
