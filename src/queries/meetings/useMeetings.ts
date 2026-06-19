'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Database,
  MeetingAgendaItemWithDetails,
  MeetingAgendaStatus,
  MeetingFeedbackWithDetails,
  MeetingMinutesWithDetails,
  MeetingWithDetails,
} from '@/types/database'

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

const MEETING_AGENDA_SELECT = `
  *,
  departments(id, name),
  users!meeting_agenda_items_author_id_fkey(name, role),
  meeting_agenda_comments(
    *,
    users!meeting_agenda_comments_commenter_id_fkey(name, role)
  )
`

type MeetingAgendaInsert = Database['public']['Tables']['meeting_agenda_items']['Insert']
type MeetingAgendaUpdate = Database['public']['Tables']['meeting_agenda_items']['Update']
type MeetingAgendaCommentInsert = Database['public']['Tables']['meeting_agenda_comments']['Insert']
type MeetingAgendaCommentUpdate = Database['public']['Tables']['meeting_agenda_comments']['Update']
type MeetingUpdate = Database['public']['Tables']['meetings']['Update']

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

export function useUpdateMeeting(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MeetingUpdate): Promise<MeetingWithDetails> => {
      const { data, error } = await supabase
        .from('meetings')
        .update(payload)
        .eq('id', meetingId)
        .select(MEETING_SELECT)
        .single()

      if (error) throw error
      return data as MeetingWithDetails
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.setQueryData(['meetings', 'detail', meeting.id], meeting)
    },
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

export function useMeetingAgendaPdfUrl(filePath: string | null | undefined) {
  return useQuery({
    queryKey: ['meetings', 'agenda-pdf-url', filePath],
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

export function useMeetingAgendaItems(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', 'agenda', meetingId],
    queryFn: async (): Promise<MeetingAgendaItemWithDetails[]> => {
      const { data, error } = await supabase
        .from('meeting_agenda_items')
        .select(MEETING_AGENDA_SELECT)
        .eq('meeting_id', meetingId!)
        .order('created_at', { ascending: true })

      if (error) throw error

      return ((data || []) as MeetingAgendaItemWithDetails[]).map((item) => ({
        ...item,
        meeting_agenda_comments: [...(item.meeting_agenda_comments || [])].sort((first, second) =>
          first.created_at.localeCompare(second.created_at)
        ),
      }))
    },
    enabled: !!meetingId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function useCreateMeetingAgendaItem(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MeetingAgendaInsert) => {
      const { data, error } = await supabase
        .from('meeting_agenda_items')
        .insert(payload)
        .select(MEETING_AGENDA_SELECT)
        .single()

      if (error) throw error
      return data as MeetingAgendaItemWithDetails
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useCreateMeetingAgendaComment(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MeetingAgendaCommentInsert) => {
      const { data, error } = await supabase
        .from('meeting_agenda_comments')
        .insert(payload)
        .select('*, users!meeting_agenda_comments_commenter_id_fkey(name, role)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useUpdateMeetingAgendaStatus(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: MeetingAgendaStatus }) => {
      const { data, error } = await supabase
        .from('meeting_agenda_items')
        .update({ status })
        .eq('id', itemId)
        .select(MEETING_AGENDA_SELECT)
        .single()

      if (error) throw error
      return data as MeetingAgendaItemWithDetails
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useUpdateMeetingAgendaItem(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: MeetingAgendaUpdate }) => {
      const { data, error } = await supabase
        .from('meeting_agenda_items')
        .update(payload)
        .eq('id', itemId)
        .select(MEETING_AGENDA_SELECT)
        .single()

      if (error) throw error
      return data as MeetingAgendaItemWithDetails
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useUpdateMeetingAgendaComment(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, payload }: { commentId: string; payload: MeetingAgendaCommentUpdate }) => {
      const { data, error } = await supabase
        .from('meeting_agenda_comments')
        .update(payload)
        .eq('id', commentId)
        .select('*, users!meeting_agenda_comments_commenter_id_fkey(name, role)')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useDeleteMeetingAgendaItem(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('meeting_agenda_items').delete().eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}

export function useDeleteMeetingAgendaComment(meetingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('meeting_agenda_comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'agenda', meetingId] })
    },
  })
}
