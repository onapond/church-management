'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MeetingMinutesWithDetails, MeetingWithDetails } from '@/types/database'

const supabase = createClient()

const MEETING_SELECT = `
  *,
  departments(id, name),
  users!meetings_created_by_fkey(name)
`

const MEETING_MINUTES_SELECT = `
  *,
  users!meeting_minutes_updated_by_fkey(name)
`

export function useMeetings() {
  return useQuery({
    queryKey: ['meetings', 'list'],
    queryFn: async (): Promise<MeetingWithDetails[]> => {
      const { data, error } = await supabase
        .from('meetings')
        .select(MEETING_SELECT)
        .order('meeting_date', { ascending: false })

      if (error) throw error
      return (data || []) as MeetingWithDetails[]
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useMeetingDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['meetings', 'detail', id],
    queryFn: async (): Promise<MeetingWithDetails | null> => {
      const { data, error } = await supabase
        .from('meetings')
        .select(MEETING_SELECT)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as MeetingWithDetails | null
    },
    enabled: !!id,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useMeetingMinutes(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', 'minutes', meetingId],
    queryFn: async (): Promise<MeetingMinutesWithDetails | null> => {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select(MEETING_MINUTES_SELECT)
        .eq('meeting_id', meetingId!)
        .maybeSingle()

      if (error) throw error
      return data as MeetingMinutesWithDetails | null
    },
    enabled: !!meetingId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
