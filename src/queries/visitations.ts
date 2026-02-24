'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Visitation, VisitationStatus, VisitationReason } from '@/types/database'

const supabase = createClient()

export interface VisitationWithDetails extends Visitation {
  departments?: { name: string } | null
}

/** 심방 일정 목록 조회 (월별) */
export function useVisitations(year: number, month: number, departmentId?: string) {
  return useQuery({
    queryKey: ['visitations', year, month, departmentId],
    queryFn: async (): Promise<VisitationWithDetails[]> => {
      // 해당 월의 시작~끝 날짜
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      let query = supabase
        .from('visitations')
        .select('*, departments(name)')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date')
        .order('visit_time', { nullsFirst: false })

      if (departmentId) {
        query = query.eq('department_id', departmentId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as VisitationWithDetails[]
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  })
}

/** 심방 일정 등록 */
export function useCreateVisitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      member_id?: string | null
      member_name: string
      department_id?: string | null
      visit_date: string
      visit_time?: string | null
      visitor: string
      reason: VisitationReason
      notes?: string | null
      prayer_topics?: string | null
      report_content?: string | null
      created_by: string
    }) => {
      const { data, error } = await supabase
        .from('visitations')
        .insert(params)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitations'] })
    },
  })
}

/** 심방 일정 수정 */
export function useUpdateVisitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      id: string
      member_id?: string | null
      member_name?: string
      department_id?: string | null
      visit_date?: string
      visit_time?: string | null
      visitor?: string
      reason?: VisitationReason
      status?: VisitationStatus
      notes?: string | null
      prayer_topics?: string | null
      report_content?: string | null
    }) => {
      const { id, ...updates } = params
      const { error } = await supabase
        .from('visitations')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitations'] })
    },
  })
}

/** 심방 일정 삭제 */
export function useDeleteVisitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('visitations')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitations'] })
    },
  })
}
