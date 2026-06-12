import type { SupabaseClient } from '@supabase/supabase-js'
import { toLocalDateString } from '@/lib/utils'
import type { Database } from '@/types/database'

interface Department {
  id: string
  name: string
  code: string
}

export interface DepartmentStats {
  department: string
  code: string
  totalMembers: number
  worshipCount: number
  meetingCount: number
  worshipRate: number
  meetingRate: number
}

export interface WeeklyStats {
  week: string
  worship: number
  meeting: number
  total: number
}

type Period = 'month' | 'quarter' | 'year'
type DatabaseClient = SupabaseClient<Database>

type MemberDepartmentWithMember = {
  member_id: string
  department_id: string
  members: { is_active: boolean } | null
}

type AttendanceStatsRecord = {
  member_id: string
  attendance_type: Database['public']['Enums']['attendance_type']
  is_present: boolean
  attendance_date: string
}

type MemberDepartmentRecord = {
  member_id: string
}

export function getStartDate(period: Period): string {
  const now = new Date()
  let startDate: Date

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    startDate = new Date(now.getFullYear(), quarter * 3, 1)
  } else {
    startDate = new Date(now.getFullYear(), 0, 1)
  }

  return toLocalDateString(startDate)
}

function getWeekStart(date: Date): Date {
  const normalizedDate = new Date(date)
  const day = normalizedDate.getDay()
  const diff = normalizedDate.getDate() - day
  return new Date(normalizedDate.setDate(diff))
}

function formatWeek(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export async function computeDepartmentStats(
  supabase: DatabaseClient,
  departments: Department[],
  startDate: string,
  period: Period,
): Promise<DepartmentStats[]> {
  const { data: memberDepts } = await supabase
    .from('member_departments')
    .select('member_id, department_id, members!inner(id, is_active)')
    .eq('members.is_active', true)

  const activeMemberDepts = ((memberDepts || []) as MemberDepartmentWithMember[]).filter(
    (memberDepartment) => memberDepartment.members?.is_active,
  )

  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('member_id, attendance_type, is_present, attendance_date')
    .gte('attendance_date', startDate)
    .eq('is_present', true)

  const memberToDepartments = new Map<string, Set<string>>()
  activeMemberDepts.forEach((memberDepartment) => {
    if (!memberToDepartments.has(memberDepartment.member_id)) {
      memberToDepartments.set(memberDepartment.member_id, new Set())
    }

    memberToDepartments.get(memberDepartment.member_id)?.add(memberDepartment.department_id)
  })

  const departmentMemberCounts = new Map<string, number>()
  activeMemberDepts.forEach((memberDepartment) => {
    departmentMemberCounts.set(
      memberDepartment.department_id,
      (departmentMemberCounts.get(memberDepartment.department_id) || 0) + 1,
    )
  })

  const departmentStatsMap = new Map<string, { worship: number; meeting: number; total: number }>()
  departments.forEach((department) => {
    departmentStatsMap.set(department.id, {
      worship: 0,
      meeting: 0,
      total: departmentMemberCounts.get(department.id) || 0,
    })
  })

  ;((attendance || []) as AttendanceStatsRecord[]).forEach((record) => {
    const departmentIds = memberToDepartments.get(record.member_id)

    if (!departmentIds) return

    departmentIds.forEach((departmentId) => {
      const stats = departmentStatsMap.get(departmentId)
      if (!stats) return

      if (record.attendance_type === 'worship') {
        stats.worship += 1
      } else if (record.attendance_type === 'meeting') {
        stats.meeting += 1
      }
    })
  })

  const weeks = period === 'month' ? 4 : period === 'quarter' ? 13 : 52

  return departments.map((department) => {
    const data = departmentStatsMap.get(department.id) || { worship: 0, meeting: 0, total: 0 }
    const expectedAttendance = data.total * weeks

    return {
      department: department.name,
      code: department.code,
      totalMembers: data.total,
      worshipCount: data.worship,
      meetingCount: data.meeting,
      worshipRate: expectedAttendance > 0 ? Math.round((data.worship / expectedAttendance) * 100) : 0,
      meetingRate: expectedAttendance > 0 ? Math.round((data.meeting / expectedAttendance) * 100) : 0,
    }
  })
}

export async function computeWeeklyTrend(
  supabase: DatabaseClient,
  selectedDept: string,
  selectedCell: string,
  startDate: string,
): Promise<WeeklyStats[]> {
  let memberIds: string[] = []

  if (selectedDept !== 'all') {
    let memberDepartmentsQuery = supabase
      .from('member_departments')
      .select('member_id')
      .eq('department_id', selectedDept)

    if (selectedCell !== 'all') {
      memberDepartmentsQuery = memberDepartmentsQuery.eq('cell_id', selectedCell)
    }

    const { data: memberDepts } = await memberDepartmentsQuery
    const ids = ((memberDepts || []) as MemberDepartmentRecord[]).map((memberDepartment) => memberDepartment.member_id)
    memberIds = [...new Set(ids)]
  }

  let attendanceQuery = supabase
    .from('attendance_records')
    .select('attendance_date, attendance_type, is_present, member_id')
    .gte('attendance_date', startDate)
    .eq('is_present', true)

  if (selectedDept !== 'all' && memberIds.length > 0) {
    attendanceQuery = attendanceQuery.in('member_id', memberIds)
  }

  const { data: attendance } = await attendanceQuery

  const weekMap = new Map<string, { worship: number; meeting: number }>()
  ;((attendance || []) as AttendanceStatsRecord[]).forEach((record) => {
    const date = new Date(record.attendance_date)
    const weekStart = getWeekStart(date)
    const weekKey = toLocalDateString(weekStart)

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { worship: 0, meeting: 0 })
    }

    const stats = weekMap.get(weekKey)
    if (!stats) return

    if (record.attendance_type === 'worship') {
      stats.worship += 1
    } else if (record.attendance_type === 'meeting') {
      stats.meeting += 1
    }
  })

  let total = 0
  if (selectedDept === 'all') {
    const { count } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    total = count || 0
  } else {
    let totalQuery = supabase
      .from('member_departments')
      .select('member_id, members!inner(is_active)')
      .eq('department_id', selectedDept)
      .eq('members.is_active', true)

    if (selectedCell !== 'all') {
      totalQuery = totalQuery.eq('cell_id', selectedCell)
    }

    const { data: deptMembers } = await totalQuery
    total = deptMembers?.length || 0
  }

  return Array.from(weekMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([week, data]) => ({
      week: formatWeek(week),
      worship: data.worship,
      meeting: data.meeting,
      total,
    }))
}
