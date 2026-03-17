'use client'

import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { canCreateMeeting, canViewMeeting } from '@/lib/permissions'
import { useMeetings } from '@/queries/meetings/useMeetings'

export default function MeetingList() {
  const { user } = useAuth()
  const { data: meetings = [], isLoading, isFetching } = useMeetings()

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
          <p className="mt-0.5 text-sm text-gray-500">부서별 회의 기록과 운영 메모의 기초 데이터를 관리합니다.</p>
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
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_160px_120px] md:items-center md:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{meeting.title}</p>
                      {meeting.location ? <p className="mt-1 truncate text-xs text-gray-500">장소: {meeting.location}</p> : null}
                    </div>
                    <p className="text-sm text-gray-600">{meeting.departments?.name || '-'}</p>
                    <p className="text-sm text-gray-600">{formatMeetingDate(meeting.meeting_date)}</p>
                    <p className="text-sm text-gray-600">{meeting.users?.name || '-'}</p>
                  </div>
                </Link>
              ))}
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
