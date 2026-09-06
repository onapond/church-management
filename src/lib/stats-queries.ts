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
type AttendanceType = Database['public']['Enums']['attendance_type']

type HistoricalMember = {
  id: string
  is_active: boolean
  joined_at: string
  updated_at: string
}

type MemberDepartmentWithMember = {
  member_id: string
  department_id: string
  created_at: string
  members: HistoricalMember | null
}

type AttendanceStatsRecord = {
  member_id: string
  attendance_type: AttendanceType
  is_present: boolean
  attendance_date: string
  report_id?: string | null
  weekly_reports?: { department_id: string; report_type: string } | null
}

type ScopedMemberRecord = {
  member_id: string
  created_at: string
  members: HistoricalMember | null
}

type MemberWeekSets = {
  worship: Set<string>
  meeting: Set<string>
}

function parseDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00`)
}

function endOfWeek(weekStart: string): string {
  const date = parseDate(weekStart)
  date.setDate(date.getDate() + 6)
  return toLocalDateString(date)
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

export function getWeekKey(dateStr: string): string {
  const date = parseDate(dateStr)
  date.setDate(date.getDate() - date.getDay())
  return toLocalDateString(date)
}

export function getWeekKeys(startDate: string, endDate: string): string[] {
  const firstWeek = parseDate(getWeekKey(startDate))
  const lastWeek = getWeekKey(endDate)
  const weeks: string[] = []

  for (const cursor = firstWeek; toLocalDateString(cursor) <= lastWeek; cursor.setDate(cursor.getDate() + 7)) {
    weeks.push(toLocalDateString(cursor))
  }

  return weeks
}

function formatWeek(dateStr: string): string {
  const date = parseDate(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function wasEligibleInWeek(member: HistoricalMember, membershipCreatedAt: string, week: string): boolean {
  const weekEnd = endOfWeek(week)
  const membershipStart = membershipCreatedAt.slice(0, 10)
  const joinedAt = member.joined_at.slice(0, 10)
  const inactiveAt = member.updated_at.slice(0, 10)

  return membershipStart <= weekEnd
    && joinedAt <= weekEnd
    && (member.is_active || inactiveAt >= week)
}

function emptyMemberWeekSets(): MemberWeekSets {
  return { worship: new Set<string>(), meeting: new Set<string>() }
}

function addAttendance(target: Map<string, MemberWeekSets>, key: string, record: AttendanceStatsRecord) {
  const sets = target.get(key) || emptyMemberWeekSets()
  sets[record.attendance_type].add(record.member_id)
  target.set(key, sets)
}

function throwQueryError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`)
}

export async function computeDepartmentStats(
  supabase: DatabaseClient,
  departments: Department[],
  startDate: string,
): Promise<DepartmentStats[]> {
  const endDate = toLocalDateString(new Date())
  const weekKeys = getWeekKeys(startDate, endDate)
  const departmentIds = new Set(departments.map(department => department.id))

  const { data: memberDepts, error: memberError } = await supabase
    .from('member_departments')
    .select('member_id, department_id, created_at, members!inner(id, is_active, joined_at, updated_at)')
    .in('department_id', [...departmentIds])
  throwQueryError(memberError, 'Failed to load department members')

  const memberships = ((memberDepts || []) as MemberDepartmentWithMember[])
    .filter(membership => membership.members && departmentIds.has(membership.department_id))

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('member_id, attendance_type, is_present, attendance_date, report_id, weekly_reports(department_id, report_type)')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .eq('is_present', true)
  throwQueryError(attendanceError, 'Failed to load attendance statistics')

  const memberToDepartments = new Map<string, Set<string>>()
  memberships.forEach(membership => {
    const ids = memberToDepartments.get(membership.member_id) || new Set<string>()
    ids.add(membership.department_id)
    memberToDepartments.set(membership.member_id, ids)
  })

  const presentByDepartmentWeek = new Map<string, MemberWeekSets>()
  ;((attendance || []) as AttendanceStatsRecord[]).forEach(record => {
    const reportDepartmentId = record.report_id ? record.weekly_reports?.department_id : null
    const recordDepartmentIds = reportDepartmentId
      ? new Set([reportDepartmentId])
      : memberToDepartments.get(record.member_id)

    recordDepartmentIds?.forEach(departmentId => {
      if (!departmentIds.has(departmentId)) return
      addAttendance(presentByDepartmentWeek, `${departmentId}:${getWeekKey(record.attendance_date)}`, record)
    })
  })

  return departments.map(department => {
    const departmentMemberships = memberships.filter(item => item.department_id === department.id)
    const currentMembers = new Set(
      departmentMemberships.filter(item => item.members?.is_active).map(item => item.member_id),
    )
    let expectedAttendance = 0
    let worshipCount = 0
    let meetingCount = 0

    weekKeys.forEach(week => {
      const eligible = new Set(
        departmentMemberships
          .filter(item => item.members && wasEligibleInWeek(item.members, item.created_at, week))
          .map(item => item.member_id),
      )
      const present = presentByDepartmentWeek.get(`${department.id}:${week}`) || emptyMemberWeekSets()

      // Historical rows prove that a member belonged in that week's denominator,
      // even when the current membership table can no longer describe the past.
      present.worship.forEach(memberId => eligible.add(memberId))
      present.meeting.forEach(memberId => eligible.add(memberId))

      expectedAttendance += eligible.size
      worshipCount += present.worship.size
      meetingCount += present.meeting.size
    })

    return {
      department: department.name,
      code: department.code,
      totalMembers: currentMembers.size,
      worshipCount,
      meetingCount,
      worshipRate: expectedAttendance > 0 ? Math.round((worshipCount / expectedAttendance) * 100) : 0,
      meetingRate: expectedAttendance > 0 ? Math.round((meetingCount / expectedAttendance) * 100) : 0,
    }
  })
}

