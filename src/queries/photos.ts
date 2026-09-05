'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DepartmentPhoto } from '@/types/database'
import { signPhotoRecords } from '@/lib/storage'

const supabase = createClient()

export interface Photo extends DepartmentPhoto {
  departments: { name: string } | null
  users: { name: string } | null
}

/** 부서별 사진 조회 */
export function usePhotos(departmentId: string) {
  return useQuery({
    queryKey: ['photos', departmentId],
    queryFn: async (): Promise<Photo[]> => {
      let query = supabase
        .from('department_photos')
        .select('*, departments(name), users:uploaded_by(name)')
        .order('photo_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (departmentId !== 'all') {
        query = query.eq('department_id', departmentId)
      }

      const { data, error } = await query
      if (error) throw error
      const signedPhotos = await signPhotoRecords(supabase, 'department-photos', (data || []) as Photo[])
      return signedPhotos.filter((photo) => !!photo.photo_url)
    },
    staleTime: 60_000,
  })
}
