import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeWeeklyTrend, getWeekKeys } from './stats-queries'

function queryResult(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data, error: null }),
  }
  return query
}

afterEach(() => {
  vi.useRealTimers()
})

describe('attendance statistics boundaries', () => {
  it('uses real calendar week buckets instead of a fixed 4/13/52 denominator', () => {
    expect(getWeekKeys('2026-02-01', '2026-02-28')).toHaveLength(4)
    expect(getWeekKeys('2026-03-01', '2026-03-31')).toHaveLength(5)
  })

  it('keeps an empty department/cell filter empty without loading all attendance', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-05T12:00:00+09:00'))
    const membershipQuery = queryResult([])
    const from = vi.fn((table: string) => {
      if (table === 'member_departments') return membershipQuery
      throw new Error(`Unexpected table query: ${table}`)
    })

    const result = await computeWeeklyTrend(
      { from } as never,
      'department-with-no-members',
      'empty-cell',
      '2026-09-01',
    )

    expect(result).toEqual([{ week: '8/30', worship: 0, meeting: 0, total: 0 }])
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('deduplicates weekly attendance and includes historical attendees in the denominator', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-08T12:00:00+09:00'))
    const membersQuery = queryResult([{
      id: 'inactive-member',
      is_active: false,
      joined_at: '2025-01-01',
      updated_at: '2026-08-03T00:00:00+00:00',
    }])
    const attendanceQuery = queryResult([
      { member_id: 'inactive-member', attendance_date: '2026-08-02', attendance_type: 'worship', is_present: true },
      { member_id: 'inactive-member', attendance_date: '2026-08-05', attendance_type: 'worship', is_present: true },
    ])
    const from = vi.fn((table: string) => table === 'members' ? membersQuery : attendanceQuery)

    const result = await computeWeeklyTrend({ from } as never, 'all', 'all', '2026-08-01')

    expect(result).toEqual([
      { week: '7/26', worship: 0, meeting: 0, total: 1 },
      { week: '8/2', worship: 1, meeting: 0, total: 1 },
    ])
  })
})