export async function computeWeeklyTrend(
  supabase: DatabaseClient,
  selectedDept: string,
  selectedCell: string,
  startDate: string,
): Promise<WeeklyStats[]> {
  const endDate = toLocalDateString(new Date())
  const weeks = getWeekKeys(startDate, endDate)
  let scopedMembers: Array<{ member: HistoricalMember; membershipCreatedAt: string }> = []
  let memberIds: string[] | null = null

  if (selectedDept === 'all') {
    const { data: members, error } = await supabase
      .from('members')
      .select('id, is_active, joined_at, updated_at')
    throwQueryError(error, 'Failed to load members for weekly statistics')

    scopedMembers = ((members || []) as HistoricalMember[]).map(member => ({
      member,
      membershipCreatedAt: member.joined_at,
    }))
  } else {
    let memberDepartmentsQuery = supabase
      .from('member_departments')
      .select('member_id, created_at, members!inner(id, is_active, joined_at, updated_at)')
      .eq('department_id', selectedDept)

    if (selectedCell !== 'all') {
      memberDepartmentsQuery = memberDepartmentsQuery.eq('cell_id', selectedCell)
    }

    const { data: memberDepts, error } = await memberDepartmentsQuery
    throwQueryError(error, 'Failed to load filtered members for weekly statistics')

    const memberships = ((memberDepts || []) as ScopedMemberRecord[]).filter(item => item.members)
    memberIds = [...new Set(memberships.map(item => item.member_id))]

    // A real empty filter result must stay empty; omitting `.in()` used to expand
    // this case into attendance for every member.
    if (memberIds.length === 0) {
      return weeks.map(week => ({ week: formatWeek(week), worship: 0, meeting: 0, total: 0 }))
    }

    scopedMembers = memberships.map(item => ({
      member: item.members as HistoricalMember,
      membershipCreatedAt: item.created_at,
    }))
  }

  let attendanceQuery = supabase
    .from('attendance_records')
    .select('attendance_date, attendance_type, is_present, member_id')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .eq('is_present', true)

  if (memberIds) {
    attendanceQuery = attendanceQuery.in('member_id', memberIds)
  }

  const { data: attendance, error: attendanceError } = await attendanceQuery
  throwQueryError(attendanceError, 'Failed to load weekly attendance')

  const presentByWeek = new Map<string, MemberWeekSets>()
  ;((attendance || []) as AttendanceStatsRecord[]).forEach(record => {
    addAttendance(presentByWeek, getWeekKey(record.attendance_date), record)
  })

  return weeks.map(week => {
    const eligible = new Set(
      scopedMembers
        .filter(item => wasEligibleInWeek(item.member, item.membershipCreatedAt, week))
        .map(item => item.member.id),
    )
    const present = presentByWeek.get(week) || emptyMemberWeekSets()
    present.worship.forEach(memberId => eligible.add(memberId))
    present.meeting.forEach(memberId => eligible.add(memberId))

    return {
      week: formatWeek(week),
      worship: present.worship.size,
      meeting: present.meeting.size,
      total: eligible.size,
    }
  })
}
