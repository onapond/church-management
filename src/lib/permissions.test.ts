import { describe, it, expect } from 'vitest'
import {
  isAdmin,
  isAdminRole,
  canAccessAllDepartments,
  canAccessAccounting,
  canWriteReport,
  canCreateMeeting,
  canEditMeetingContent,
  canParticipateInMeetingAgenda,
  canLeaveMeetingFeedback,
  canViewMeeting,
  canEditMembers,
  canApprove,
  isTeamLeader,
  getAccessibleDepartmentIds,
  getTeamLeaderDepartments,
  canViewAllReports,
  canViewReport,
  canManageReport,
} from './permissions'
import type { UserData } from '@/types/shared'

function createUser(overrides: Partial<UserData> = {}): UserData {
  return {
    id: 'test-user',
    name: '테스트 사용자',
    role: 'member',
    is_active: true,
    departments: null,
    user_departments: [],
    ...overrides,
  }
}

describe('isAdmin', () => {
  it('super_admin은 관리자', () => {
    expect(isAdmin('super_admin')).toBe(true)
  })

  it('president는 관리자', () => {
    expect(isAdmin('president')).toBe(true)
  })

  it('team_leader는 관리자 아님', () => {
    expect(isAdmin('team_leader')).toBe(false)
  })

  it('member는 관리자 아님', () => {
    expect(isAdmin('member')).toBe(false)
  })
})

describe('isAdminRole', () => {
  it('accountant도 관리 메뉴 접근 가능', () => {
    expect(isAdminRole('accountant')).toBe(true)
  })
})

describe('canAccessAllDepartments', () => {
  it('super_admin 접근 가능', () => {
    expect(canAccessAllDepartments('super_admin')).toBe(true)
  })

  it('member 접근 불가', () => {
    expect(canAccessAllDepartments('member')).toBe(false)
  })
})

describe('canAccessAccounting', () => {
  it('team_leader 접근 가능', () => {
    expect(canAccessAccounting('team_leader')).toBe(true)
  })

  it('member 접근 불가', () => {
    expect(canAccessAccounting('member')).toBe(false)
  })
})

describe('canWriteReport', () => {
  it('null 사용자는 작성 불가', () => {
    expect(canWriteReport(null)).toBe(false)
  })

  it('super_admin은 작성 가능', () => {
    expect(canWriteReport(createUser({ role: 'super_admin' }))).toBe(true)
  })

  it('팀장 권한이 있으면 작성 가능', () => {
    const user = createUser({
      role: 'member',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(canWriteReport(user)).toBe(true)
  })

  it('일반 회원은 작성 불가', () => {
    expect(canWriteReport(createUser())).toBe(false)
  })
})

describe('canCreateMeeting', () => {
  it('super_admin은 회의 생성 가능', () => {
    expect(canCreateMeeting(createUser({ role: 'super_admin' }))).toBe(true)
  })

  it('president는 회의 생성 가능', () => {
    expect(canCreateMeeting(createUser({ role: 'president' }))).toBe(true)
  })

  it('team_leader는 회의 생성 가능', () => {
    expect(canCreateMeeting(createUser({ role: 'team_leader' }))).toBe(true)
  })

  it('member는 회의 생성 불가', () => {
    expect(canCreateMeeting(createUser({ role: 'member' }))).toBe(false)
  })
})

describe('canViewMeeting', () => {
  it('활성 사용자면 회의 열람 가능', () => {
    expect(canViewMeeting(createUser({ is_active: true }))).toBe(true)
  })

  it('비활성 사용자는 회의 열람 불가', () => {
    expect(canViewMeeting(createUser({ is_active: false }))).toBe(false)
  })
})

describe('canEditMeetingContent', () => {
  it('president can edit meeting content', () => {
    expect(canEditMeetingContent(createUser({ role: 'president' }))).toBe(true)
  })

  it('member cannot edit meeting content', () => {
    expect(canEditMeetingContent(createUser({ role: 'member' }))).toBe(false)
  })

  it('team leader can edit meeting content only for led departments', () => {
    const user = createUser({
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })

    expect(canEditMeetingContent(user, 'dept-1')).toBe(true)
    expect(canEditMeetingContent(user, 'dept-2')).toBe(false)
  })
})

describe('canParticipateInMeetingAgenda', () => {
  it('team_leader role can participate even when the department leader flag is false', () => {
    const user = createUser({
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: false,
        departments: { id: 'dept-1', name: 'Worship', code: 'cu_worship' },
      }],
    })

    expect(canParticipateInMeetingAgenda(user)).toBe(true)
  })

  it('member role cannot participate in meeting agenda discussion', () => {
    expect(canParticipateInMeetingAgenda(createUser({ role: 'member' }))).toBe(false)
  })
})

