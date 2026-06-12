'use client'

import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/AuthProvider'
import { canCreateMeeting, canDeleteMeeting, canViewMeeting } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { useMeetings } from '@/queries/meetings/useMeetings'
import { deleteMeetingBundle } from '@/components/meetings/utils/meetingDeletion'

const supabase = createClient()

export default function MeetingList() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: meetings = [], isLoading, isFetching } = useMeetings()

  const handleDelete = async (meetingId: string, meetingTitle: string) => {
    if (!user) return
    if (!window.confirm(`"${meetingTitle}" 회의를 삭제하시겠습니까?`)) return

    try {
      await deleteMeetingBundle(supabase, meetingId)
      await queryClient.invalidateQueries({ queryKey: ['meetings'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (error) {
      console.error('Failed to delete meeting:', error)
    }
  }

  if (!canViewMeeting(user)) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
        회의 목록을 조회할 권한이 없습니다.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-xl">회의</h1>
          <p className="mt-0.5 text-sm text-gray-500">부서별 회의 기록과 운영 메모를 관리합니다.</p>
        </div>
        {canCreateMeeting(user) && (
          <Link
            href="/meetings/new"
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            새 회의
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">등록된 회의가 없습니다.</p>
            {canCreateMeeting(user) && (
              <Link href="/meetings/new" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
                첫 회의 등록하기
              </Link>
            )}
          </div>
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_160px_120px] gap-4 border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
              <span>제목</span>
              <span>부서</span>
              <span>회의일</span>
              <span>작성자</span>
            </div>
            <div className="divide-y divide-gray-100">
              {meetings.map((meeting) => {
                const canDelete = canDeleteMeeting(user, meeting)

                return (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <Link href={`/meetings/${meeting.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                        📋
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{meeting.title}</p>
                        {meeting.location ? <p className="mt-1 truncate text-xs text-gray-500">장소: {meeting.location}</p> : null}
                      </div>
                      <p className="hidden text-sm text-gray-600 md:block">{meeting.departments?.name || '-'}</p>
                      <p className="hidden text-sm text-gray-600 md:block">{formatMeetingDate(meeting.meeting_date)}</p>
                      <p className="hidden text-sm text-gray-600 md:block">{meeting.users?.name || '-'}</p>
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(meeting.id, meeting.title)}
                        className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                        title="삭제"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
