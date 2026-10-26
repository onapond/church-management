import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import ReportForm from './ReportForm'

const { submit, saveDraftSnapshot, submitOptions } = vi.hoisted(() => ({
  submit: vi.fn(),
  saveDraftSnapshot: vi.fn(),
  submitOptions: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/providers/ToastProvider', () => ({ useToastContext: () => ({ warning: vi.fn(), error: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}) }))
vi.mock('./ProgramTable', () => ({ default: () => null }))
vi.mock('./AttendanceInput', () => ({ default: () => null }))
vi.mock('./NewcomerSection', () => ({ default: () => null }))
vi.mock('./PhotoUploadSection', () => ({ default: () => null }))
vi.mock('./hooks/useReportSubmit', () => ({
  useReportSubmit: (options: unknown) => {
    submitOptions(options)
    return { submit, saveDraftSnapshot, isLoading: false, error: null }
  },
}))
vi.mock('./hooks/useReportForm', async () => {
  const { useState } = await import('react')
  return { useReportForm: ({ defaultDate }: { defaultDate: string }) => {
    const [form, setForm] = useState({
      department_id: 'dept-1', report_date: defaultDate,
      sermon_title: '', sermon_scripture: '', discussion_notes: '', other_notes: '',
      meeting_title: '', meeting_location: '', attendees: '', main_content: '', application_notes: '', organization: '',
    })
    return {
      form, setForm, programs: [], cellAttendance: [], newcomers: [], contentItems: [], scheduleItems: [], budgetItems: [],
      photoFiles: [], photoPreviews: [], enabledSections: [], selectedCellId: '', memberAttendance: [], cells: [],
      attendanceSummary: { total: 0, worship: 0, meeting: 0 },
      setExistingReportId: vi.fn(), setExistingReportStatus: vi.fn(),
      isSectionEnabled: () => true,
    }
  } }
})

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('report period confirmation', () => {
  it('requires confirmation, recalculates the saved week and invalidates confirmation after date changes', () => {
    render(<ReportForm reportType="weekly" departments={[{ id: 'dept-1', name: '교육부', code: 'test' }]} defaultDate="2026-10-25" authorId="user-1" />)
    const submitButton = screen.getByRole('button', { name: /^제출$/ })
    expect(submitButton).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/보고서가 맞는지 확인했습니다/))
    expect(submitButton).toBeEnabled()
    fireEvent.change(screen.getByLabelText('보고 대상 날짜 (예배일)'), { target: { value: '2026-10-18' } })
    expect(submitButton).toBeDisabled()
    expect(submitOptions).toHaveBeenLastCalledWith(expect.objectContaining({
      weekNumber: 42, form: expect.objectContaining({ report_date: '2026-10-18' }),
    }))
    fireEvent.click(screen.getByRole('button', { name: '임시저장' }))
    expect(submit).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByLabelText(/보고서가 맞는지 확인했습니다/))
    fireEvent.click(submitButton)
    expect(submit).toHaveBeenLastCalledWith(false)
  })
})
