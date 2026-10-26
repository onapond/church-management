import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { UserData } from '@/types/shared'

const mocks = vi.hoisted(() => ({
  user: null as UserData | null,
  params: new URLSearchParams(),
  reports: vi.fn(),
}))
vi.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/queries/reports', () => ({ useReports: mocks.reports }))
vi.mock('@/queries/departments', () => ({ useDepartments: () => ({ data: [
  { id: 'youth', code: 'youth', name: '청소년부' },
  { id: 'cu1', code: 'cu1', name: '1청년' },
  { id: 'worship', code: 'CU', name: '워십팀' },
] }) }))
import ReportListClient from './ReportListClient'

function user(code: string): UserData {
  return { id: 'reader', name: 'Reader', role: 'team_leader', is_active: true, departments: null,
    user_departments: [{ department_id: code, is_team_leader: false, departments: { id: code, code, name: code } }] }
}
const report = { id: 'shared', author_id: 'other', department_id: 'worship', status: 'final_approved', report_type: 'meeting',
  report_date: '2026-10-25', meeting_title: '워십 연습 보고', departments: { name: '워십팀', code: 'CU' }, users: { name: '작성자' } }

beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.params = new URLSearchParams(); mocks.user = user('youth') })

describe('shared report list', () => {
  it('shows worship meeting reports and a worship filter to youth leaders', () => {
    mocks.params.set('type', 'meeting')
    mocks.reports.mockReturnValue({ data: [report] })
    render(<ReportListClient />)
    expect(screen.getByText('워십 연습 보고')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '워십팀' })).toBeInTheDocument()
    expect(mocks.reports).toHaveBeenCalledWith(expect.objectContaining({ viewerId: 'reader', authorId: undefined, visibleDepartmentIds: undefined }))
    expect(screen.queryByTitle('삭제')).not.toBeInTheDocument()
  })

  it('shows other departments weekly reports to worship leaders', () => {
    mocks.user = user('CU')
    mocks.reports.mockReturnValue({ data: [{ ...report, report_type: 'weekly', department_id: 'cu1', departments: { name: '1청년', code: 'cu1' } }] })
    render(<ReportListClient />)
    expect(document.querySelector('a[href="/reports/shared"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '청소년부' })).toBeInTheDocument()
    expect(mocks.reports).toHaveBeenCalledWith(expect.objectContaining({ authorId: undefined }))
  })

  it('hides peer reports from ordinary CU1 cell leaders and keeps author query scope', () => {
    mocks.user = user('cu1')
    mocks.reports.mockReturnValue({ data: [report] })
    render(<ReportListClient />)
    expect(document.querySelector('a[href="/reports/shared"]')).not.toBeInTheDocument()
    expect(mocks.reports).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'reader' }))
  })
})
