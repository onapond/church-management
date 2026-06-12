import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveReportViaApi } from './useReportSubmit'
import type { ReportSaveRequest } from '../utils/reportSavePayload'

const basePayload: ReportSaveRequest = {
  reportType: 'weekly',
  weekNumber: 12,
  isDraft: true,
  targetReportId: null,
  editReportId: null,
  form: {
    department_id: 'dept-1',
    report_date: '2026-03-22',
    sermon_title: '',
    sermon_scripture: '',
    discussion_notes: '',
    other_notes: '',
    meeting_title: '',
    meeting_location: '',
    attendees: '',
    main_content: '',
    application_notes: '',
    organization: '',
  },
  programs: [],
  newcomers: [],
  contentItems: [],
  scheduleItems: [],
  budgetItems: [],
  cellAttendance: [],
  memberAttendance: [],
  selectedCellId: '',
  enabledSections: [],
  attendanceSummary: { total: 0, worship: 0, meeting: 0 },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveReportViaApi', () => {
  it('returns parsed json responses unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, reportId: 'report-1', createdReportId: null, warnings: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    await expect(saveReportViaApi(basePayload)).resolves.toEqual({
      ok: true,
      reportId: 'report-1',
      createdReportId: null,
      warnings: [],
    })
  })

  it('returns a structured error when the route returns non-json text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('upstream exploded', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }),
    ))

    await expect(saveReportViaApi(basePayload)).resolves.toEqual({
      ok: false,
      message: 'upstream exploded',
    })
  })

  it('returns a structured error when the route returns malformed success payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reportId: 'report-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ))

    await expect(saveReportViaApi(basePayload)).resolves.toEqual({
      ok: false,
      message: 'Report save response was malformed.',
    })
  })
})
