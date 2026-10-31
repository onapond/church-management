import type { CellLeaderReportForAggregator } from '@/queries/reports'
import type { MemberAttendanceItem } from '../CellMemberAttendance'

export interface ReportAttendanceSummary {
  registered: number
  worship: number
  meeting: number
}

export function createCellMemberAttendance(
  members: Array<{ id: string; name: string; photo_url: string | null }>,
  records: Array<{
    member_id: string
    attendance_type: 'worship' | 'meeting'
    is_present: boolean
  }>,
): MemberAttendanceItem[] {
  const attendanceMap = new Map<string, boolean>(
    records.map(record => [`${record.member_id}:${record.attendance_type}`, record.is_present]),
  )

  return members.map(member => ({
    memberId: member.id,
    name: member.name,
    photoUrl: member.photo_url,
    worshipPresent: attendanceMap.get(`${member.id}:worship`) ?? false,
    meetingPresent: attendanceMap.get(`${member.id}:meeting`) ?? false,
  }))
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
