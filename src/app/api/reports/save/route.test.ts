import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateClient = vi.fn()
const mockPersistReportBundle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

vi.mock('@/components/reports/utils/reportPersistence', () => ({
  persistReportBundle: (...args: unknown[]) => mockPersistReportBundle(...args),
}))

import { POST } from './route'

function createQueryChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  }

  return chain
}

function createSupabase(options: {
  user?: { id: string } | null
  role?: string
  report?: { author_id: string; status: string } | null
  authError?: unknown
}) {
  const user = Object.prototype.hasOwnProperty.call(options, 'user')
    ? options.user
    : { id: 'user-1' }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: options.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return createQueryChain({ data: options.role ? { role: options.role } : null })
      }

      if (table === 'weekly_reports') {
        return createQueryChain({ data: options.report ?? null })
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/reports/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  reportType: 'weekly',
  weekNumber: 12,
  isDraft: false,
  form: {
    department_id: 'dept-1',
    report_date: '2026-03-22',
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/reports/save', () => {
  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({ user: null }))

    const response = await POST(makeRequest(validBody))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Unauthorized' })
  })

  it('returns 400 when required fields are missing', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({ role: 'president' }))

    const response = await POST(makeRequest({ ...validBody, form: { department_id: '', report_date: '' } }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Missing required report fields' })
  })

  it('returns 400 when both editReportId and targetReportId are provided', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({ role: 'president' }))

    const response = await POST(makeRequest({
      ...validBody,
      editReportId: 'report-edit-1',
      targetReportId: 'report-target-1',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Provide either editReportId or targetReportId, not both',
    })
    expect(mockPersistReportBundle).not.toHaveBeenCalled()
  })

  it('returns 403 when edit requester cannot manage the report', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({
      role: 'member',
      report: { author_id: 'other-user', status: 'submitted' },
    }))

    const response = await POST(makeRequest({ ...validBody, editReportId: 'report-1' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Forbidden' })
    expect(mockPersistReportBundle).not.toHaveBeenCalled()
  })

  it('returns 403 when autosave target requester cannot manage the report', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({
      role: 'member',
      report: { author_id: 'other-user', status: 'draft' },
    }))

    const response = await POST(makeRequest({ ...validBody, isDraft: true, targetReportId: 'draft-1' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Forbidden' })
    expect(mockPersistReportBundle).not.toHaveBeenCalled()
  })

  it('allows report author to edit a draft report', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({
      user: { id: 'author-1' },
      role: 'member',
      report: { author_id: 'author-1', status: 'draft' },
    }))
    mockPersistReportBundle.mockResolvedValue({
      reportId: 'report-1',
      createdReportId: null,
      warnings: [],
    })

    const response = await POST(makeRequest({ ...validBody, editReportId: 'report-1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      reportId: 'report-1',
      createdReportId: null,
      warnings: [],
    })
    expect(mockPersistReportBundle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ editReportId: 'report-1' }), 'author-1')
  })

  it('allows draft author to autosave via targetReportId', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({
      user: { id: 'author-1' },
      role: 'member',
      report: { author_id: 'author-1', status: 'draft' },
    }))
    mockPersistReportBundle.mockResolvedValue({
      reportId: 'draft-1',
      createdReportId: null,
      warnings: [],
    })

    const response = await POST(makeRequest({ ...validBody, isDraft: true, targetReportId: 'draft-1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      reportId: 'draft-1',
      createdReportId: null,
      warnings: [],
    })
    expect(mockPersistReportBundle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ targetReportId: 'draft-1' }), 'author-1')
  })

  it('allows draft author to submit a photo-backed draft without a user role lookup', async () => {
    const supabase = createSupabase({
      user: { id: 'author-1' },
      report: { author_id: 'author-1', status: 'draft' },
    })
    mockCreateClient.mockResolvedValue(supabase)
    mockPersistReportBundle.mockResolvedValue({
      reportId: 'draft-1',
      createdReportId: null,
      warnings: [],
    })

    const response = await POST(makeRequest({ ...validBody, isDraft: false, targetReportId: 'draft-1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      reportId: 'draft-1',
      createdReportId: null,
      warnings: [],
    })
    expect(supabase.from).toHaveBeenCalledWith('weekly_reports')
    expect(supabase.from).not.toHaveBeenCalledWith('users')
    expect(mockPersistReportBundle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      isDraft: false,
      targetReportId: 'draft-1',
    }), 'author-1')
  })

  it('rejects an already-submitted author target instead of rewriting it', async () => {
    const supabase = createSupabase({
      user: { id: 'author-1' },
      role: 'member',
      report: { author_id: 'author-1', status: 'submitted' },
    })
    mockCreateClient.mockResolvedValue(supabase)

    const response = await POST(makeRequest({ ...validBody, isDraft: false, targetReportId: 'draft-1' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Forbidden' })
    expect(supabase.from).toHaveBeenCalledWith('weekly_reports')
    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(mockPersistReportBundle).not.toHaveBeenCalled()
  })

  it('returns 409 when persistence reports a duplicate', async () => {
    mockCreateClient.mockResolvedValue(createSupabase({ role: 'president' }))
    mockPersistReportBundle.mockResolvedValue({
      duplicate: true,
      id: 'report-dup',
      status: 'draft',
      message: 'duplicate',
    })

    const response = await POST(makeRequest(validBody))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      duplicate: true,
      id: 'report-dup',
      status: 'draft',
      message: 'duplicate',
    })
  })
})

