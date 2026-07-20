import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveReportViaApi, uploadPhotos } from './useReportSubmit'
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

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Unable to read blob.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
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

describe('uploadPhotos', () => {
  it('materializes file content before uploading to storage', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/report.jpg' } })
    const storageFrom = vi.fn().mockReturnValue({ upload, getPublicUrl })
    const from = vi.fn().mockReturnValue({ insert })
    const supabase = {
      storage: { from: storageFrom },
      from,
    }
    const file = new File(['photo-bytes'], 'IMG_1293.jpeg', { type: 'image/jpeg' })

    await uploadPhotos(supabase, 'report-1', [file], 'user-1')

    expect(storageFrom).toHaveBeenCalledWith('report-photos')
    expect(upload).toHaveBeenCalledTimes(1)
    const [, uploadBody, options] = upload.mock.calls[0]
    expect(uploadBody).toBeInstanceOf(Blob)
    await expect(readBlobText(uploadBody)).resolves.toBe('photo-bytes')
    expect(options).toEqual({ contentType: 'image/jpeg' })
    expect(from).toHaveBeenCalledWith('report_photos')
    expect(insert).toHaveBeenCalledWith({
      report_id: 'report-1',
      photo_url: 'https://example.com/report.jpg',
      order_index: 0,
      uploaded_by: 'user-1',
    })
  })

  it('fails before storage upload when selected file content is empty', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      storage: { from: vi.fn().mockReturnValue({ upload }) },
      from: vi.fn(),
    }
    const file = new File([], 'IMG_1293.jpeg', { type: 'image/jpeg' })

    await expect(uploadPhotos(supabase, 'report-1', [file], 'user-1')).rejects.toThrow(
      'IMG_1293.jpeg: file content is empty or unavailable',
    )
    expect(upload).not.toHaveBeenCalled()
  })
})
