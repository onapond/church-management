'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MeetingFeedbackWithDetails, MeetingMinutesWithDetails, MeetingWithDetails } from '@/types/database'

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

const MEETING_FEEDBACK_SELECT = `
  *,
  users!meeting_feedback_commenter_id_fkey(name, role)
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

export function useMeetingPdfUrl(filePath: string | null | undefined) {
  return useQuery({
    queryKey: ['meetings', 'pdf-url', filePath],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from('meeting-pdfs')
        .createSignedUrl(filePath!, 60 * 60)

      if (error) throw error
      return data.signedUrl
    },
    enabled: !!filePath,
    staleTime: 50 * 60 * 1000,
  })
}

export function useMeetingFeedback(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', 'feedback', meetingId],
    queryFn: async (): Promise<MeetingFeedbackWithDetails[]> => {
      const { data, error } = await supabase
        .from('meeting_feedback')
        .select(MEETING_FEEDBACK_SELECT)
        .eq('meeting_id', meetingId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as MeetingFeedbackWithDetails[]
    },
    enabled: !!meetingId,
    staleTime: 30_000,
  })
}
