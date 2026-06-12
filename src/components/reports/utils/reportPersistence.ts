import { createApprovalNotification } from '@/lib/notifications'
import { buildReportData } from './reportDataBuilder'
import type { SupabaseLikeClient } from './reportChildPersistence'
import type { ReportSaveRequest } from './reportSavePayload'

type SupabaseRpcClient = SupabaseLikeClient & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, params: Record<string, unknown>) => any
}

type DuplicateResult = {
  duplicate: true
  id: string
  status: string
  message: string
}

type SaveSuccessResult = {
  reportId: string
  createdReportId: string | null
  warnings: string[]
}

type SaveResult = SaveSuccessResult | DuplicateResult

function withResubmissionReset(reportData: Record<string, unknown>, isDraft: boolean) {
  if (isDraft) return reportData

  return {
    ...reportData,
    coordinator_id: null,
    coordinator_reviewed_at: null,
    coordinator_comment: null,
    manager_id: null,
    manager_approved_at: null,
    manager_comment: null,
    final_approver_id: null,
    final_approved_at: null,
    final_comment: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
  }
}

function failIfError(error: { message?: string } | null, context: string): void {
  if (!error) return
  console.error(`${context}:`, error)
  throw new Error(`${context}: ${error.message || 'unknown error'}`)
}

function normalizePrograms(request: ReportSaveRequest) {
  if (request.reportType === 'cell_leader' || request.reportType === 'project') return []

  return request.programs
    .filter(program => program.content || program.start_time)
    .map((program, index) => ({
      id: program.id ?? null,
      start_time: program.start_time || '00:00',
      content: `${program.content}${program.note ? ` [${program.note}]` : ''}`,
      person_in_charge: program.person_in_charge || null,
      order_index: index,
    }))
}

function normalizeNewcomers(request: ReportSaveRequest) {
  if (request.reportType !== 'weekly') return []

  return request.newcomers
    .filter(newcomer => newcomer.name)
    .map(newcomer => ({
      id: newcomer.id ?? null,
      name: newcomer.name,
      phone: newcomer.phone || null,
      birth_date: newcomer.birth_date || null,
      introducer: newcomer.introducer || null,
      address: newcomer.address || null,
      affiliation: newcomer.affiliation || null,
      department_id: request.form.department_id,
    }))
}

function normalizeProjectItems(request: ReportSaveRequest) {
  if (request.reportType !== 'project') {
    return {
      contentItems: [],
      scheduleItems: [],
      budgetItems: [],
    }
  }

  return {
    contentItems: request.contentItems
      .filter(item => item.col1 || item.col2 || item.col3 || item.col4)
      .map((item, index) => ({
        id: item.id ?? null,
        col1: item.col1,
        col2: item.col2,
        col3: item.col3,
        col4: item.col4,
        order_index: index,
      })),
    scheduleItems: request.scheduleItems
      .filter(item => item.schedule || item.detail)
      .map((item, index) => ({
        id: item.id ?? null,
        schedule: item.schedule,
        detail: item.detail,
        note: item.note,
        order_index: index,
      })),
    budgetItems: request.budgetItems
      .filter(item => item.item_name || item.unit_price > 0)
      .map((item, index) => ({
        id: item.id ?? null,
        category: item.category,
        subcategory: item.subcategory,
        item_name: item.item_name,
        basis: item.basis,
        unit_price: item.unit_price || 0,
        quantity: item.quantity || 1,
        amount: (item.unit_price || 0) * (item.quantity || 0),
        note: item.note,
        order_index: index,
      })),
  }
}

function parseRpcResult(data: unknown): SaveResult {
  const result = data as Record<string, unknown> | null
  if (!result) {
    throw new Error('save_report_bundle returned no data')
  }

  if (result.duplicate) {
    return {
      duplicate: true,
      id: String(result.id || ''),
      status: String(result.status || ''),
      message: String(result.message || 'Duplicate report exists'),
    }
  }

  const reportId = typeof result.reportId === 'string' ? result.reportId.trim() : ''
  if (!reportId) {
    throw new Error('save_report_bundle returned no reportId')
  }

  return {
    reportId,
    createdReportId: typeof result.createdReportId === 'string' ? result.createdReportId : null,
    warnings: Array.isArray(result.warnings)
      ? result.warnings.map(warning => String(warning))
      : [],
  }
}

async function sendSubmitNotification(
  supabase: SupabaseRpcClient,
  reportId: string,
  request: ReportSaveRequest,
  authorId: string,
) {
  await createApprovalNotification(supabase as never, {
    reportId,
    fromStatus: 'draft',
    toStatus: 'submitted',
    departmentName: request.departmentName || '',
    reportType: request.reportType,
    authorId,
    reportDepartmentId: request.form.department_id,
  }).catch((error) => {
    console.error('Create submit notification failed:', error)
  })
}

async function saveReportViaRpc(
  supabase: SupabaseRpcClient,
  request: ReportSaveRequest,
): Promise<SaveResult> {
  const reportYear = parseInt(request.form.report_date.split('-')[0], 10)
  const reportData = buildReportData({
    form: request.form,
    reportType: request.reportType,
    reportYear,
    weekNumber: request.weekNumber,
    isDraft: request.isDraft,
    cellAttendance: request.cellAttendance,
    attendanceSummary: request.attendanceSummary,
    memberAttendance: request.memberAttendance,
    selectedCellId: request.selectedCellId,
    enabledSections: request.enabledSections as never,
  })
  const { contentItems, scheduleItems, budgetItems } = normalizeProjectItems(request)
  const attendancePresentMemberIds = request.memberAttendance
    .filter(member => member.isPresent)
    .map(member => member.memberId)
  const attendanceAbsentMemberIds = request.memberAttendance
    .filter(member => !member.isPresent)
    .map(member => member.memberId)

  const { data, error } = await supabase.rpc('save_report_bundle', {
    payload: {
      report_type: request.reportType,
      is_draft: request.isDraft,
      target_report_id: request.targetReportId ?? null,
      edit_report_id: request.editReportId ?? null,
      selected_cell_id: request.selectedCellId || null,
      attendance_date: request.form.report_date,
      attendance_present_member_ids: attendancePresentMemberIds,
      attendance_absent_member_ids: attendanceAbsentMemberIds,
      report_data: withResubmissionReset(reportData as unknown as Record<string, unknown>, request.isDraft),
      report_programs: normalizePrograms(request),
      newcomers: normalizeNewcomers(request),
      project_content_items: contentItems,
      project_schedule_items: scheduleItems,
      project_budget_items: budgetItems,
    },
  })

  failIfError(error, 'save_report_bundle rpc failed')
  return parseRpcResult(data)
}

export async function persistReportBundle(
  supabase: SupabaseRpcClient,
  request: ReportSaveRequest,
  authorId: string,
) {
  const saveResult = await saveReportViaRpc(supabase, request)
  if ('duplicate' in saveResult) return saveResult

  if (!request.isDraft) {
    await sendSubmitNotification(supabase, saveResult.reportId, request, authorId)
  }

  return saveResult
}
