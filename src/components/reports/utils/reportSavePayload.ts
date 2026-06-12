import type { ReportFormFields, ReportType } from './reportDataBuilder'
import type {
  CellAttendance,
  Newcomer,
  Program,
  ProjectBudgetItem,
  ProjectContentItem,
  ProjectScheduleItem,
} from '../types'
import type { MemberAttendanceItem } from '../CellMemberAttendance'

export interface ReportSaveRequest {
  reportType: ReportType
  weekNumber: number
  isDraft: boolean
  targetReportId?: string | null
  editReportId?: string | null
  form: ReportFormFields
  programs: Program[]
  newcomers: Newcomer[]
  contentItems: ProjectContentItem[]
  scheduleItems: ProjectScheduleItem[]
  budgetItems: ProjectBudgetItem[]
  cellAttendance: CellAttendance[]
  memberAttendance: MemberAttendanceItem[]
  selectedCellId: string
  enabledSections: string[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  departmentName?: string
}

export interface ReportSaveRpcPayload {
  report_type: ReportType
  is_draft: boolean
  target_report_id: string | null
  edit_report_id: string | null
  selected_cell_id: string | null
  attendance_date: string
  attendance_present_member_ids: string[]
  attendance_absent_member_ids: string[]
  report_data: Record<string, unknown>
  report_programs: Array<Record<string, unknown>>
  newcomers: Array<Record<string, unknown>>
  project_content_items: Array<Record<string, unknown>>
  project_schedule_items: Array<Record<string, unknown>>
  project_budget_items: Array<Record<string, unknown>>
}

export type ReportSaveSuccessResponse = {
  ok: true
  reportId: string
  createdReportId: string | null
  warnings?: string[]
}

export type ReportSaveDuplicateResponse = {
  ok: false
  duplicate: true
  id: string
  status: string
  message: string
}

export type ReportSaveErrorResponse = {
  ok: false
  duplicate?: false
  message: string
  reportId?: string
  createdReportId?: string | null
}

export type ReportSaveResponse =
  | ReportSaveSuccessResponse
  | ReportSaveDuplicateResponse
  | ReportSaveErrorResponse
