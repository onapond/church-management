import { describe, expect, it } from 'vitest'
import { summarizeReportAttendance, summarizeSelectedReports } from './reportAttendance'
import type { CellLeaderReportForAggregator } from '@/queries/reports'

function report(id: string, records: CellLeaderReportForAggregator['attendance_records']): CellLeaderReportForAggregator {
  return {
    id,
    meeting_title: null,
    report_date: '2026-09-06',
    worship_attendance: 99,
    total_registered: 99,
    meeting_attendance: 99,
    notes: null,
    main_content: null,
    application_notes: null,
    status: 'submitted',
    department_id: 'department-1',
    users: null,
    cells: null,
    attendance_records: records,
  }
}

describe('report attendance summaries', () => {
  it('uses linked personal rows instead of stale report summary columns', () => {
    const summary = summarizeReportAttendance(report('report-1', [
      { member_id: 'member-1', attendance_type: 'worship', is_present: true, checked_via: 'report' },
      { member_id: 'member-1', attendance_type: 'meeting', is_present: false, checked_via: 'report' },
      { member_id: 'member-2', attendance_type: 'worship', is_present: false, checked_via: 'report' },
      { member_id: 'member-2', attendance_type: 'meeting', is_present: true, checked_via: 'report' },
    ]).attendance_records)

    expect(summary).toEqual({ registered: 2, worship: 1, meeting: 1 })
  })

  it('deduplicates the same member across selected cell reports', () => {
    const reports = [
      report('report-1', [
        { member_id: 'member-1', attendance_type: 'worship', is_present: true, checked_via: 'report' },
      ]),
      report('report-2', [
        { member_id: 'member-1', attendance_type: 'worship', is_present: true, checked_via: 'report' },
        { member_id: 'member-2', attendance_type: 'meeting', is_present: true, checked_via: 'report' },
      ]),
    ]

    expect(summarizeSelectedReports(reports)).toEqual({ registered: 2, worship: 1, meeting: 1 })
  })
})
