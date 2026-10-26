import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WeeklyReportDateFields from './WeeklyReportDateFields'

function Form({ initialDate = '2026-10-25' }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate)
  return <WeeklyReportDateFields date={date} currentSunday="2026-10-25" onChange={setDate} />
}

describe('weekly report date selection', () => {
  it('selects last Sunday for a previous report and returns to this Sunday when unchecked', () => {
    render(<Form />)
    fireEvent.click(screen.getByRole('checkbox', { name: '2026년 10월 18일 (42주차) 보고서 제출' }))
    expect(screen.getByLabelText('보고 대상 날짜 (예배일)')).toHaveValue('2026-10-18')
    expect(screen.getByRole('checkbox')).toHaveAccessibleName('2026년 10월 18일 (42주차) 보고서 제출')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByLabelText('보고 대상 날짜 (예배일)')).toHaveValue('2026-10-25')
    expect(screen.getByText('2026년 10월 25일 (43주차) 보고서 제출')).toBeInTheDocument()
  })
  it('updates the week and previous-report checkbox for manually selected and restored dates', () => {
    render(<Form initialDate="2026-10-18" />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    fireEvent.change(screen.getByLabelText('보고 대상 날짜 (예배일)'), { target: { value: '2025-12-28' } })
    expect(screen.getByRole('checkbox')).toHaveAccessibleName('2025년 12월 28일 (52주차) 보고서 제출')
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
