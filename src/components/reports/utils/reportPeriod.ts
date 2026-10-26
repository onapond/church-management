import { getWeekNumber } from '@/lib/utils'

/** 보고 대상 날짜가 저장 주차의 유일한 기준이다. 작성/제출 시각과 분리한다. */
export function getReportPeriod(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null
  return { year: Number(date.slice(0, 4)), weekNumber: getWeekNumber(date) }
}

export function shiftReportDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function getCurrentReportSunday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  return shiftReportDate(today, -new Date(`${today}T00:00:00Z`).getUTCDay())
}
