import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistReportBundle } from './reportPersistence'
import type { ReportSaveRequest } from './reportSavePayload'

const mockCreateApprovalNotification = vi.fn()

vi.mock('@/lib/notifications', () => ({
  createApprovalNotification: (...args: unknown[]) => mockCreateApprovalNotification(...args),
}))

function createSupabaseMock(result: { data: unknown; error: { message?: string } | null }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  }
}

const baseRequest: ReportSaveRequest = {
  reportType: 'weekly',
  weekNumber: 12,
  isDraft: false,
  targetReportId: null,
  editReportId: null,
  form: {
    department_id: 'dept-1',
    report_date: '2026-03-22',
    sermon_title: 'title',
    sermon_scripture: 'scripture',
    discussion_notes: 'discussion',
    other_notes: 'other',
    meeting_title: '',
    meeting_location: '',
    attendees: '',
    main_content: '',
    application_notes: '',
    organization: '',
  },
  programs: [
    { _key: 'p-1', start_time: '13:30', end_time: '', content: 'Worship', person_in_charge: 'Leader', note: 'note', order_index: 0 },
  ],
  newcomers: [],
  contentItems: [],
  scheduleItems: [],
  budgetItems: [],
  cellAttendance: [],
  memberAttendance: [],
  selectedCellId: '',
  enabledSections: [],
  attendanceSummary: { total: 10, worship: 8, meeting: 7 },
  departmentName: '청년부',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateApprovalNotification.mockResolvedValue(true)
})

describe('persistReportBundle', () => {
  it('returns duplicate response from rpc unchanged', async () => {
    const supabase = createSupabaseMock({
      data: {
        duplicate: true,
        id: 'report-dup',
        status: 'draft',
        message: 'duplicate',
      },
      error: null,
    })

    const result = await persistReportBundle(supabase as never, baseRequest, 'user-1')

    expect(result).toEqual({
      duplicate: true,
      id: 'report-dup',
      status: 'draft',
      message: 'duplicate',
    })
    expect(mockCreateApprovalNotification).not.toHaveBeenCalled()
  })

  it('saves edit path via rpc and triggers submit notification', async () => {
    const supabase = createSupabaseMock({
      data: {
        reportId: 'report-1',
        createdReportId: null,
        warnings: [],
      },
      error: null,
    })

    const result = await persistReportBundle(
      supabase as never,
      { ...baseRequest, editReportId: 'report-1' },
      'user-1',
    )

    expect(result).toEqual({
      reportId: 'report-1',
      createdReportId: null,
      warnings: [],
    })
    expect(supabase.rpc).toHaveBeenCalledWith(
      'save_report_bundle',
      expect.objectContaining({
        payload: expect.objectContaining({
          edit_report_id: 'report-1',
        }),
      }),
    )
    expect(mockCreateApprovalNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        reportId: 'report-1',
        toStatus: 'submitted',
      }),
    )
  })

  it('preserves attendance warning path from rpc success response', async () => {
    const supabase = createSupabaseMock({
      data: {
        reportId: 'report-2',
        createdReportId: 'report-2',
        warnings: ['Attendance records were not fully saved.'],
      },
      error: null,
    })

    const result = await persistReportBundle(supabase as never, baseRequest, 'user-1')

    expect(result).toEqual({
      reportId: 'report-2',
      createdReportId: 'report-2',
      warnings: ['Attendance records were not fully saved.'],
    })
  })

  it('uses target draft id for autosave updates and skips notifications', async () => {
    const supabase = createSupabaseMock({
      data: {
        reportId: 'draft-1',
        createdReportId: null,
        warnings: [],
      },
      error: null,
    })

    const result = await persistReportBundle(
      supabase as never,
      { ...baseRequest, isDraft: true, targetReportId: 'draft-1' },
      'user-1',
    )

    expect(result).toEqual({
      reportId: 'draft-1',
      createdReportId: null,
      warnings: [],
    })
    expect(supabase.rpc).toHaveBeenCalledWith(
      'save_report_bundle',
      expect.objectContaining({
        payload: expect.objectContaining({
          is_draft: true,
          target_report_id: 'draft-1',
        }),
      }),
    )
    expect(mockCreateApprovalNotification).not.toHaveBeenCalled()
  })

  it('throws when rpc success response is missing reportId', async () => {
    const supabase = createSupabaseMock({
      data: {
        createdReportId: null,
        warnings: [],
      },
      error: null,
    })

    await expect(persistReportBundle(supabase as never, baseRequest, 'user-1'))
      .rejects
      .toThrow('save_report_bundle returned no reportId')
    expect(mockCreateApprovalNotification).not.toHaveBeenCalled()
  })
})
