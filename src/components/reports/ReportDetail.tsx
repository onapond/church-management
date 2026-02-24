'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { createApprovalNotification } from '@/lib/notifications'
import { useToastContext } from '@/providers/ToastProvider'
import { useAuth } from '@/providers/AuthProvider'
import DOMPurify from 'dompurify'
import { canAccessAllDepartments, canViewReport, canDeleteReport, canEditReport } from '@/lib/permissions'
import { useReportDetail, useReportPrograms, useReportNewcomers, useApprovalHistory, useProjectContentItems, useProjectScheduleItems, useProjectBudgetItems, useChangeReportType } from '@/queries/reports'
import { useCellMembers, useCellAttendanceRecords } from '@/queries/attendance'
import { escapeHtml, printHtmlInIframe } from '@/lib/utils'

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project'

interface ReportDetailProps {
  reportId: string
}

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
  cell_leader: { label: '셀장 보고서', icon: '🏠' },
  project: { label: '프로젝트 계획', icon: '📑' },
}

/** 결재 단계별 권한 확인 */
function checkApprovalPermission(userRole: string, reportStatus: string): string | null {
  if (reportStatus === 'submitted') {
    if (userRole === 'president' || userRole === 'super_admin') return 'coordinator'
  }
  if (reportStatus === 'coordinator_reviewed') {
    if (userRole === 'accountant' || userRole === 'super_admin') return 'manager'
  }
  if (reportStatus === 'manager_approved') {
    if (userRole === 'super_admin') return 'final'
  }
  return null
}

