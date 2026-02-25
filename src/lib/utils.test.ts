import { describe, it, expect } from 'vitest'
import { formatDate, formatPhone, formatCurrency, getWeekNumber, calculateAge } from './utils'

describe('formatDate', () => {
  it('short 형식', () => {
    expect(formatDate('2026-02-06')).toBe('2026.02.06')
  })

  it('full 형식', () => {
    expect(formatDate('2026-02-06', 'full')).toBe('2026년 2월 6일')
  })

  it('month-day 형식', () => {
    expect(formatDate('2026-02-06', 'month-day')).toBe('2월 6일')
  })

  it('잘못된 날짜는 원본 반환', () => {
    expect(formatDate('invalid')).toBe('invalid')
  })
})

describe('formatPhone', () => {
  it('11자리 전화번호 포맷', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678')
  })

  it('10자리 전화번호 포맷', () => {
    expect(formatPhone('0212345678')).toBe('021-234-5678')
  })

  it('null은 빈 문자열 반환', () => {
    expect(formatPhone(null)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('원화 형식으로 포맷', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000원')
  })

  it('0원', () => {
    expect(formatCurrency(0)).toBe('0원')
  })
})

describe('getWeekNumber', () => {
  // 2026년: 1/1=목, 첫 일요일=1/4
  it('2026-01-04 (첫 일요일) = 1주차', () => {
    expect(getWeekNumber('2026-01-04')).toBe(1)
  })

  it('2026-01-11 (둘째 일요일) = 2주차', () => {
    expect(getWeekNumber('2026-01-11')).toBe(2)
  })

  it('2026-02-01 (5번째 일요일) = 5주차', () => {
    expect(getWeekNumber('2026-02-01')).toBe(5)
  })

  it('2026-02-08 = 6주차', () => {
    expect(getWeekNumber('2026-02-08')).toBe(6)
  })

  it('2026-02-15 (7번째 일요일) = 7주차', () => {
    expect(getWeekNumber('2026-02-15')).toBe(7)
  })

  it('2026-02-22 (8번째 일요일) = 8주차', () => {
    expect(getWeekNumber('2026-02-22')).toBe(8)
  })

  it('평일은 해당 주 일요일 기준 (2026-02-25 수요일 → 8주차)', () => {
    expect(getWeekNumber('2026-02-25')).toBe(8)
  })

  it('토요일 경계: 2026-02-21 (토) = 7주차 (일요일 2/15 기준)', () => {
    expect(getWeekNumber('2026-02-21')).toBe(7)
  })

  it('토요일 경계: 2026-02-28 (토) = 8주차 (일요일 2/22 기준)', () => {
    expect(getWeekNumber('2026-02-28')).toBe(8)
  })

  // 다른 연도: 2025년 1/1=수, 첫 일요일=1/5
  it('2025-01-05 (첫 일요일) = 1주차', () => {
    expect(getWeekNumber('2025-01-05')).toBe(1)
  })

  // 2023년: 1/1=일 → 첫 일요일=1/1
  it('2023-01-01 (일요일 시작 연도) = 1주차', () => {
    expect(getWeekNumber('2023-01-01')).toBe(1)
  })
})

describe('calculateAge', () => {
  it('나이 계산', () => {
    const age = calculateAge('2000-01-01')
    expect(age).toBeGreaterThanOrEqual(25)
  })

  it('null은 null 반환', () => {
    expect(calculateAge(null)).toBeNull()
  })
})
