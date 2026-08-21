import { describe, it, expect } from 'vitest'
import { formatDate, formatPhone, formatCurrency, getWeekNumber, calculateAge, getWeekBounds, escapeHtml, printHtmlInIframe } from './utils'

describe('formatDate', () => {
  it('formats short date', () => {
    expect(formatDate('2026-02-06')).toBe('2026.02.06')
  })

  it('formats full date', () => {
    expect(formatDate('2026-02-06', 'full')).toBe('2026년 2월 6일')
  })

  it('formats month-day', () => {
    expect(formatDate('2026-02-06', 'month-day')).toBe('2월 6일')
  })

  it('returns raw input for invalid date', () => {
    expect(formatDate('invalid')).toBe('invalid')
  })
})

describe('formatPhone', () => {
  it('formats 11-digit phone number', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678')
  })

  it('formats 10-digit phone number', () => {
    expect(formatPhone('0212345678')).toBe('021-234-5678')
  })

  it('returns empty string for null', () => {
    expect(formatPhone(null)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats currency with won suffix', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000원')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0원')
  })
})

describe('getWeekNumber', () => {
  it('2026-01-04 is week 1', () => {
    expect(getWeekNumber('2026-01-04')).toBe(1)
  })

  it('2026-01-01 does not go below week 1', () => {
    expect(getWeekNumber('2026-01-01')).toBe(1)
  })

  it('2026-01-03 does not go below week 1', () => {
    expect(getWeekNumber('2026-01-03')).toBe(1)
  })

  it('2026-01-11 is week 2', () => {
    expect(getWeekNumber('2026-01-11')).toBe(2)
  })

  it('2026-02-01 is week 5', () => {
    expect(getWeekNumber('2026-02-01')).toBe(5)
  })

  it('2026-02-08 is week 6', () => {
    expect(getWeekNumber('2026-02-08')).toBe(6)
  })

  it('2026-02-15 is week 7', () => {
    expect(getWeekNumber('2026-02-15')).toBe(7)
  })

  it('2026-02-22 is week 8', () => {
    expect(getWeekNumber('2026-02-22')).toBe(8)
  })

  it('weekday uses week of that sunday', () => {
    expect(getWeekNumber('2026-02-25')).toBe(8)
  })

  it('saturday before sunday boundary is previous week', () => {
    expect(getWeekNumber('2026-02-21')).toBe(7)
  })

  it('saturday after sunday boundary is current week', () => {
    expect(getWeekNumber('2026-02-28')).toBe(8)
  })

  it('2025-01-05 is week 1', () => {
    expect(getWeekNumber('2025-01-05')).toBe(1)
  })

  it('2023-01-01 is week 1', () => {
    expect(getWeekNumber('2023-01-01')).toBe(1)
  })
})

describe('getWeekBounds', () => {
  // 2026-04-13: 월요일 → 해당 주: 2026-04-13(월) ~ 2026-04-19(일)
  it('월요일 입력 시 해당 주 월~일 반환', () => {
    expect(getWeekBounds('2026-04-13')).toEqual({ start: '2026-04-13', end: '2026-04-19' })
  })

  // 2026-04-15: 수요일 → 해당 주: 2026-04-13(월) ~ 2026-04-19(일)
  it('수요일 입력 시 해당 주 월~일 반환', () => {
    expect(getWeekBounds('2026-04-15')).toEqual({ start: '2026-04-13', end: '2026-04-19' })
  })

  // 2026-04-19: 일요일 → 해당 주: 2026-04-13(월) ~ 2026-04-19(일)
  it('일요일 입력 시 해당 주 월~일 반환', () => {
    expect(getWeekBounds('2026-04-19')).toEqual({ start: '2026-04-13', end: '2026-04-19' })
  })

  // 2026-04-18: 토요일 → 해당 주: 2026-04-13(월) ~ 2026-04-19(일)
  it('토요일 입력 시 해당 주 월~일 반환', () => {
    expect(getWeekBounds('2026-04-18')).toEqual({ start: '2026-04-13', end: '2026-04-19' })
  })

  // 월 경계: 2026-03-31(화) → 2026-03-30(월) ~ 2026-04-05(일)
  it('월 경계를 넘는 주를 올바르게 계산', () => {
    expect(getWeekBounds('2026-03-31')).toEqual({ start: '2026-03-30', end: '2026-04-05' })
  })

  // 연 경계: 2026-01-01(목) → 2025-12-29(월) ~ 2026-01-04(일)
  it('연 경계를 넘는 주를 올바르게 계산', () => {
    expect(getWeekBounds('2026-01-01')).toEqual({ start: '2025-12-29', end: '2026-01-04' })
  })
})

describe('calculateAge', () => {
  it('calculates age', () => {
    const age = calculateAge('2000-01-01')
    expect(age).toBeGreaterThanOrEqual(25)
  })

  it('returns null for null input', () => {
    expect(calculateAge(null)).toBeNull()
  })
})


describe('escapeHtml', () => {
  it('escapes every character that can open a tag or attribute', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    )
  })

  it('escapes ampersands before other entities', () => {
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('returns an empty string for nullish input', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('printHtmlInIframe', () => {
  it('renders print content in a sandboxed frame that cannot run scripts', () => {
    printHtmlInIframe('<h1>주차 보고서</h1>')

    const frame = document.querySelector('iframe')
    expect(frame).not.toBeNull()

    const sandbox = frame?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-same-origin')
    expect(sandbox).toContain('allow-modals')
    expect(sandbox).not.toContain('allow-scripts')

    expect(frame?.getAttribute('srcdoc')).toContain('<h1>주차 보고서</h1>')

    frame?.remove()
  })
})
