import type { UserData } from '@/types/shared'

type ReportPermissionTarget = {
  author_id: string
  status: string
}

export function isAdmin(role: string): boolean {
  return role === 'super_admin' || role === 'president'
}

export function isAdminRole(role: string): boolean {
  return ['super_admin', 'president', 'accountant'].includes(role)
}

export function canAccessAllDepartments(role: string): boolean {
  return ['super_admin', 'accountant', 'president'].includes(role)
}

export function canAccessAccounting(role: string): boolean {
  return ['super_admin', 'accountant', 'president', 'team_leader'].includes(role)
}

export function canWriteReport(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.role === 'team_leader' || user.user_departments?.some((ud) => ud.is_team_leader)
}

export function canCreateMeeting(user: UserData | null): boolean {
  if (!user) return false
  return ['super_admin', 'president', 'team_leader'].includes(user.role)
}

export function canEditMeetingContent(user: UserData | null, departmentId?: string): boolean {
  if (!user || !user.is_active) return false
  if (isAdmin(user.role)) return true
  if (user.role !== 'team_leader') return false
  if (!departmentId) return true

  return user.user_departments?.some(
    (userDepartment) => userDepartment.department_id === departmentId && userDepartment.is_team_leader
  ) ?? false
}

export function canParticipateInMeetingAgenda(user: UserData | null): boolean {
  if (!user || !user.is_active) return false
  if (['super_admin', 'president', 'accountant'].includes(user.role)) return true
  return user.role === 'team_leader'
}

export function canLeaveMeetingFeedback(
  user: UserData | null,
  meeting?: { created_by: string; department_id: string } | null
): boolean {
  if (!user || !user.is_active) return false
  if (['super_admin', 'president', 'accountant'].includes(user.role)) return true
  if (!meeting) return false
  if (user.id === meeting.created_by) return true

  return user.user_departments?.some(
    (userDepartment) => userDepartment.department_id === meeting.department_id && userDepartment.is_team_leader
  ) ?? false
}

export function canDeleteMeeting(
  user: UserData | null,
  meeting: { created_by: string; department_id: string }
): boolean {
  if (!user || !user.is_active) return false
  if (user.id === meeting.created_by) return true
  return canEditMeetingContent(user, meeting.department_id)
}

export function canViewMeeting(user: UserData | null): boolean {
  return !!user?.is_active
}

export function canEditMembers(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.user_departments?.some((ud) => ud.is_team_leader) ?? false
}

export function canDeleteMembers(user: UserData | null): boolean {
  return !!user?.is_active && isAdminRole(user.role)
}

export function canManageReport(
  role: string | null | undefined,
  userId: string | null | undefined,
  report: ReportPermissionTarget
): boolean {
  if (!role || !userId) return false
  if (canAccessAllDepartments(role)) return true
  return userId === report.author_id && ['draft', 'rejected'].includes(report.status)
}

export function canDeleteReport(
  user: UserData | null,
  report: ReportPermissionTarget
): boolean {
  if (!user) return false
  return canManageReport(user.role, user.id, report)
}

export function canEditReport(
  user: UserData | null,
  report: ReportPermissionTarget
): boolean {
  if (!user) return false
  return canManageReport(user.role, user.id, report)
}

export function canApprove(role: string): boolean {
  return ['super_admin', 'president', 'accountant', 'team_leader'].includes(role)
}

export function isTeamLeader(user: UserData | null): boolean {
  if (!user) return false
  return user.user_departments?.some((ud) => ud.is_team_leader) ?? false
}

export function getAccessibleDepartmentIds(user: UserData | null): string[] {
  if (!user) return []
  return user.user_departments?.map((ud) => ud.department_id) || []
}

export function getTeamLeaderDepartments(user: UserData | null): Array<{ id: string; name: string; code: string }> {
  if (!user) return []
  return user.user_departments?.filter((ud) => ud.is_team_leader).map((ud) => ud.departments) || []
}

export function canViewAllReports(user: UserData | null): boolean {
  if (!user) return false
  return canAccessAllDepartments(user.role)
}

// Report sharing only: this must not grant approval, editing or member management.
// CU1 uses team_leader for ordinary cell leaders too, so it requires the head flag.
export function canReadSharedReports(user: UserData | null): boolean {
  if (!user?.is_active) return false
  return user.user_departments?.some((ud) =>
    ud.is_team_leader || (
      user.role === 'team_leader' &&
      ['youth', 'ck', 'cu2', 'CU', 'cu_worship'].includes(ud.departments.code)
    )
  ) ?? false
}

export function isWorshipDepartment(code: string | undefined): boolean {
  // Production uses uppercase CU for worship; lowercase cu is the umbrella CU.
  return code === 'CU' || code === 'cu_worship'
}

/** Submitted weekly reports are shared between active department leaders, not ordinary cell leaders. */
export function canViewWeeklyReportsAcrossDepartments(user: UserData | null): boolean {
  return canReadSharedReports(user)
}

export function canViewReport(
  user: UserData | null,
  report: { author_id: string; department_id: string; status?: string; report_type?: string; departments?: { code?: string } | null },
  authorIsTeamLeader?: boolean
): boolean {
  void authorIsTeamLeader
  if (!user || !user.is_active) return false
  if (user.id === report.author_id) return true
  if (report.status === 'draft') return false
  if (canAccessAllDepartments(user.role)) return true
  if (canReadSharedReports(user) && (
    report.report_type === 'weekly' ||
    (report.report_type === 'meeting' && isWorshipDepartment(report.departments?.code))
  )) return true

  const isDepartmentLeaderForReport = user.user_departments?.some(
    (userDepartment) => userDepartment.department_id === report.department_id && userDepartment.is_team_leader
  ) ?? false
  if (isDepartmentLeaderForReport) return true

  return false
}