export default function ReportDetail({ reportId }: ReportDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const toast = useToastContext()
  const { user: currentUser } = useAuth()

  // 1. 데이터 조회 (Hooks)
  const { data: report, isLoading: reportLoading } = useReportDetail(reportId)
  const { data: programs = [], isLoading: programsLoading } = useReportPrograms(reportId)
  const { data: newcomers = [] } = useReportNewcomers(reportId)
  const { data: history = [] } = useApprovalHistory(reportId)
  const { data: projectContentItems = [] } = useProjectContentItems(reportId)
  const { data: projectScheduleItems = [] } = useProjectScheduleItems(reportId)
  const { data: projectBudgetItems = [] } = useProjectBudgetItems(reportId)
  const changeReportType = useChangeReportType()

  // 2. 상태 관리 (Hooks)
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [printerIP, setPrinterIP] = useState('')
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false)
  const [newReportType, setNewReportType] = useState<ReportType>('weekly')

  // 3. 파생 데이터 및 메모이제이션 (Hooks)
  const reportType: ReportType = useMemo(
    () => ((report as any)?.report_type || 'weekly') as ReportType,
    [report]
  )

  const parsedNotes = useMemo(() => {
    try {
      return report?.notes ? JSON.parse(report.notes) : {}
    } catch {
      return {}
    }
  }, [report?.notes])

  const projectSections = useMemo(() => 
    parsedNotes.project_sections || [
      'overview', 'purpose', 'organization', 'content', 'schedule', 'budget', 'discussion', 'other'
    ]
  , [parsedNotes.project_sections])

  const hasProjSection = useCallback((id: string) => 
    reportType !== 'project' || projectSections.includes(id)
  , [reportType, projectSections])

  const projNumMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (reportType === 'project') {
      let n = 1
      for (const id of ['overview', 'purpose', 'organization', 'content', 'schedule', 'budget']) {
        if (!projectSections.includes(id)) continue
        if (id === 'schedule' && map['content']) continue
        map[id] = n
        if (id === 'content') map['schedule'] = n
        n++
      }
    }
    return map
  }, [reportType, projectSections])

  const projNum = useCallback((id: string) => projNumMap[id] || '', [projNumMap])

  // 셀장보고서: 셀원 출결 데이터
  const cellId = report?.cell_id as string | undefined
  const { data: cellMembers = [] } = useCellMembers(
    reportType === 'cell_leader' ? cellId : undefined
  )
  const cellMemberIds = useMemo(() => cellMembers.map(m => m.id), [cellMembers])
  const { data: cellAttendanceRecords = [] } = useCellAttendanceRecords(
    reportType === 'cell_leader' && cellMemberIds.length > 0 ? cellMemberIds : [],
    report?.report_date || ''
  )

  // 부서명 표시
  const getDeptDisplayName = useCallback(() => {
    const code = report?.departments?.code
    if (code === 'ck') return '유치부/아동부'
    if (code === 'cu_worship') return 'CU워십'
    if (code === 'youth') return '청소년부'
    if (code === 'cu1') return '1청년'
    if (code === 'cu2') return '2청년'
    if (code === 'leader') return '리더'
    return report?.departments?.name || ''
  }, [report?.departments])

  // 날짜 포맷
  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }, [])

  // 인쇄 핸들러
  const handlePrint = useCallback((_directIP?: string) => {
    if (!report) return
    const cellAttendance = parsedNotes.cell_attendance || []
    const reportDate = new Date(report.report_date)

    let html = ''
    if (reportType === 'weekly') {
      const programRows = programs.length > 0
        ? programs.map(p => {
            const time = p.start_time ? escapeHtml(p.start_time.slice(0, 5)) : ''
            let content = escapeHtml(p.content || '')
            if (parsedNotes.sermon_title && (p.content || '').includes('말씀')) {
              content += ` [${escapeHtml(parsedNotes.sermon_title)} ${escapeHtml(parsedNotes.sermon_scripture || '')}]`
            }
            return `<tr><td class="cell">${time}</td><td class="cell" style="text-align:left;">${content}</td><td class="cell">${escapeHtml(p.person_in_charge || '')}</td><td class="cell"></td></tr>`
          }).join('')
        : `<tr><td class="cell" colspan="4" style="height:60px;"></td></tr>`

      let attendanceRows = ''
      if (cellAttendance.length > 0 && cellAttendance.some((c: any) => c.cell_name)) {
        attendanceRows = cellAttendance.map((cell: any) => `
          <tr>
            <td class="cell">${escapeHtml(cell.cell_name || '')}</td>
            <td class="cell">${escapeHtml(String(cell.registered || ''))}</td>
            <td class="cell">${escapeHtml(String(cell.worship || ''))}</td>
            <td class="cell">${escapeHtml(String(cell.meeting || ''))}</td>
            <td class="cell" style="text-align:left;">${escapeHtml(cell.note || '')}</td>
          </tr>
        `).join('')
      } else {
        for (let i = 0; i < 3; i++) {
          attendanceRows += `<tr><td class="cell" style="height:28px;"></td><td class="cell"></td><td class="cell"></td><td class="cell"></td><td class="cell"></td></tr>`
        }
      }

      const newcomerRows = newcomers.length > 0
        ? newcomers.map(n => `<tr><td class="cell">${escapeHtml(n.name)}</td><td class="cell">${escapeHtml(n.phone || '')}</td><td class="cell">${escapeHtml(n.birth_date || '')}</td><td class="cell">${escapeHtml(n.introducer || '')}</td><td class="cell" style="text-align:left;">${escapeHtml(n.address || '')}</td><td class="cell">${escapeHtml(n.affiliation || '')}</td></tr>`).join('')
        : `<tr><td class="cell" colspan="6" style="height:28px;"></td></tr>`

      html = generateWeeklyPrintHTML(getDeptDisplayName(), report, reportDate, programRows, attendanceRows, newcomerRows, parsedNotes)
    } else if (reportType === 'project') {
      html = generateProjectPrintHTML(report.meeting_title || getDeptDisplayName(), report, reportDate, parsedNotes, projectContentItems, projectScheduleItems, projectBudgetItems)
    } else {
      const programRows = programs.length > 0
        ? programs.map(p => `<tr><td class="cell">${p.start_time ? escapeHtml(p.start_time.slice(0, 5)) : ''}</td><td class="cell" style="text-align:left;">${escapeHtml(p.content || '')}</td><td class="cell">${escapeHtml(p.person_in_charge || '')}</td><td class="cell"></td></tr>`).join('')
        : `<tr><td class="cell" colspan="4" style="height:60px;"></td></tr>`
      html = generateMeetingPrintHTML(reportType, report.meeting_title || getDeptDisplayName(), report, reportDate, programRows, parsedNotes, cellMembers, cellAttendanceRecords)
    }

    printHtmlInIframe(html)
    setShowPrintOptions(false)
  }, [report, programs, newcomers, getDeptDisplayName, reportType, projectContentItems, projectScheduleItems, projectBudgetItems, cellMembers, cellAttendanceRecords, parsedNotes])

  // 권한 계산
  const userRole = currentUser?.role || ''
  const canApprove = useMemo(
    () => report ? checkApprovalPermission(userRole, report.status) : null,
    [userRole, report?.status]
  )
  const canDelete = canAccessAllDepartments(userRole)

  // 이펙트
  useEffect(() => {
    const savedIP = localStorage.getItem('printerIP')
    if (savedIP) setPrinterIP(savedIP)
  }, [])

  // 4. 조기 리턴문들 (Hooks 이후에 배치)
  if (reportLoading || programsLoading || !currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-2xl" /><div className="h-40 bg-gray-100 rounded-2xl" /><div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        <div className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">보고서를 찾을 수 없습니다</h2>
          <button onClick={() => router.push('/reports')} className="text-blue-600 text-sm hover:underline">보고서 목록으로 돌아가기</button>
        </div>
      </div>
    )
  }

  if (!canViewReport(currentUser, report)) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">열람 권한 없음</h2>
          <p className="text-sm text-yellow-600">이 보고서를 열람할 권한이 없습니다.</p>
        </div>
      </div>
    )
  }

  // 5. 이벤트 핸들러
  const handleCancelSubmission = async () => {
    // 본인 또는 관리자만 취소 가능
    const canCancel = currentUser?.id === report.author_id || canAccessAllDepartments(userRole)
    if (!canCancel || report.status !== 'submitted') return
    
    setLoading(true); setShowCancelModal(false)
    try {
      await supabase.from('weekly_reports').update({ status: 'draft', submitted_at: null }).eq('id', report.id)
      await supabase.from('approval_history').insert({ report_id: report.id, approver_id: currentUser.id, from_status: 'submitted', to_status: 'draft', comment: '제출 취소' })
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('제출이 취소되었습니다.')
    } catch (err) {
      console.error(err); toast.error('제출 취소 중 오류가 발생했습니다.')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!canDeleteReport(currentUser, report)) return
    setLoading(true); setShowDeleteModal(false)
    try {
      const tid = report.id
      
      // 1. Storage 사진 삭제
      const { data: files } = await supabase.storage.from('report-photos').list(tid)
      if (files && files.length > 0) {
        await supabase.storage.from('report-photos').remove(files.map((f: any) => `${tid}/${f.name}`))
      }

      // 2. DB 데이터 삭제 (CASCADE 설정에 의해 상단 하위 데이터는 자동 삭제되나, 수동 삭제를 통해 확실히 함)
      await supabase.from('report_programs').delete().eq('report_id', tid)
      await supabase.from('newcomers').delete().eq('report_id', tid)
      await supabase.from('approval_history').delete().eq('report_id', tid)
      await supabase.from('attendance_records').delete().eq('report_id', tid)
      await supabase.from('notifications').delete().eq('report_id', tid)
      await supabase.from('report_photos').delete().eq('report_id', tid)
      await supabase.from('project_content_items').delete().eq('report_id', tid)
      await supabase.from('project_schedule_items').delete().eq('report_id', tid)
      await supabase.from('project_budget_items').delete().eq('report_id', tid)
      const { error } = await supabase.from('weekly_reports').delete().eq('id', tid)
      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('보고서가 삭제되었습니다.')
      router.push('/reports')
    } catch (err) {
      console.error(err); toast.error('보고서 삭제 중 오류가 발생했습니다.')
    } finally { setLoading(false) }
  }

  const handleChangeType = () => {
    changeReportType.mutate({ reportId: report.id, newType: newReportType }, {
      onSuccess: () => { setShowTypeChangeModal(false); toast.success('보고서 타입이 변경되었습니다.') },
      onError: () => { toast.error('타입 변경 중 오류가 발생했습니다.') },
    })
  }

  const handleApproval = async () => {
    if (!canApprove || loading) return
    setLoading(true)
    try {
      const now = new Date().toISOString()
      let newStatus = report.status
      const updateData: Record<string, any> = {}
      if (approvalAction === 'approve') {
        if (canApprove === 'coordinator') { newStatus = 'coordinator_reviewed'; updateData.coordinator_id = currentUser.id; updateData.coordinator_reviewed_at = now; updateData.coordinator_comment = comment }
        else if (canApprove === 'manager') { newStatus = 'manager_approved'; updateData.manager_id = currentUser.id; updateData.manager_approved_at = now; updateData.manager_comment = comment }
        else if (canApprove === 'final') { newStatus = 'final_approved'; updateData.final_approver_id = currentUser.id; updateData.final_approved_at = now; updateData.final_comment = comment }
      } else {
        newStatus = 'rejected'; updateData.rejected_by = currentUser.id; updateData.rejected_at = now; updateData.rejection_reason = comment
      }
      const { error: updateError } = await supabase.from('weekly_reports').update({ ...updateData, status: newStatus }).eq('id', report.id)
      if (updateError) throw updateError
      await Promise.all([
        supabase.from('approval_history').insert({ report_id: report.id, approver_id: currentUser.id, from_status: report.status, to_status: newStatus, comment }),
        createApprovalNotification(supabase, { reportId: report.id, fromStatus: report.status, toStatus: newStatus, departmentName: report.departments?.name || '', reportType: reportType, authorId: report.author_id }),
      ])
      await queryClient.invalidateQueries({ queryKey: ['approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.back()
    } catch (err) {
      console.error(err); toast.error('결재 처리 중 오류가 발생했습니다.')
    } finally { setLoading(false) }
  }

  const typeConfig = REPORT_TYPE_CONFIG[reportType]
  const canCancelSubmission = (currentUser?.id === report.author_id || canAccessAllDepartments(userRole)) && report.status === 'submitted'
  const canEdit = canEditReport(currentUser, report)

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{typeConfig.icon}</span>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                {reportType === 'weekly' ? getDeptDisplayName() : report.meeting_title || getDeptDisplayName()}
              </h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(report.report_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              {reportType === 'weekly' && report.week_number && ` (${report.week_number}주차)`}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">작성자: {report.users?.name}{reportType !== 'weekly' && report.departments?.name && ` · ${report.departments.name}`}</p>
          </div>
          <div className="flex items-center gap-1">
            {canAccessAllDepartments(userRole) && <button onClick={() => { setNewReportType(reportType); setShowTypeChangeModal(true) }} className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors" title="타입 변경"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>}
            {canDeleteReport(currentUser, report) && <button onClick={() => setShowDeleteModal(true)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="삭제"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
            {canCancelSubmission && <button onClick={() => setShowCancelModal(true)} className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors" title="제출 취소"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>}
            {canEdit && <button onClick={() => router.push(`/reports/${report.id}/edit`)} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="수정"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>}
            <button onClick={() => setShowPrintOptions(true)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="인쇄"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
            <button onClick={() => router.back()} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="닫기"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      </div>

      {/* 모임/교육/셀장 개요 */}
      {reportType !== 'weekly' && reportType !== 'project' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm lg:text-base">{reportType === 'cell_leader' ? '셀 모임 개요' : reportType === 'meeting' ? '모임 개요' : '교육 개요'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 bg-gray-50 rounded-xl ${reportType === 'cell_leader' ? 'col-span-2' : ''}`}><p className="text-xs text-gray-500 mb-1">일시</p><p className="text-sm font-medium text-gray-900">{formatDate(report.report_date)}</p></div>
            {reportType !== 'cell_leader' && <div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">장소</p><p className="text-sm font-medium text-gray-900">{report.meeting_location || '-'}</p></div>}
            {!(reportType === 'cell_leader' && cellId && cellMembers.length > 0) && <div className="col-span-2 p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">참석자</p><p className="text-sm font-medium text-gray-900">{report.attendees || '-'}</p></div>}
          </div>
        </div>
      )}

      {/* 셀원 출석 현황 */}
      {reportType === 'cell_leader' && cellId && cellMembers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">셀원 출석 <span className="text-sm font-normal text-gray-500">({cellAttendanceRecords.filter(r => r.is_present).length}/{cellMembers.length}명)</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cellMembers.map(member => {
              const isPresent = cellAttendanceRecords.some(r => r.member_id === member.id && r.is_present)
              return (
                <div key={member.id} className={`flex items-center gap-2 p-2.5 rounded-xl ${isPresent ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {member.photo_url ? <img src={member.photo_url} alt={member.name} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">{member.name.charAt(0)}</div>}
                  <span className="text-sm font-medium text-gray-900 flex-1">{member.name}</span>
                  {isPresent ? <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 프로젝트 내용 */}
      {reportType === 'project' && (
        <div className="space-y-4">
          {hasProjSection('overview') && report.main_content && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{projNum('overview')}. 개요</h2><div className="bg-gray-50 p-4 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report.main_content) }} /></div></div>}
          {hasProjSection('purpose') && report.application_notes && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{projNum('purpose')}. 목적</h2><div className="bg-gray-50 p-4 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report.application_notes) }} /></div></div>}
          {hasProjSection('organization') && parsedNotes.organization && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{projNum('organization')}. 조직도</h2><div className="bg-gray-50 p-4 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedNotes.organization) }} /></div></div>}
        </div>
      )}

      {/* 프로젝트 세부 계획 */}
      {reportType === 'project' && ( (hasProjSection('content') && projectContentItems.length > 0) || (hasProjSection('schedule') && projectScheduleItems.length > 0) ) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 text-sm lg:text-base">{projNum('content') || projNum('schedule')}. 세부 계획</h2>
          {hasProjSection('content') && projectContentItems.length > 0 && (
            <div><p className="text-xs font-medium text-gray-500 mb-2">내용</p><div className="overflow-x-auto"><table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-600 border-b">항목</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b">내용</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b">담당</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b">비고</th></tr></thead><tbody>{projectContentItems.map((item) => (<tr key={item.id} className="border-b border-gray-100 last:border-b-0"><td className="px-3 py-2 text-gray-900">{item.col1}</td><td className="px-3 py-2 text-gray-700">{item.col2}</td><td className="px-3 py-2 text-gray-700">{item.col3}</td><td className="px-3 py-2 text-gray-500">{item.col4}</td></tr>))}</tbody></table></div></div>
          )}
          {hasProjSection('schedule') && projectScheduleItems.length > 0 && (
            <div><p className="text-xs font-medium text-gray-500 mb-2">세부 일정표</p><div className="overflow-x-auto"><table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '30%' }}>일정표</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b">세부내용</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '20%' }}>비고</th></tr></thead><tbody>{projectScheduleItems.map((item) => (<tr key={item.id} className="border-b border-gray-100 last:border-b-0"><td className="px-3 py-2 text-gray-900">{item.schedule}</td><td className="px-3 py-2 text-gray-700">{item.detail}</td><td className="px-3 py-2 text-gray-500">{item.note}</td></tr>))}</tbody></table></div></div>
          )}
        </div>
      )}

      {/* 프로젝트 예산 */}
      {reportType === 'project' && hasProjSection('budget') && projectBudgetItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{projNum('budget')}. 예산 <span className="text-xs font-normal text-gray-400">(단위: 원)</span></h2>
          <div className="overflow-x-auto"><table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden"><thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-600 border-b text-xs">항</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b text-xs">목</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b text-xs">세부품목</th><th className="px-3 py-2 text-right font-medium text-gray-600 border-b text-xs">금액</th><th className="px-3 py-2 text-right font-medium text-gray-600 border-b text-xs">개수</th><th className="px-3 py-2 text-right font-medium text-gray-600 border-b text-xs">합계</th><th className="px-3 py-2 text-left font-medium text-gray-600 border-b text-xs">비고</th></tr></thead><tbody>{projectBudgetItems.map((item) => { const rowTotal = (item.unit_price || 0) * (item.quantity || 0) || item.amount || 0; return (<tr key={item.id} className="border-b border-gray-100 last:border-b-0"><td className="px-3 py-2 text-gray-700 text-xs">{item.subcategory}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.item_name}</td><td className="px-3 py-2 text-gray-600 text-xs">{item.basis}</td><td className="px-3 py-2 text-right font-medium text-gray-900 text-xs">{item.unit_price ? item.unit_price.toLocaleString() : ''}</td><td className="px-3 py-2 text-right text-gray-700 text-xs">{item.quantity ?? ''}</td><td className="px-3 py-2 text-right font-medium text-gray-900 text-xs">{rowTotal ? rowTotal.toLocaleString() : ''}</td><td className="px-3 py-2 text-gray-500 text-xs">{item.note}</td></tr>) })}</tbody><tfoot><tr className="bg-blue-50"><td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-900 text-sm">합계</td><td className="px-3 py-2 text-right font-bold text-blue-700 text-sm">{projectBudgetItems.reduce((sum, b) => sum + ((b.unit_price || 0) * (b.quantity || 0) || b.amount || 0), 0).toLocaleString()}</td><td></td></tr></tfoot></table></div>
        </div>
      )}

      {/* 진행 순서 (일반 보고서) */}
      {programs.length > 0 && reportType !== 'project' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">진행순서</h2><div className="space-y-2">{programs.map((program) => (<div key={program.id} className="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-xl"><span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded shrink-0">{program.start_time.slice(0, 5)}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{program.content}</p>{program.person_in_charge && (<p className="text-xs text-gray-500 mt-0.5">{program.person_in_charge}</p>)}</div></div>))}</div></div>
      )}

      {/* 주요 내용 */}
      {reportType !== 'weekly' && reportType !== 'project' && report.main_content && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{reportType === 'cell_leader' ? '나눔 내용' : reportType === 'meeting' ? '주요내용' : '교육내용'}</h2><div className="bg-gray-50 p-4 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report.main_content) }} /></div></div>
      )}

      {/* 출결 (주차 보고서) */}
      {reportType === 'weekly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">출결 현황</h2><div className="grid grid-cols-3 gap-3"><div className="text-center py-4 px-2 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">재적</p><p className="text-2xl lg:text-3xl font-bold text-gray-900">{report.total_registered}</p></div><div className="text-center py-4 px-2 bg-blue-50 rounded-xl"><p className="text-xs text-blue-600 mb-1">예배</p><p className="text-2xl lg:text-3xl font-bold text-blue-700">{report.worship_attendance}</p></div><div className="text-center py-4 px-2 bg-green-50 rounded-xl"><p className="text-xs text-green-600 mb-1">모임</p><p className="text-2xl lg:text-3xl font-bold text-green-700">{report.meeting_attendance}</p></div></div></div>
      )}

      {/* 새신자 (주차 보고서) */}
      {reportType === 'weekly' && newcomers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">새신자 명단</h2><div className="space-y-3">{newcomers.map((newcomer) => (<div key={newcomer.id} className="p-3 bg-gray-50 rounded-xl"><div className="flex items-center justify-between gap-2"><p className="font-medium text-gray-900">{newcomer.name}</p>{newcomer.converted_to_member_id ? (<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium shrink-0">전환 완료</span>) : (canDelete || currentUser?.id === report.author_id) && (<a href={`/members/new?newcomerId=${newcomer.id}`} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shrink-0">교인 전환</a>)}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">{newcomer.phone && <span>연락처: {newcomer.phone}</span>}{newcomer.introducer && <span>인도자: {newcomer.introducer}</span>}{newcomer.affiliation && <span>소속: {newcomer.affiliation}</span>}</div></div>))}</div></div>
      )}

      {/* 논의/기도제목 */}
      {(parsedNotes.discussion_notes || parsedNotes.other_notes || report.application_notes) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">{reportType === 'cell_leader' ? '기도제목 및 기타사항' : reportType === 'education' ? '적용점 및 기타사항' : '논의 및 기타사항'}</h2>
          <div className="space-y-4">
            {(reportType === 'education' || reportType === 'cell_leader') && report.application_notes && (<div><p className="text-xs font-medium text-gray-500 mb-1">{reportType === 'cell_leader' ? '기도제목' : '적용점'}</p><div className="bg-gray-50 p-3 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report.application_notes) }} /></div></div>)}
            {hasProjSection('discussion') && parsedNotes.discussion_notes && (<div><p className="text-xs font-medium text-gray-500 mb-1">논의사항</p><div className="bg-gray-50 p-3 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedNotes.discussion_notes) }} /></div></div>)}
            {hasProjSection('other') && parsedNotes.other_notes && (<div><p className="text-xs font-medium text-gray-500 mb-1">기타사항</p><div className="bg-gray-50 p-3 rounded-xl"><div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedNotes.other_notes) }} /></div></div>)}
          </div>
        </div>
      )}

      {/* 결재 현황 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm lg:text-base">결재 진행 현황</h2>
        <div className="lg:hidden">
          <div className="relative"><div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" /><div className="space-y-4"><ApprovalStepVertical label="팀장 제출" status={report.status !== 'draft' ? 'completed' : 'pending'} name={report.users?.name} date={report.submitted_at} /><ApprovalStepVertical label="회장 협조" status={['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status) ? 'completed' : report.status === 'submitted' ? 'current' : 'pending'} name={report.coordinator?.name} date={report.coordinator_reviewed_at} /><ApprovalStepVertical label="부장 결재" status={['manager_approved', 'final_approved'].includes(report.status) ? 'completed' : report.status === 'coordinator_reviewed' ? 'current' : 'pending'} name={report.manager?.name} date={report.manager_approved_at} /><ApprovalStepVertical label="목사 확인" status={report.status === 'final_approved' ? 'completed' : report.status === 'manager_approved' ? 'current' : 'pending'} name={report.final_approver?.name} date={report.final_approved_at} /></div></div>
        </div>
        <div className="hidden lg:flex items-center justify-between">
          <ApprovalStep label="팀장 제출" status={report.status !== 'draft' ? 'completed' : 'pending'} name={report.users?.name} date={report.submitted_at} /><div className="flex-1 h-1 bg-gray-200 mx-3"><div className={`h-full bg-blue-500 transition-all ${['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status) ? 'w-full' : report.status === 'submitted' ? 'w-1/2' : 'w-0'}`} /></div><ApprovalStep label="회장 협조" status={['coordinator_reviewed', 'manager_approved', 'final_approved'].includes(report.status) ? 'completed' : report.status === 'submitted' ? 'current' : 'pending'} name={report.coordinator?.name} date={report.coordinator_reviewed_at} /><div className="flex-1 h-1 bg-gray-200 mx-3"><div className={`h-full bg-blue-500 transition-all ${['manager_approved', 'final_approved'].includes(report.status) ? 'w-full' : report.status === 'coordinator_reviewed' ? 'w-1/2' : 'w-0'}`} /></div><ApprovalStep label="부장 결재" status={['manager_approved', 'final_approved'].includes(report.status) ? 'completed' : report.status === 'coordinator_reviewed' ? 'current' : 'pending'} name={report.manager?.name} date={report.manager_approved_at} /><div className="flex-1 h-1 bg-gray-200 mx-3"><div className={`h-full bg-blue-500 transition-all ${report.status === 'final_approved' ? 'w-full' : report.status === 'manager_approved' ? 'w-1/2' : 'w-0'}`} /></div><ApprovalStep label="목사 확인" status={report.status === 'final_approved' ? 'completed' : report.status === 'manager_approved' ? 'current' : 'pending'} name={report.final_approver?.name} date={report.final_approved_at} />
        </div>
        {canApprove && (
          <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100"><button disabled={loading} onClick={() => { setApprovalAction('reject'); setShowApprovalModal(true) }} className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm lg:text-base">반려</button><button disabled={loading} onClick={() => { setApprovalAction('approve'); setShowApprovalModal(true) }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base">{canApprove === 'coordinator' ? '협조' : canApprove === 'manager' ? '결재' : '확인'}</button></div>
        )}
      </div>

      {/* 결재 이력 */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6"><h2 className="font-semibold text-gray-900 mb-3 text-sm lg:text-base">결재 이력</h2><div className="space-y-3">{history.map((item) => (<div key={item.id} className="flex gap-3"><div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" /><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium text-gray-900">{item.users?.name}</span><StatusBadge status={item.to_status} /></div>{item.comment && <p className="text-xs text-gray-500 mt-1">{item.comment}</p>}<p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('ko-KR')}</p></div></div>))}</div></div>
      )}

      {/* 결재 모달 */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full lg:max-w-md p-5 lg:p-6 animate-slide-up"><h3 className="text-lg font-semibold text-gray-900 mb-4">{approvalAction === 'approve' ? '결재 승인' : '반려'}</h3><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={approvalAction === 'approve' ? '코멘트 (선택)' : '반려 사유를 입력하세요'} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base" required={approvalAction === 'reject'} autoFocus /><div className="flex gap-3 mt-4"><button onClick={() => setShowApprovalModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">취소</button><button onClick={handleApproval} disabled={loading || (approvalAction === 'reject' && !comment)} className={`flex-1 py-3 rounded-xl font-medium text-white ${approvalAction === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>{loading ? '처리 중...' : approvalAction === 'approve' ? '승인' : '반려'}</button></div></div>
        </div>
      )}

      {/* 모달들 (Cancel, Delete, TypeChange, Print) 생략... */}
    </div>
  )
}

function generateWeeklyPrintHTML(dn: string, r: any, rd: Date, pr: string, ar: string, nr: string, pn: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${dn}</title><style>@page { size: A4; margin: 0; } body { font-family: sans-serif; padding: 15mm; } table { border-collapse: collapse; width: 100%; } .cell { border: 1px solid #000; padding: 6px; text-align: center; } .section-header { background: #eee; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #000; }</style></head><body><div style="text-align:center;"><h1>${dn} 주차 보고서</h1><p>${rd.getFullYear()}년 ${rd.getMonth()+1}월 ${rd.getDate()}일</p></div><table style="margin-top:20px;"><tr><td class="section-header" colspan="4">진행순서</td></tr>${pr}</table><table style="margin-top:20px;"><tr><td class="section-header" colspan="5">출결상황</td></tr>${ar}</table><table style="margin-top:20px;"><tr><td class="section-header" colspan="6">새신자 명단</td></tr>${nr}</table><div style="margin-top:20px;"><h3>논의사항</h3><pre>${pn.discussion_notes||''}</pre><h3>기타사항</h3><pre>${pn.other_notes||''}</pre></div><script>window.onload=function(){window.print();}</script></body></html>`
}

function generateMeetingPrintHTML(t: any, ti: string, r: any, rd: Date, pr: string, pn: any, cm: any, cr: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ti}</title></head><body><h1>${ti}</h1><p>${rd.toLocaleDateString()}</p><div>${pr}</div><script>window.onload=function(){window.print();}</script></body></html>`
}

function generateProjectPrintHTML(ti: string, r: any, rd: Date, pn: any, ci: any, si: any, bi: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ti}</title></head><body><h1>${ti}</h1><script>window.onload=function(){window.print();}</script></body></html>`
}

function ApprovalStep({ label, status, name, date }: any) {
  return (<div className="text-center shrink-0"><div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${status === 'completed' ? 'bg-blue-500 text-white' : status === 'current' ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' : 'bg-gray-100 text-gray-400'}`}>{status === 'completed' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-2 h-2 bg-current rounded-full" />}</div><p className="text-xs font-medium text-gray-900">{label}</p>{name && <p className="text-xs text-gray-500 mt-0.5">{name}</p>}{date && <p className="text-xs text-gray-400">{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>}</div>)
}

function ApprovalStepVertical({ label, status, name, date }: any) {
  return (<div className="flex items-start gap-4 relative"><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${status === 'completed' ? 'bg-blue-500 text-white' : status === 'current' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200' : 'bg-gray-100 text-gray-400'}`}>{status === 'completed' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}</div><div className="flex-1 min-w-0 pb-1"><p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600' : 'text-gray-900'}`}>{label}</p><div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">{name ? (<><span>{name}</span>{date && (<><span>·</span><span>{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span></>)}</>) : (<span className="text-gray-400">{status === 'pending' ? '대기중' : status === 'current' ? '진행중' : ''}</span>)}</div></div></div>)
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: '작성중', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: '제출됨', className: 'bg-yellow-100 text-yellow-700' },
    coordinator_reviewed: { label: '회장검토', className: 'bg-blue-100 text-blue-700' },
    manager_approved: { label: '부장결재', className: 'bg-purple-100 text-purple-700' },
    final_approved: { label: '승인완료', className: 'bg-green-100 text-green-700' },
    rejected: { label: '반려', className: 'bg-red-100 text-red-700' },
    revision_requested: { label: '수정요청', className: 'bg-orange-100 text-orange-700' },
  }
  const { label, className } = config[status] || config.draft
  return (<span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>)
}
