'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useToastContext } from '@/providers/ToastProvider'
import { useDepartments } from '@/queries/departments'
import { useCreateMeeting, useUpsertMeetingMinutes } from '@/queries/meetings/useCreateMeeting'
import { canAccessAllDepartments, canCreateMeeting } from '@/lib/permissions'

interface MeetingFormState {
  title: string
  department_id: string
  meeting_date: string
  location: string
  description: string
  discussion_notes: string
  decisions: string
  handoff_notes: string
}

const MINUTES_SECTIONS: Array<{
  key: 'discussion_notes' | 'decisions' | 'handoff_notes'
  title: string
  placeholder: string
}> = [
  {
    key: 'discussion_notes',
    title: '논의 내용',
    placeholder: '안건 흐름, 배경, 주요 논의 내용을 기록해 주세요.',
  },
  {
    key: 'decisions',
    title: '결정 사항',
    placeholder: '합의된 결정, 담당자, 다음 단계 약속을 정리해 주세요.',
  },
  {
    key: 'handoff_notes',
    title: '인수인계 메모',
    placeholder: '다음 리더나 다음 회의로 넘겨야 할 내용을 적어 주세요.',
  },
]

export default function MeetingForm() {
  const router = useRouter()
  const toast = useToastContext()
  const { user } = useAuth()
  const { data: allDepartments = [], isLoading: departmentsLoading } = useDepartments()
  const createMeeting = useCreateMeeting()
  const upsertMeetingMinutes = useUpsertMeetingMinutes()
  const [form, setForm] = useState<MeetingFormState>({
    title: '',
    department_id: '',
    meeting_date: '',
    location: '',
    description: '',
    discussion_notes: '',
    decisions: '',
    handoff_notes: '',
  })

  const departments = useMemo(() => {
    if (!user) return []
    if (canAccessAllDepartments(user.role)) return allDepartments

    const allowedDepartmentIds = new Set(user.user_departments.map((department) => department.department_id))
    return allDepartments.filter((department) => allowedDepartmentIds.has(department.id))
  }, [allDepartments, user])

  useEffect(() => {
    if (departments.length === 0 || form.department_id) return
    setForm((current) => ({ ...current, department_id: departments[0].id }))
  }, [departments, form.department_id])

  useEffect(() => {
    if (form.meeting_date) return

    const now = new Date()
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    setForm((current) => ({ ...current, meeting_date: localDateTime }))
  }, [form.meeting_date])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !canCreateMeeting(user)) {
      toast.error('회의를 등록할 권한이 없습니다.')
      return
    }

    if (!form.title.trim() || !form.department_id || !form.meeting_date) {
      toast.warning('필수 항목을 모두 입력해 주세요.')
      return
    }

    try {
      const meeting = await createMeeting.mutateAsync({
        title: form.title.trim(),
        department_id: form.department_id,
        meeting_date: new Date(form.meeting_date).toISOString(),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        created_by: user.id,
      })

      if (hasStructuredMinutes(form)) {
        await upsertMeetingMinutes.mutateAsync({
          meeting_id: meeting.id,
          discussion_notes: normalizeTextareaValue(form.discussion_notes),
          decisions: normalizeTextareaValue(form.decisions),
          handoff_notes: normalizeTextareaValue(form.handoff_notes),
          updated_by: user.id,
        })
      }

      toast.success('회의와 회의록이 저장되었습니다.')
      router.push(`/meetings/${meeting.id}`)
    } catch (error) {
      console.error('Failed to create meeting:', error)
      toast.error('회의 저장 중 오류가 발생했습니다.')
    }
  }

  if (!user || departmentsLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!canCreateMeeting(user)) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
        회의를 등록할 권한이 없습니다.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 lg:text-xl">회의 등록</h1>
        <p className="mt-0.5 text-sm text-gray-500">회의 기본 정보와 구조화된 회의록을 한 번에 입력합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <label htmlFor="meeting-title" className="mb-1 block text-sm font-medium text-gray-700">
              회의 제목 *
            </label>
            <input
              id="meeting-title"
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="예: 1청년 리더 회의"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label htmlFor="meeting-department" className="mb-1 block text-sm font-medium text-gray-700">
                부서 *
              </label>
              <select
                id="meeting-department"
                value={form.department_id}
                onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="meeting-date" className="mb-1 block text-sm font-medium text-gray-700">
                회의 일시 *
              </label>
              <input
                id="meeting-date"
                type="datetime-local"
                value={form.meeting_date}
                onChange={(event) => setForm((current) => ({ ...current, meeting_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="meeting-location" className="mb-1 block text-sm font-medium text-gray-700">
              장소
            </label>
            <input
              id="meeting-location"
              type="text"
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="예: 교육관 2층"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="meeting-description" className="mb-1 block text-sm font-medium text-gray-700">
              회의 설명
            </label>
            <textarea
              id="meeting-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="회의 목적, 안건, 메모를 입력해 주세요."
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">구조화된 회의록</h2>
              <p className="mt-1 text-sm text-gray-500">회의를 저장할 때 함께 기록됩니다. 비워 두면 기본 회의 정보만 저장됩니다.</p>
            </div>

            <div className="mt-4 space-y-4">
              {MINUTES_SECTIONS.map((section) => (
                <div key={section.key}>
                  <label htmlFor={section.key} className="mb-1 block text-sm font-medium text-gray-700">
                    {section.title}
                  </label>
                  <textarea
                    id={section.key}
                    value={form[section.key]}
                    onChange={(event) => setForm((current) => ({ ...current, [section.key]: event.target.value }))}
                    placeholder={section.placeholder}
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/meetings')}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createMeeting.isPending || upsertMeetingMinutes.isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {createMeeting.isPending || upsertMeetingMinutes.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

function normalizeTextareaValue(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function hasStructuredMinutes(form: MeetingFormState) {
  return [form.discussion_notes, form.decisions, form.handoff_notes].some((value) => value.trim().length > 0)
}
