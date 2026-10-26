import { describe, expect, it } from 'vitest'
import { getCurrentReportSunday, getReportPeriod, shiftReportDate } from './reportPeriod'

describe('report period', () => {
  it('uses Korea midnight for the Saturday/Sunday boundary', () => {
    expect(getCurrentReportSunday(new Date('2026-10-24T14:59:59Z'))).toBe('2026-10-18')
    expect(getCurrentReportSunday(new Date('2026-10-24T15:00:00Z'))).toBe('2026-10-25')
    expect(getReportPeriod('2026-10-18')).toEqual({ year: 2026, weekNumber: 42 })
    expect(getReportPeriod('2026-10-25')).toEqual({ year: 2026, weekNumber: 43 })
  })
  it('supports late reports across the year boundary', () => {
    expect(shiftReportDate('2027-01-03', -7)).toBe('2026-12-27')
    expect(getReportPeriod('2026-12-27')).toEqual({ year: 2026, weekNumber: 52 })
    expect(getReportPeriod('2027-01-03')).toEqual({ year: 2027, weekNumber: 1 })
  })
  it.each(['', '2026-02-30', '2026-13-01', '2026-1-1', 'not-a-date'])('rejects invalid dates: %s', date => {
    expect(getReportPeriod(date)).toBeNull()
  })
})
