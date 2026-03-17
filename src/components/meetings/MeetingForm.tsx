'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useToastContext } from '@/providers/ToastProvider'
import { useDepartments } from '@/queries/departments'
import { useCreateMeeting } from '@/queries/meetings/useCreateMeeting'
import { canAccessAllDepartments, canCreateMeeting } from '@/lib/permissions'

interface MeetingFormState {
  title: string
  department_id: string
  meeting_date: string
  location: string
  description: string
}

export default function MeetingForm() {
  const router = useRouter()
  const toast = useToastContext()
  const { user } = useAuth()
  const { data: allDepartments = [], isLoading: departmentsLoading } = useDepartments()
  const createMeeting = useCreateMeeting()
  const [form, setForm] = useState<MeetingFormState>({
    title: '',
    department_id: '',
    meeting_date: '',
    location: '',
    description: '',
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

      toast.success('회의가 등록되었습니다.')
      router.push(`/meetings/${meeting.id}`)
    } catch (error) {
      console.error('Failed to create meeting:', error)
      toast.error('회의 등록 중 오류가 발생했습니다.')
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
        <p className="mt-0.5 text-sm text-gray-500">회의 기본 정보와 설명을 입력합니다.</p>
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
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            disabled={createMeeting.isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {createMeeting.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
