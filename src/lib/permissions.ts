import type { UserData } from '@/types/shared'

// ─── 역할 기반 권한 체크 ──────────────────────────────

/** 최고 관리자 또는 회장인지 확인 */
export function isAdmin(role: string): boolean {
  return role === 'super_admin' || role === 'president'
}

/** 관리자 메뉴 접근 가능한 역할인지 확인 (사이드바/헤더) */
export function isAdminRole(role: string): boolean {
  return ['super_admin', 'president', 'accountant'].includes(role)
}

/** 모든 부서 데이터에 접근 가능한 역할 */
export function canAccessAllDepartments(role: string): boolean {
  return ['super_admin', 'accountant', 'president'].includes(role)
}

/** 회계 기능에 접근 가능한 역할 */
export function canAccessAccounting(role: string): boolean {
  return ['super_admin', 'accountant', 'president', 'team_leader'].includes(role)
}

// ─── 사용자 정보 기반 권한 체크 ─────────────────────────

/** 보고서 작성 권한 (관리자 또는 팀장) */
export function canWriteReport(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.role === 'team_leader' || user.user_departments?.some(ud => ud.is_team_leader)
}

/** 교인 편집 권한 (관리자 또는 팀장) */
export function canEditMembers(user: UserData | null): boolean {
  if (!user) return false
  if (isAdmin(user.role)) return true
  return user.user_departments?.some(ud => ud.is_team_leader) ?? false
}

/** 교인 삭제 권한 (관리자 또는 팀장) */
export function canDeleteMembers(user: UserData | null): boolean {
  return canEditMembers(user)
}

/** 보고서 삭제 권한
 * - 관리자: 모든 보고서 삭제 가능
 * - 작성자: 'draft' 또는 'rejected' 상태일 때만 삭제 가능
 */
export function canDeleteReport(
  user: UserData | null,
  report: { author_id: string; status: string }
): boolean {
  if (!user) return false
  if (canAccessAllDepartments(user.role)) return true
  return user.id === report.author_id && ['draft', 'rejected'].includes(report.status)
}

/** 보고서 수정 권한
 * - 관리자: 모든 보고서 수정 가능
 * - 작성자: 'draft' 또는 'rejected' 상태일 때만 수정 가능
 */
export function canEditReport(
  user: UserData | null,
  report: { author_id: string; status: string }
): boolean {
  if (!user) return false
  if (canAccessAllDepartments(user.role)) return true
  return user.id === report.author_id && ['draft', 'rejected'].includes(report.status)
}

/** 결재 권한 (회장/부장/최고관리자 또는 팀장 — 팀장은 셀장보고서만) */
export function canApprove(role: string): boolean {
  return ['super_admin', 'president', 'accountant', 'team_leader'].includes(role)
}

/** 팀장 여부 확인 */
export function isTeamLeader(user: UserData | null): boolean {
  if (!user) return false
  return user.user_departments?.some(ud => ud.is_team_leader) ?? false
}

/** 사용자가 접근 가능한 부서 ID 목록 */
export function getAccessibleDepartmentIds(user: UserData | null): string[] {
  if (!user) return []
  return user.user_departments?.map(ud => ud.department_id) || []
}

/** 팀장으로서 관리하는 부서 목록 */
export function getTeamLeaderDepartments(user: UserData | null): Array<{ id: string; name: string; code: string }> {
  if (!user) return []
  return user.user_departments
    ?.filter(ud => ud.is_team_leader)
    .map(ud => ud.departments) || []
}

// ─── 보고서 열람 권한 ─────────────────────────────────

/** 모든 보고서를 열람할 수 있는 사용자인지 확인 (관리자 + 팀장) */
export function canViewAllReports(user: UserData | null): boolean {
  if (!user) return false
  if (canAccessAllDepartments(user.role)) return true
  return user.user_departments?.some(ud => ud.is_team_leader) ?? false
}

/**
 * 보고서 열람 권한 체크
 * - 작성자: 항상 가능 (임시저장 포함)
 * - 관리자/결재자 (super_admin, president, accountant): 모든 보고서
 * - 팀장 (is_team_leader=true): 모든 보고서
 * - 셀장 (role=team_leader, is_team_leader=false): 소속 부서의 '셀장 보고서' 및 '주차 보고서'만
 * - 일반 멤버: 본인 보고서만
 */
export function canViewReport(
  user: UserData | null,
  report: { author_id: string; department_id: string; status?: string; report_type?: string },
  _authorIsTeamLeader?: boolean // 하위 호환성을 위해 유지
): boolean {
  if (!user) return false

  // 1. 작성자는 항상 열람 가능
  if (user.id === report.author_id) return true

  // 2. 임시저장(draft)은 작성자만
  if (report.status === 'draft') return false

  // 3. 관리자/결재자 (회장, 부장, 관리자) → 모든 보고서
  if (canAccessAllDepartments(user.role)) return true

  // 4. 부서장 (is_team_leader=true) → 모든 보고서
  if (user.user_departments?.some(ud => ud.is_team_leader)) return true

  // 5. 셀장 (role=team_leader, is_team_leader=false)
  if (user.role === 'team_leader') {
    const deptIds = user.user_departments?.map(ud => ud.department_id) || []
    const isSameDept = deptIds.includes(report.department_id)
    
    if (isSameDept) {
      // 주차(weekly) 보고서와 모든 셀장(cell_leader) 보고서는 부서 내에서 공유
      return report.report_type === 'weekly' || report.report_type === 'cell_leader'
    }
  }

  // 6. 일반 멤버 → 본인 보고서만 (이미 1번에서 처리됨)
  return false
}