describe('canLeaveMeetingFeedback', () => {
  const meeting = { created_by: 'creator-1', department_id: 'dept-1' }

  it('admins can leave meeting feedback', () => {
    expect(canLeaveMeetingFeedback(createUser({ role: 'president' }), meeting)).toBe(true)
    expect(canLeaveMeetingFeedback(createUser({ role: 'accountant' }), meeting)).toBe(true)
  })

  it('meeting creator can leave meeting feedback', () => {
    expect(canLeaveMeetingFeedback(createUser({ id: 'creator-1' }), meeting)).toBe(true)
  })

  it('team leader can leave feedback only for led meeting department', () => {
    const user = createUser({
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })

    expect(canLeaveMeetingFeedback(user, meeting)).toBe(true)
    expect(canLeaveMeetingFeedback(user, { ...meeting, department_id: 'dept-2' })).toBe(false)
  })
})

describe('canEditMembers', () => {
  it('관리자는 편집 가능', () => {
    expect(canEditMembers(createUser({ role: 'president' }))).toBe(true)
  })

  it('팀장은 편집 가능', () => {
    const user = createUser({
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(canEditMembers(user)).toBe(true)
  })

  it('일반 회원은 편집 불가', () => {
    expect(canEditMembers(createUser())).toBe(false)
  })
})

describe('canManageReport', () => {
  it('관리자는 제출 상태 보고서도 수정 가능', () => {
    expect(canManageReport('president', 'admin-1', { author_id: 'author-1', status: 'submitted' })).toBe(true)
  })

  it('작성자는 draft 상태만 수정 가능', () => {
    expect(canManageReport('member', 'author-1', { author_id: 'author-1', status: 'draft' })).toBe(true)
    expect(canManageReport('member', 'author-1', { author_id: 'author-1', status: 'submitted' })).toBe(false)
  })
})

describe('canApprove', () => {
  it('president는 결재 가능', () => {
    expect(canApprove('president')).toBe(true)
  })

  it('member는 결재 불가', () => {
    expect(canApprove('member')).toBe(false)
  })
})

describe('isTeamLeader', () => {
  it('팀장 여부 올바르게 반환', () => {
    const user = createUser({
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' },
      }],
    })
    expect(isTeamLeader(user)).toBe(true)
  })
})

describe('getAccessibleDepartmentIds', () => {
  it('소속 부서 ID 목록 반환', () => {
    const user = createUser({
      user_departments: [
        { department_id: 'dept-1', is_team_leader: false, departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' } },
        { department_id: 'dept-2', is_team_leader: true, departments: { id: 'dept-2', name: 'CU2부', code: 'cu2' } },
      ],
    })
    expect(getAccessibleDepartmentIds(user)).toEqual(['dept-1', 'dept-2'])
  })

  it('null 사용자는 빈 배열', () => {
    expect(getAccessibleDepartmentIds(null)).toEqual([])
  })
})

describe('getTeamLeaderDepartments', () => {
  it('팀장으로 관리하는 부서만 반환', () => {
    const user = createUser({
      user_departments: [
        { department_id: 'dept-1', is_team_leader: false, departments: { id: 'dept-1', name: 'CU1부', code: 'cu1' } },
        { department_id: 'dept-2', is_team_leader: true, departments: { id: 'dept-2', name: 'CU2부', code: 'cu2' } },
      ],
    })
    const result = getTeamLeaderDepartments(user)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('CU2부')
  })
})

describe('canViewAllReports', () => {
  it('관리자 역할만 전체 보고서 전역 열람 권한을 가진다', () => {
    expect(canViewAllReports(createUser({ role: 'super_admin' }))).toBe(true)
    expect(canViewAllReports(createUser({ role: 'president' }))).toBe(true)
    expect(canViewAllReports(createUser({ role: 'accountant' }))).toBe(true)
  })

  it('부서 팀장과 일반 셀장은 전역 전체 보고서 열람 권한이 없다', () => {
    const departmentLeader = createUser({
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: '1청년', code: 'cu1' },
      }],
    })
    const cellLeader = createUser({
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: false,
        departments: { id: 'dept-1', name: '1청년', code: 'cu1' },
      }],
    })

    expect(canViewAllReports(departmentLeader)).toBe(false)
    expect(canViewAllReports(cellLeader)).toBe(false)
  })
})

