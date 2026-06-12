'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
import type { ReportSummary, UserDepartment } from '@/types/shared'

function getThisSunday(): string {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  return toLocalDateString(sunday)
}

export function useRecentReports() {
  return useQuery({
    queryKey: ['dashboard', 'recentReports'],
    queryFn: async (): Promise<ReportSummary[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return (data || []) as ReportSummary[]
    },
    staleTime: 30 * 1000,
  })
}

export function useThisWeekReport(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'thisWeekReport', userId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('id, status')
        .eq('report_date', getThisSunday())
        .eq('author_id', userId!)
        .maybeSingle()

      if (error) throw error
      return data as { id: string; status: string } | null
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

export function useDashboardPending(userRole: string | undefined, userDepts?: UserDepartment[]) {
  return useQuery({
    queryKey: ['dashboard', 'pending', userRole, 'v3'],
    queryFn: async (): Promise<ReportSummary[]> => {
      if (!userRole) return []

      const supabase = createClient()
      let query = supabase
        .from('weekly_reports')
        .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')

      if (userRole === 'super_admin') {
        query = query
          .in('status', ['submitted', 'coordinator_reviewed', 'manager_approved'])
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'president') {
        query = query
          .eq('status', 'submitted')
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'accountant') {
        query = query
          .eq('status', 'coordinator_reviewed')
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'team_leader') {
        const teamLeaderDeptIds = userDepts
          ?.filter((department) => department.is_team_leader)
          .map((department) => department.department_id) || []

        if (teamLeaderDeptIds.length === 0) return []

        query = query
          .eq('report_type', 'cell_leader')
          .eq('status', 'submitted')
          .in('department_id', teamLeaderDeptIds)
      } else {
        return []
      }

      const { data, error } = await query
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ReportSummary[]
    },
    enabled: !!userRole,
    staleTime: 0,
  })
}

export function useThisWeekStats(userDeptIds: string[]) {
  const sundayStr = getThisSunday()

  return useQuery({
    queryKey: ['dashboard', 'thisWeekStats', userDeptIds, sundayStr],
    queryFn: async () => {
      if (userDeptIds.length === 0) return { total: 0, worship: 0, meeting: 0 }

      const supabase = createClient()
      const { data: memberDeptRows, error: membersError } = await supabase
        .from('member_departments')
        .select('member_id, members!inner(id, is_active)')
        .in('department_id', userDeptIds)
        .eq('members.is_active', true)

      if (membersError) throw membersError

      const memberIds = Array.from(new Set(((memberDeptRows || []) as { member_id: string }[]).map((row) => row.member_id)))
      if (memberIds.length === 0) return { total: 0, worship: 0, meeting: 0 }

      const { data: attendanceResult, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('member_id, attendance_type')
        .eq('attendance_date', sundayStr)
        .eq('is_present', true)
        .in('member_id', memberIds)

      if (attendanceError) throw attendanceError

      const attendance = (attendanceResult || []) as { member_id: string; attendance_type: string }[]

      return {
        total: memberIds.length,
        worship: attendance.filter((item) => item.attendance_type === 'worship').length,
        meeting: attendance.filter((item) => item.attendance_type === 'meeting').length,
      }
    },
    enabled: userDeptIds.length > 0,
    staleTime: 60 * 1000,
  })
}
