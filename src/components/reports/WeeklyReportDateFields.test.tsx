import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WeeklyReportDateFields from './WeeklyReportDateFields'

function Form({ initialDate = '2026-10-25' }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate)
  return <WeeklyReportDateFields date={date} currentSunday="2026-10-25" onChange={setDate} />
}

describe('weekly report date selection', () => {
  it('selects last Sunday for a late report and returns to this Sunday when unchecked', () => {
    render(<Form />)
    fireEvent.click(screen.getByRole('checkbox', { name: '지난 보고서 늦게 제출' }))
    expect(screen.getByLabelText('보고 대상 날짜 (예배일)')).toHaveValue('2026-10-18')
    expect(screen.getByText(/2026년 42주차/)).toHaveTextContent('늦은 제출')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByLabelText('보고 대상 날짜 (예배일)')).toHaveValue('2026-10-25')
    expect(screen.getByText(/2026년 43주차/)).not.toHaveTextContent('늦은 제출')
  })
  it('updates the week and late checkbox for manually selected and restored dates', () => {
    render(<Form initialDate="2026-10-18" />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    fireEvent.change(screen.getByLabelText('보고 대상 날짜 (예배일)'), { target: { value: '2025-12-28' } })
    expect(screen.getByText(/2025년 52주차/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
