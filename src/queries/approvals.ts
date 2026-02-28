'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { UserDepartment } from '@/types/shared'

const supabase = createClient()

export interface ApprovalReport {
  id: string
  meeting_title: string | null
  report_date: string
  status: string
  created_at: string
  departments: { name: string; code: string } | null
  users: { name: string } | null
}

const REPORT_SELECT = `
  *,
  departments(name, code),
  users!weekly_reports_author_id_fkey(name)
`

/** 결재 대기 보고서 조회 */
export function usePendingReports(userRole: string, userDepts?: UserDepartment[]) {
  return useQuery({
    queryKey: ['approvals', 'pending', userRole, 'v2'],
    queryFn: async (): Promise<any[]> => {
      if (!userRole) return []

      let query = supabase
        .from('weekly_reports')
        .select('*, departments(name, code), users!weekly_reports_author_id_fkey(name)')

      if (userRole === 'super_admin') {
        // super_admin은 셀장보고서 제외한 결재 대기만
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
        // 팀장: 자기 부서의 셀장보고서(submitted)만
        const teamLeaderDeptIds = userDepts
          ?.filter(ud => ud.is_team_leader)
          .map(ud => ud.department_id) || []
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

      if (error) {
        console.error('Pending reports fetch error:', error)
        throw error
      }
      return data || []
    },
    enabled: !!userRole,
    staleTime: 0,
  })
}

/** 처리 완료 보고서 조회 */
export function useCompletedReports(userRole: string, userDepts?: UserDepartment[]) {
  return useQuery({
    queryKey: ['approvals', 'completed', userRole],
    queryFn: async (): Promise<ApprovalReport[]> => {
      let query = supabase
        .from('weekly_reports')
        .select(REPORT_SELECT)
        .order('created_at', { ascending: false })
        .limit(20)

      if (userRole === 'super_admin') {
        query = query
          .eq('status', 'final_approved')
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'president') {
        query = query
          .in('status', ['coordinator_reviewed', 'manager_approved', 'final_approved'])
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'accountant') {
        query = query
          .in('status', ['manager_approved', 'final_approved'])
          .neq('report_type', 'cell_leader')
      } else if (userRole === 'team_leader') {
        // 팀장: 자기 부서의 셀장보고서(final_approved, rejected)만
        const teamLeaderDeptIds = userDepts
          ?.filter(ud => ud.is_team_leader)
          .map(ud => ud.department_id) || []
        if (teamLeaderDeptIds.length === 0) return []
        query = query
          .eq('report_type', 'cell_leader')
          .in('status', ['final_approved', 'rejected'])
          .in('department_id', teamLeaderDeptIds)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as ApprovalReport[]
    },
    enabled: !!userRole,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
