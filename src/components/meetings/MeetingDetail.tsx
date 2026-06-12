'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { canDeleteMeeting, canEditMeetingContent, canViewMeeting } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useToastContext } from '@/providers/ToastProvider'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useMeetingDetail,
  useMeetingFeedback,
  useMeetingMinutes,
  useMeetingPdfUrl,
} from '@/queries/meetings/useMeetings'
import { useUpsertMeetingMinutes } from '@/queries/meetings/useCreateMeeting'
import { deleteMeetingBundle } from '@/components/meetings/utils/meetingDeletion'

interface MeetingDetailProps {
  meetingId: string
}

interface MinutesFormState {
  discussion_notes: string
  decisions: string
  handoff_notes: string
}

const MINUTES_SECTIONS: Array<{
  key: keyof MinutesFormState
  title: string
  placeholder: string
}> = [
  { key: 'discussion_notes', title: '회의 내용', placeholder: '논의 내용, 보고 내용, 참고 사항을 입력하세요.' },
  { key: 'decisions', title: '결정 사항', placeholder: '회의에서 결정한 내용을 입력하세요.' },
  { key: 'handoff_notes', title: '인수인계 메모', placeholder: '다음 진행자를 위한 메모를 입력하세요.' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: '목사',
  president: '회장',
  accountant: '부장',
}

const supabase = createClient()

export default function MeetingDetail({ meetingId }: MeetingDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const toast = useToastContext()

  const { data: meeting, isLoading: meetingLoading } = useMeetingDetail(meetingId)
  const { data: minutes, isLoading: minutesLoading } = useMeetingMinutes(meetingId)
  const { data: feedbackItems = [] } = useMeetingFeedback(meetingId)
  const { data: pdfUrl, isLoading: pdfLoading } = useMeetingPdfUrl(minutes?.pdf_file_path)

  const upsertMinutes = useUpsertMeetingMinutes()
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)
  const [draftForm, setDraftForm] = useState<MinutesFormState | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isSavingFeedback, setIsSavingFeedback] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const savedForm = useMemo<MinutesFormState>(
    () => ({
      discussion_notes: minutes?.discussion_notes ?? '',
      decisions: minutes?.decisions ?? '',
      handoff_notes: minutes?.handoff_notes ?? '',
    }),
    [minutes?.discussion_notes, minutes?.decisions, minutes?.handoff_notes]
  )

  const form = draftForm ?? savedForm
  const canEdit = canEditMeetingContent(user, meeting?.department_id)
  const canLeaveFeedback = ['super_admin', 'president', 'accountant'].includes(user?.role ?? '')
  const canDelete = canDeleteMeeting(user, meeting ?? { created_by: '', department_id: '' })

  async function handleSaveMinutes() {
    if (!user || !canEdit || !meeting) {
      toast.error('회의록을 저장할 권한이 없습니다.')
      return
    }

    try {
      await upsertMinutes.mutateAsync({
        meeting_id: meetingId,
        discussion_notes: normalizeTextareaValue(form.discussion_notes),
        decisions: normalizeTextareaValue(form.decisions),
        handoff_notes: normalizeTextareaValue(form.handoff_notes),
        pdf_file_path: minutes?.pdf_file_path ?? null,
        pdf_file_name: minutes?.pdf_file_name ?? null,
        pdf_file_size: minutes?.pdf_file_size ?? null,
        pdf_uploaded_at: minutes?.pdf_uploaded_at ?? null,
        updated_by: user.id,
      })
      setDraftForm(null)
      toast.success('회의록이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save meeting minutes:', error)
      toast.error('회의록 저장 중 오류가 발생했습니다.')
    }
  }

  async function handleSaveFeedback() {
    const trimmed = feedback.trim()
    if (!user || !canLeaveFeedback || !trimmed) return

    try {
      setIsSavingFeedback(true)
      const { error } = await supabase.from('meeting_feedback').insert({
        meeting_id: meetingId,
        commenter_id: user.id,
        comment: trimmed,
      })
      if (error) throw error

      setFeedback('')
      await queryClient.invalidateQueries({ queryKey: ['meetings', 'feedback', meetingId] })
      toast.success('피드백이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save meeting feedback:', error)
      toast.error('피드백 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSavingFeedback(false)
    }
  }

  async function handleDeleteMeeting() {
    if (!meeting || !canDelete) return
    if (!window.confirm(`"${meeting.title}" 회의를 삭제하시겠습니까?`)) return

    try {
      setIsDeleting(true)
      await deleteMeetingBundle(supabase, meeting.id)
      await queryClient.invalidateQueries({ queryKey: ['meetings'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('회의가 삭제되었습니다.')
      router.push('/meetings')
    } catch (error) {
      console.error('Failed to delete meeting:', error)
      toast.error('회의 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!canViewMeeting(user)) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
        회의를 조회할 권한이 없습니다.
      </div>
    )
  }

  if (meetingLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">회의를 찾을 수 없습니다.</h2>
        <Link href="/meetings" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          회의 목록으로
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
              <span>일시: {formatMeetingDate(meeting.meeting_date)}</span>
              <span>장소: {meeting.location || '-'}</span>
              <span>작성자: {meeting.users?.name || '-'}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => void handleDeleteMeeting()}
                disabled={isDeleting}
                className="rounded-xl bg-red-50 p-2.5 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                title="삭제"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <Link href="/meetings" className="rounded-xl p-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700">
              목록
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">회의 설명</h2>
        <div className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {meeting.description?.trim() || '기본 회의 설명이 아직 없습니다.'}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">정리된 회의록</h2>
            <p className="mt-1 text-sm text-gray-500">아래 항목은 회의의 기본 메모입니다. 필요할 때만 수정하세요.</p>
          </div>
          <div className="text-xs text-gray-500">
            {minutes?.updated_at ? `마지막 수정 ${formatUpdatedAt(minutes.updated_at)}` : '아직 저장되지 않음'}
            {minutes?.users?.name ? ` · ${minutes.users.name}` : ''}
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
              const displayValue = value.trim() || '내용이 없습니다.'

              return (
                <div key={section.key} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{section.title}</h3>
                  {canEdit ? (
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...(current ?? savedForm),
                          [section.key]: event.target.value,
                        }))
                      }
                      rows={6}
                      placeholder={section.placeholder}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    <div className="min-h-24 whitespace-pre-wrap rounded-xl bg-white px-3 py-3 text-sm leading-6 text-gray-700">
                      {displayValue}
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
              onClick={handleSaveMinutes}
              disabled={upsertMinutes.isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upsertMinutes.isPending ? '저장 중...' : '회의록 저장'}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">PDF 회의록</h2>
            <p className="mt-1 text-sm text-gray-500">업로드된 원본 PDF를 여기서 확인할 수 있습니다.</p>
          </div>
          {minutes?.pdf_file_name ? (
            <div className="text-xs text-gray-500">
              {minutes.pdf_file_name}
              {minutes.pdf_file_size ? ` · ${formatFileSize(minutes.pdf_file_size)}` : ''}
            </div>
          ) : null}
        </div>

        {!minutes?.pdf_file_path ? (
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            업로드된 PDF 회의록이 없습니다.
          </div>
        ) : pdfLoading ? (
          <Skeleton className="mt-4 h-[520px] w-full rounded-2xl" />
        ) : pdfUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
            <iframe title="PDF 회의록" src={pdfUrl} className="h-[520px] w-full bg-white" />
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                새 창에서 열기
              </a>
              <button
                type="button"
                onClick={() => setIsPdfFullscreen(true)}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                전체화면
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-4 text-sm text-red-700">
            PDF를 불러오지 못했습니다.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">피드백</h2>
            <p className="mt-1 text-sm text-gray-500">결재는 아니지만 회장, 부장, 목사가 별도로 의견을 남길 수 있습니다.</p>
          </div>
          <span className="text-xs text-gray-400">총 {feedbackItems.length}개</span>
        </div>

        <div className="mt-5 space-y-3">
          {feedbackItems.length > 0 ? (
            feedbackItems.map((item) => (
              <div key={item.id} className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{item.users?.name || '사용자'}</span>
                    {item.users?.role && ROLE_LABELS[item.users.role] && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {ROLE_LABELS[item.users.role]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatFeedbackDate(item.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{item.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">아직 피드백이 없습니다.</p>
          )}
        </div>

        {canLeaveFeedback ? (
          <div className="mt-5 space-y-3">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="피드백을 입력하세요"
              rows={4}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveFeedback()}
                disabled={isSavingFeedback || !feedback.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingFeedback ? '저장 중...' : '피드백 저장'}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-gray-400">회장, 부장, 목사만 피드백을 남길 수 있습니다.</p>
        )}
      </section>

      {isPdfFullscreen && pdfUrl ? (
        <div className="fixed inset-0 z-50 bg-black/90 p-4">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{minutes?.pdf_file_name || 'PDF 회의록'}</p>
                <p className="text-xs text-gray-500">전체화면 보기</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  새 창
                </a>
                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen(false)}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-gray-50">
              <iframe title="PDF 회의록 전체화면" src={pdfUrl} className="h-full w-full bg-white" />
            </div>
          </div>
        </div>
      ) : null}
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

function formatFeedbackDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}
