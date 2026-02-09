'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Department, Cell } from '@/types/database'

const supabase = createClient()

/** 전체 부서 목록 조회 */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 부서 데이터는 거의 안 변하므로 10분
  })
}

/** 특정 부서의 셀 목록 조회 */
export function useCells(departmentId?: string) {
  return useQuery({
    queryKey: ['cells', departmentId],
    queryFn: async (): Promise<Cell[]> => {
      if (!departmentId) return []
      const { data, error } = await supabase
        .from('cells')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('display_order')
      if (error) throw error
      return data || []
    },
    enabled: !!departmentId,
    staleTime: 10 * 60 * 1000,
  })
}
