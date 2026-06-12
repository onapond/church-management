# Project Changelog

All notable changes to the Church Management System are documented here.

## [2026-02-16] - Cell Attendance Toggle Fix

### Fixed
- Cell attendance toggle becoming unresponsive in cell leader reports
  - Issue: useEffect dependency instability caused attendance state to reset on every render
  - Solution: Added useMemo to stabilize cellRecordsData reference + useEffect guard to preserve prev state when cellMembers unchanged
  - Impact: Users can now toggle attendance checkboxes without them immediately resetting

### Technical Improvements
- Enhanced React dependency management with useMemo pattern
- Added defensive programming pattern (prev state comparison) in useEffect
- Improved state stability in data fetching with TanStack Query

---

## [2026-02-10] - Cell Leader Report Type & Performance Optimization

### Added
- Cell leader report type (`cell_leader`) for CK부 cell meetings
  - Fields: meeting title, date, attendees, sharing content, prayer requests, photos
  - Auto-fill attendees based on cell member attendance checkboxes
  - Support for both new and edit modes

- TanStack Query caching optimization (2-phase rollout)
  - Phase 1: Standardized staleTime across all queries (members: 5min, reports: 2min, attendance: 30s, departments: 10min)
  - Phase 1: Added placeholderData: keepPreviousData for better UX on tab/filter switches
  - Phase 1: Converted ReportListClient, AttendanceClient to TanStack Query hooks
  - Phase 2: Converted remaining 5 components (AccountingSummary, ExpenseRequestForm, ExpenseRequestList, ReportStatsContent)
  - Result: 100% migration from manual fetch pattern to TanStack Query

### Changed
- Department selector moved to top position for all report types (unified layout)
- Report page navigation now uses URL searchParams for filter persistence

### Performance Results
- Report list re-visit: instant display (2min cache) instead of loading spinner
- Tab switching: maintains previous data + background refresh instead of blank screen
- Overall: eliminated stale loading states across all major pages

---

## [2026-02-10] - Report Viewing Permission & New Features

### Added
- Report viewing permission system based on team leader hierarchy
  - 7-level permission chain: author → role → department access → team leader → peer cell leader → member
  - `canViewReport()` function in permissions.ts with comprehensive role checks
- Newcomer to member conversion feature
  - "교인 전환" button on report newcomer cards
  - Auto-populate member form from newcomer data
  - Track conversion with converted_to_member_id field
- Cell management page (/settings/cells)
  - Admin-only CRUD for cell operations
  - Inline name editing, reordering, activate/deactivate

### Fixed
- Report approval cache invalidation (invalidateQueries on approval actions)
- Rejected report resubmission flow
  - Allow edit of rejected reports
  - Auto-clear rejection fields on resubmit

### Documentation
- Added 67 unit tests (permissions + notifications)
- Updated component and API documentation

---

## [2026-02-08] - Core Features

### Added
- Bulk member photo upload component
- Report deletion functionality (admin-only)
- Report statistics dashboard with department filtering

---

## Previous Versions

See git commit history for earlier changes.

