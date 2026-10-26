import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserData } from '@/types/shared'
import ReportListClient from './ReportListClient'

const state = vi.hoisted(() => ({ user: null as UserData | null, params: 'type=weekly', useReports: vi.fn(), push: vi.fn() }))
vi.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.params), useRouter: () => ({ push: state.push }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/queries/departments', () => ({ useDepartments: () => ({ data: [
  { id: 'cu1', name: '1청년', code: 'cu1' }, { id: 'cu2', name: '2청년', code: 'cu2' },
] }) }))
vi.mock('@/queries/reports', () => ({ useReports: (options: unknown) => {
  state.useReports(options)
  return { data: [], isLoading: false, isFetching: false }
} }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
beforeEach(() => {
  vi.clearAllMocks()
  state.params = 'type=weekly'
  state.user = { id: 'leader', name: '리더', role: 'team_leader', is_active: true, departments: null,
    user_departments: [{ department_id: 'cu2', is_team_leader: true, departments: { id: 'cu2', name: '2청년', code: 'cu2' } }] }
})

describe('weekly report list sharing scope', () => {
  it('queries all departments only for department leaders on the weekly tab', () => {
    render(<ReportListClient />)
    expect(state.useReports).toHaveBeenLastCalledWith(expect.objectContaining({ reportType: 'weekly', authorId: undefined, visibleDepartmentIds: undefined }))
    expect(screen.getByRole('button', { name: '1청년' })).toBeInTheDocument()
  })
  it('retains author/own-department restrictions on the cell leader tab', () => {
    state.params = 'type=cell_leader'
    render(<ReportListClient />)
    expect(state.useReports).toHaveBeenLastCalledWith(expect.objectContaining({ reportType: 'cell_leader', authorId: 'leader', visibleDepartmentIds: ['cu2'] }))
    expect(screen.queryByRole('button', { name: '1청년' })).not.toBeInTheDocument()
  })
  it('keeps ordinary cell leaders limited to their own reports', () => {
    state.user!.user_departments = [{ department_id: 'cu1', is_team_leader: false, departments: { id: 'cu1', name: '1청년', code: 'cu1' } }]
    render(<ReportListClient />)
    expect(state.useReports).toHaveBeenLastCalledWith(expect.objectContaining({ authorId: 'leader', visibleDepartmentIds: [] }))
    expect(screen.queryByRole('button', { name: '1청년' })).not.toBeInTheDocument()
  })
  it('drops another department filter when switching away from weekly reports', () => {
    state.params = 'type=weekly&dept=cu1'
    render(<ReportListClient />)
    fireEvent.click(screen.getByRole('button', { name: /셀장 보고서/ }))
    expect(state.push).toHaveBeenCalledWith('/reports?type=cell_leader')
  })
})
