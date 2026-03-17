'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database, Meeting, MeetingMinutesWithDetails } from '@/types/database'

const supabase = createClient()

type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
type MeetingMinutesInsert = Database['public']['Tables']['meeting_minutes']['Insert']

const MEETING_MINUTES_SELECT = `
  *,
  users!meeting_minutes_updated_by_fkey(name)
`

export function useCreateMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MeetingInsert): Promise<Meeting> => {
      const { data, error } = await supabase
        .from('meetings')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error
      return data as Meeting
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.setQueryData(['meetings', 'detail', meeting.id], meeting)
    },
  })
}

export function useUpsertMeetingMinutes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MeetingMinutesInsert): Promise<MeetingMinutesWithDetails> => {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .upsert(payload, { onConflict: 'meeting_id' })
        .select(MEETING_MINUTES_SELECT)
        .single()

      if (error) throw error
      return data as MeetingMinutesWithDetails
    },
    onSuccess: (minutes) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'minutes', minutes.meeting_id] })
      queryClient.setQueryData(['meetings', 'minutes', minutes.meeting_id], minutes)
    },
  })
}