describe('canViewReport', () => {
  const report = { author_id: 'author-1', department_id: 'dept-1', status: 'submitted' }

  it('null 사용자는 열람 불가', () => {
    expect(canViewReport(null, report, false)).toBe(false)
  })

  it('작성자는 항상 열람 가능', () => {
    const user = createUser({ id: 'author-1', role: 'member' })
    expect(canViewReport(user, report, false)).toBe(true)
  })

  it('작성자는 draft도 열람 가능', () => {
    const user = createUser({ id: 'author-1', role: 'member' })
    const draftReport = { ...report, status: 'draft' }
    expect(canViewReport(user, draftReport, false)).toBe(true)
  })

  it('타인의 draft는 열람 불가', () => {
    const user = createUser({ id: 'other', role: 'super_admin' })
    const draftReport = { ...report, status: 'draft' }
    expect(canViewReport(user, draftReport, false)).toBe(false)
  })

  it('super_admin은 모든 보고서 열람 가능', () => {
    const user = createUser({ id: 'admin', role: 'super_admin' })
    expect(canViewReport(user, report, false)).toBe(true)
    expect(canViewReport(user, report, true)).toBe(true)
  })

  it('president는 모든 보고서 열람 가능', () => {
    const user = createUser({ id: 'pres', role: 'president' })
    expect(canViewReport(user, report, false)).toBe(true)
  })

  it('accountant는 모든 보고서 열람 가능', () => {
    const user = createUser({ id: 'acc', role: 'accountant' })
    expect(canViewReport(user, report, true)).toBe(true)
  })

  it('다른 부서 소속이면 열람 불가', () => {
    const user = createUser({
      id: 'other',
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-2',
        is_team_leader: false,
        departments: { id: 'dept-2', name: '청소년부', code: 'youth' },
      }],
    })
    expect(canViewReport(user, report, false)).toBe(false)
  })

  it('부서 팀장(is_team_leader=true)은 담당 부서의 제출된 보고서를 열람할 수 있다', () => {
    const user = createUser({
      id: 'leader',
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: true,
        departments: { id: 'dept-1', name: '1청년', code: 'cu1' },
      }],
    })
    expect(canViewReport(user, report, true)).toBe(true)
    expect(canViewReport(user, report, false)).toBe(true)
  })

  it('일반 셀장(is_team_leader=false)은 같은 부서의 다른 셀장 보고서를 열람할 수 없다', () => {
    const user = createUser({
      id: 'cell-leader',
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: false,
        departments: { id: 'dept-1', name: '1청년', code: 'cu1' },
      }],
    })
    expect(canViewReport(user, report, false)).toBe(false)
    expect(canViewReport(user, report, true)).toBe(false)
    const otherDeptReport = { author_id: 'other', department_id: 'dept-2', status: 'submitted' }
    expect(canViewReport(user, otherDeptReport)).toBe(false)
  })

  it('일반 멤버는 타인 보고서 열람 불가', () => {
    const user = createUser({
      id: 'member-1',
      role: 'member',
      user_departments: [{
        department_id: 'dept-1',
        is_team_leader: false,
        departments: { id: 'dept-1', name: '1청년', code: 'cu1' },
      }],
    })
    expect(canViewReport(user, report, false)).toBe(false)
  })

  it('같은 부서 일반 셀장끼리도 서로의 보고서를 열람할 수 없다', () => {
    const teamLeaderA = createUser({
      id: 'tl-a',
      role: 'team_leader',
      user_departments: [{
        department_id: 'dept-youth',
        is_team_leader: false,
        departments: { id: 'dept-youth', name: '청소년부', code: 'youth' },
      }],
    })
    const reportByB = { author_id: 'tl-b', department_id: 'dept-youth', status: 'submitted' }
    expect(canViewReport(teamLeaderA, reportByB, false)).toBe(false)
  })
})
