import type { UserData } from '@/types/shared'

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

export function canViewMeeting(user: UserData | null): boolean {
  return !!user?.is_active
}

export function canEditMembers(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.user_departments?.some((ud) => ud.is_team_leader) ?? false
}

export function canDeleteMembers(user: UserData | null): boolean {
  return canEditMembers(user)
}

export function canDeleteReport(
  user: UserData | null,
  report: { author_id: string; status: string }
): boolean {
  if (!user) return false
  if (canAccessAllDepartments(user.role)) return true
  return user.id === report.author_id && ['draft', 'rejected'].includes(report.status)
}

export function canEditReport(
  user: UserData | null,
  report: { author_id: string; status: string }
): boolean {
  if (!user) return false
  if (canAccessAllDepartments(user.role)) return true
  return user.id === report.author_id && ['draft', 'rejected'].includes(report.status)
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
  if (canAccessAllDepartments(user.role)) return true
  return user.user_departments?.some((ud) => ud.is_team_leader) ?? false
}

export function canViewReport(
  user: UserData | null,
  report: { author_id: string; department_id: string; status?: string; report_type?: string },
  _authorIsTeamLeader?: boolean
): boolean {
  if (!user) return false
  if (user.id === report.author_id) return true
  if (report.status === 'draft') return false
  if (canAccessAllDepartments(user.role)) return true
  if (user.user_departments?.some((ud) => ud.is_team_leader)) return true

  if (user.role === 'team_leader') {
    const departmentIds = user.user_departments?.map((ud) => ud.department_id) || []
    return departmentIds.includes(report.department_id)
  }

  return false
}
