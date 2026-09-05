import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  saveReportViaApi,
  saveReportWithStaleTargetRecovery,
  uploadPhotos,
} from './useReportSubmit'
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

describe('saveReportWithStaleTargetRecovery', () => {
  it('retries once without an obsolete draft target id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        staleTarget: true,
        message: 'The saved draft reference is no longer available.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        reportId: 'report-new-1',
        createdReportId: 'report-new-1',
        warnings: [],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveReportWithStaleTargetRecovery({
      ...basePayload,
      targetReportId: 'deleted-draft-1',
    })).resolves.toEqual({
      ok: true,
      reportId: 'report-new-1',
      createdReportId: 'report-new-1',
      warnings: [],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      targetReportId: 'deleted-draft-1',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      targetReportId: null,
    })
  })

  it('does not retry real permission errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      message: 'Forbidden',
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveReportWithStaleTargetRecovery({
      ...basePayload,
      editReportId: 'report-edit-1',
      targetReportId: null,
    })).resolves.toEqual({
      ok: false,
      message: 'Forbidden',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('uploadPhotos', () => {
  it('materializes file content before uploading to storage', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn().mockResolvedValue({ error: null })
    const storageFrom = vi.fn().mockReturnValue({ upload })
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
      photo_url: expect.stringMatching(/^report-1\/\d+_0\.jpeg$/),
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
