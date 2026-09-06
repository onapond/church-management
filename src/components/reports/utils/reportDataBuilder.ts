import type { CellAttendance } from '../types'
import type { MemberAttendanceItem } from '../CellMemberAttendance'

export type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project' | 'visitation'

type ProjectSectionId = 'overview' | 'purpose' | 'organization' | 'content' | 'schedule' | 'budget' | 'discussion' | 'other'

export interface ReportFormFields {
  department_id: string
  report_date: string
  sermon_title: string
  sermon_scripture: string
  discussion_notes: string
  other_notes: string
  meeting_title: string
  meeting_location: string
  attendees: string
  main_content: string
  application_notes: string
  organization: string
}

export interface ReportDataInput {
  form: ReportFormFields
  reportType: ReportType
  reportYear: number
  weekNumber: number
  isDraft: boolean
  cellAttendance: CellAttendance[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  memberAttendance: MemberAttendanceItem[]
  selectedCellId: string
  enabledSections: ProjectSectionId[]
}

export interface ReportDataPayload {
  report_type: string
  department_id: string
  report_date: string
  week_number: number | null
  year: number
  total_registered: number
  worship_attendance: number
  meeting_attendance: number
  cell_id: string | null
  meeting_title: string | null
  meeting_location: string | null
  attendees: string | null
  main_content: string | null
  application_notes: string | null
  notes: string
  status: string
  submitted_at: string | null
}

export function buildCellLeaderAttendees(
  memberAttendance: MemberAttendanceItem[],
  fallback: string
): string {
  const presentNames = memberAttendance.filter(m => m.meetingPresent).map(m => m.name)
  if (presentNames.length === 0) return fallback
  return `${presentNames.join(', ')} (총 ${presentNames.length}명)`
}

export function buildReportData(input: ReportDataInput): ReportDataPayload {
  const {
    form,
    reportType,
    reportYear,
    weekNumber,
    isDraft,
    cellAttendance,
    attendanceSummary,
    memberAttendance,
    selectedCellId,
    enabledSections,
  } = input

  const isAttendanceReport = reportType === 'weekly' || reportType === 'cell_leader'
  const totalRegistered = reportType === 'cell_leader'
    ? memberAttendance.length
    : reportType === 'weekly' ? attendanceSummary.total : 0
  const totalWorship = reportType === 'cell_leader'
    ? memberAttendance.filter(member => member.worshipPresent).length
    : reportType === 'weekly' ? attendanceSummary.worship : 0
  const totalMeeting = reportType === 'cell_leader'
    ? memberAttendance.filter(member => member.meetingPresent).length
    : reportType === 'weekly' ? attendanceSummary.meeting : 0

  const cellLeaderAttendees =
    reportType === 'cell_leader' && selectedCellId && memberAttendance.length > 0
      ? buildCellLeaderAttendees(memberAttendance, form.attendees)
      : form.attendees

  return {
    report_type: reportType,
    department_id: form.department_id,
    report_date: form.report_date,
    week_number: reportType === 'weekly' ? weekNumber : null,
    year: reportYear,
    total_registered: isAttendanceReport ? totalRegistered : 0,
    worship_attendance: isAttendanceReport ? totalWorship : 0,
    meeting_attendance: isAttendanceReport ? totalMeeting : 0,
    cell_id: reportType === 'cell_leader' ? (selectedCellId || null) : null,
    meeting_title: reportType !== 'weekly' ? form.meeting_title : null,
    meeting_location:
      reportType !== 'weekly' &&
      reportType !== 'cell_leader' &&
      reportType !== 'project' &&
      reportType !== 'visitation'
        ? form.meeting_location
        : null,
    attendees:
      reportType !== 'weekly' && reportType !== 'project' && reportType !== 'visitation'
        ? cellLeaderAttendees
        : null,
    main_content: reportType !== 'weekly' ? form.main_content : null,
    application_notes: ['education', 'cell_leader', 'project', 'visitation'].includes(reportType)
      ? form.application_notes
      : null,
    notes: JSON.stringify({
      sermon_title: form.sermon_title,
      sermon_scripture: form.sermon_scripture,
      discussion_notes: form.discussion_notes,
      other_notes: form.other_notes,
      cell_attendance:
        reportType === 'weekly'
          ? cellAttendance.map((attendance) => {
              const { _key: _removedKey, ...rest } = attendance
              void _removedKey
              return rest
            })
          : [],
      organization: reportType === 'project' ? form.organization : undefined,
      project_sections: reportType === 'project' ? enabledSections : undefined,
    }),
    status: isDraft ? 'draft' : 'submitted',
    submitted_at: isDraft ? null : new Date().toISOString(),
  }
}
