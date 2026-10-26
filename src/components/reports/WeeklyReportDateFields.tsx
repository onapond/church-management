'use client'

import { formatDate } from '@/lib/utils'
import { getReportPeriod, shiftReportDate } from './utils/reportPeriod'

interface Props {
  date: string
  currentSunday: string
  onChange: (date: string) => void
  disabled?: boolean
}

export default function WeeklyReportDateFields({ date, currentSunday, onChange, disabled }: Props) {
  const period = getReportPeriod(date)
  const isLate = !!period && date < currentSunday

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          checked={isLate}
          disabled={disabled}
          onChange={e => onChange(e.target.checked ? shiftReportDate(currentSunday, -7) : currentSunday)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        지난 보고서 늦게 제출
      </label>
      <div>
        <label htmlFor="weekly-report-date" className="mb-1 block text-sm font-medium text-gray-700">
          보고 대상 날짜 (예배일)
        </label>
        <input
          id="weekly-report-date"
          type="date"
          required
          value={date}
          disabled={disabled}
          aria-describedby="weekly-report-date-help"
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p id="weekly-report-date-help" className="mt-1 text-xs text-gray-500">
          작성하는 오늘 날짜가 아니라, 보고할 예배 날짜를 선택하세요. 더 이전 보고서는 날짜를 직접 바꾸세요.
        </p>
      </div>
      <p aria-live="polite" className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
        {period ? `${period.year}년 ${period.weekNumber}주차 · ${formatDate(date)}${isLate ? ' · 늦은 제출' : ''}` : '보고 대상 날짜를 선택하세요.'}
      </p>
    </div>
  )
}
