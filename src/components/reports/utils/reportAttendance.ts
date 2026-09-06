import type { CellLeaderReportForAggregator } from '@/queries/reports'

export interface ReportAttendanceSummary {
  registered: number
  worship: number
  meeting: number
}

export function summarizeReportAttendance(
  records: CellLeaderReportForAggregator['attendance_records'],
): ReportAttendanceSummary {
  const registeredMemberIds = new Set<string>()
  const worshipMemberIds = new Set<string>()
  const meetingMemberIds = new Set<string>()

  for (const record of records) {
    registeredMemberIds.add(record.member_id)
    if (!record.is_present) continue

    if (record.attendance_type === 'worship') {
      worshipMemberIds.add(record.member_id)
    } else if (record.attendance_type === 'meeting') {
      meetingMemberIds.add(record.member_id)
    }
  }

  return {
    registered: registeredMemberIds.size,
    worship: worshipMemberIds.size,
    meeting: meetingMemberIds.size,
  }
}

export function summarizeSelectedReports(
  reports: CellLeaderReportForAggregator[],
): ReportAttendanceSummary {
  return summarizeReportAttendance(reports.flatMap(report => report.attendance_records))
}
