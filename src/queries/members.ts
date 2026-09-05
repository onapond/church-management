'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MemberWithDepts } from '@/types/shared'
import { getStorageObjectPath, signPhotoRecords } from '@/lib/storage'

const supabase = createClient()

const MEMBER_SELECT = 'id, name, phone, birth_date, department_id, is_active, photo_url, joined_at, member_departments(department_id, is_primary, cell_id, departments(id, name))'

/** 전체 교인 목록 조회 */
export function useMembers(departmentIds?: string[]) {
  return useQuery({
    queryKey: ['members', departmentIds],
    queryFn: async (): Promise<MemberWithDepts[]> => {
      if (departmentIds && departmentIds.length > 0) {
        // 특정 부서 교인만 조회
        const { data: memberDeptData } = await supabase
          .from('member_departments')
          .select('member_id')
          .in('department_id', departmentIds)

        const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]
        if (memberIds.length === 0) return []

        const { data, error } = await supabase
          .from('members')
          .select(MEMBER_SELECT)
          .in('id', memberIds)
          .order('name')
        if (error) throw error
        return signPhotoRecords(supabase, 'member-photos', (data || []) as unknown as MemberWithDepts[])
      }

      // 전체 교인 조회
      const { data, error } = await supabase
        .from('members')
        .select(MEMBER_SELECT)
        .order('name')
      if (error) throw error
      return signPhotoRecords(supabase, 'member-photos', (data || []) as unknown as MemberWithDepts[])
    },
    staleTime: 5 * 60_000, // 5분 캐싱
    placeholderData: keepPreviousData,
  })
}

/** 교인 삭제 mutation */
export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      // 부모 행 삭제가 실제로 성공한 뒤에만 Storage 정리를 수행한다.
      // FK cascade/restrict 판단도 DB에 맡겨 부분 삭제를 방지한다.
      const { data: member, error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)
        .select('photo_url')
        .single()
      if (error) throw error

      let storageWarning: string | undefined
      if (member?.photo_url) {
        const photoPath = getStorageObjectPath(member.photo_url, 'member-photos')
        if (photoPath) {
          const { error: storageError } = await supabase.storage.from('member-photos').remove([photoPath])
          if (storageError) storageWarning = '교인은 삭제되었지만 사진 파일 정리에 실패했습니다.'
        }
      }
      return { storageWarning }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
