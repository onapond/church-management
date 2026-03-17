'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { canEditMeetingContent, canViewMeeting } from '@/lib/permissions'
import { useAuth } from '@/providers/AuthProvider'
import { useToastContext } from '@/providers/ToastProvider'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMeetingDetail, useMeetingMinutes } from '@/queries/meetings/useMeetings'
import { useUpsertMeetingMinutes } from '@/queries/meetings/useCreateMeeting'

interface MeetingDetailProps {
  meetingId: string
}

interface MinutesFormState {
  discussion_notes: string
  decisions: string
  handoff_notes: string
}

const EMPTY_FORM: MinutesFormState = {
  discussion_notes: '',
  decisions: '',
  handoff_notes: '',
}

const MINUTES_SECTIONS: Array<{
  key: keyof MinutesFormState
  title: string
  placeholder: string
}> = [
  {
    key: 'discussion_notes',
    title: 'Discussion Notes',
    placeholder: 'Record agenda flow, context, and notable discussion points.',
  },
  {
    key: 'decisions',
    title: 'Decisions',
    placeholder: 'Capture agreed decisions, owners, or next-step agreements.',
  },
  {
    key: 'handoff_notes',
    title: 'Handoff Notes',
    placeholder: 'Write what should be handed off to the next leader or meeting.',
  },
]

const FUTURE_SECTIONS = [
  {
    title: 'Tasks',
    description: 'Task linkage stays additive and will be connected in a later phase.',
  },
  {
    title: 'AI Summary',
    description: 'AI meeting assistant remains a separate plugin or add-on layer.',
  },
]

export default function MeetingDetail({ meetingId }: MeetingDetailProps) {
  const { user } = useAuth()
  const toast = useToastContext()
  const { data: meeting, isLoading } = useMeetingDetail(meetingId)
  const { data: minutes, isLoading: minutesLoading } = useMeetingMinutes(meetingId)
  const upsertMinutes = useUpsertMeetingMinutes()
  const [form, setForm] = useState<MinutesFormState>(EMPTY_FORM)
  const canEdit = canEditMeetingContent(user, meeting?.department_id)

  useEffect(() => {
    setForm({
      discussion_notes: minutes?.discussion_notes ?? '',
      decisions: minutes?.decisions ?? '',
      handoff_notes: minutes?.handoff_notes ?? '',
    })
  }, [minutes?.discussion_notes, minutes?.decisions, minutes?.handoff_notes])

  async function handleSave() {
    if (!user || !canEdit) {
      toast.error('You do not have permission to edit meeting minutes.')
      return
    }

    try {
      await upsertMinutes.mutateAsync({
        meeting_id: meetingId,
        discussion_notes: normalizeTextareaValue(form.discussion_notes),
        decisions: normalizeTextareaValue(form.decisions),
        handoff_notes: normalizeTextareaValue(form.handoff_notes),
        updated_by: user.id,
      })
      toast.success('Meeting minutes saved.')
    } catch (error) {
      console.error('Failed to save meeting minutes:', error)
      toast.error('Failed to save meeting minutes.')
    }
  }

  if (!canViewMeeting(user)) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
        You do not have permission to view this meeting.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Meeting not found.</h2>
        <Link href="/meetings" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to meetings
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-blue-600">{meeting.departments?.name || '-'}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{meeting.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
              <span>Date: {formatMeetingDate(meeting.meeting_date)}</span>
              <span>Location: {meeting.location || '-'}</span>
              <span>Created by: {meeting.users?.name || '-'}</span>
            </div>
          </div>
          <Link href="/meetings" className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700">
            List
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Meeting Description</h2>
        <div className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {meeting.description?.trim() || 'No base meeting description was recorded.'}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Structured Minutes</h2>
            <p className="mt-1 text-sm text-gray-500">
              Operational notes are stored separately so the Phase 1 meeting record stays stable.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {minutes?.updated_at ? `Last saved ${formatUpdatedAt(minutes.updated_at)}` : 'Not saved yet'}
            {minutes?.users?.name ? ` by ${minutes.users.name}` : ''}
          </div>
        </div>

        {minutesLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {MINUTES_SECTIONS.map((section) => {
              const value = form[section.key]
              const readOnlyValue = value.trim() || 'No content yet.'

              return (
                <div key={section.key} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{section.title}</h3>
                  {canEdit ? (
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [section.key]: event.target.value,
                        }))
                      }
                      rows={6}
                      placeholder={section.placeholder}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    <div className="min-h-24 whitespace-pre-wrap rounded-xl bg-white px-3 py-3 text-sm leading-6 text-gray-700">
                      {readOnlyValue}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {canEdit ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertMinutes.isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upsertMinutes.isPending ? 'Saving...' : 'Save Minutes'}
            </button>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {FUTURE_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-dashed border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
            <p className="mt-2 text-sm text-gray-500">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function normalizeTextareaValue(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  })
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
