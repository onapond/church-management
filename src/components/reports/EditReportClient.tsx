'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useReportDetail, useReportPrograms, useReportNewcomers, useProjectContentItems, useProjectScheduleItems, useProjectBudgetItems } from '@/queries/reports'
import { isAdmin as checkAdmin, canEditReport } from '@/lib/permissions'
import ReportForm from '@/components/reports/ReportForm'

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
  cell_leader: { label: '셀장 보고서', icon: '🏠' },
  project: { label: '프로젝트 계획', icon: '📑' },
}

interface EditReportClientProps {
  reportId: string
}

export default function EditReportClient({ reportId }: EditReportClientProps) {
  const router = useRouter()
  const { user } = useAuth()

  const { data: report, isLoading: reportLoading } = useReportDetail(reportId)
  const { data: programs = [], isLoading: programsLoading } = useReportPrograms(reportId)
  const { data: newcomers = [] } = useReportNewcomers(reportId)
  const { data: allDepartments = [], isLoading: deptsLoading } = useDepartments()
  const { data: projectContentItems = [] } = useProjectContentItems(reportId)
  const { data: projectScheduleItems = [] } = useProjectScheduleItems(reportId)
  const { data: projectBudgetItems = [] } = useProjectBudgetItems(reportId)

  // 작성 가능 부서
  const departments = useMemo(() => {
    if (!user) return []
    if (checkAdmin(user.role)) {
      return allDepartments.map(d => ({ id: d.id, name: d.name, code: d.code }))
    }
    return user.user_departments
      ?.filter((ud: { is_team_leader: boolean }) => ud.is_team_leader)
      .map((ud: { departments: { id: string; name: string; code: string } }) => ud.departments) || []
  }, [user, allDepartments])

  // 로딩 상태
  if (reportLoading || programsLoading || deptsLoading || !user) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="h-[600px] bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  // 보고서 없음
  if (!report) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-gray-500">보고서를 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/reports')} className="text-blue-600 text-sm hover:underline mt-2">
          보고서 목록으로 돌아가기
        </button>
      </div>
    )
  }

  // 권한 체크: 작성자(draft/rejected 상태) 또는 관리자만 수정 가능
  if (!canEditReport(user, { author_id: report.author_id, status: report.status })) {
    router.push(`/reports/${reportId}`)
    return null
  }

  const reportType = (report as any).report_type as ReportType || 'weekly'
  const config = REPORT_TYPE_CONFIG[reportType]

  // 주차 계산
  const reportDate = new Date(report.report_date)
  const startOfYear = new Date(reportDate.getFullYear(), 0, 1)
  const weekNumber = report.week_number || Math.ceil(
    ((reportDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )

  const existingReport = {
    id: report.id,
    department_id: report.department_id,
    author_id: report.author_id,
    report_date: report.report_date,
    week_number: report.week_number,
    notes: report.notes,
    meeting_title: (report as any).meeting_title,
    meeting_location: (report as any).meeting_location,
    attendees: (report as any).attendees,
    main_content: (report as any).main_content,
    application_notes: (report as any).application_notes,
    cell_id: report.cell_id,
    programs: programs || [],
    newcomers: newcomers || [],
    projectContentItems: projectContentItems || [],
    projectScheduleItems: projectScheduleItems || [],
    projectBudgetItems: projectBudgetItems || [],
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">{config.label} 수정</h1>
        </div>
        {reportType === 'weekly' && (
          <p className="text-sm text-gray-500 mt-0.5">
            {reportDate.getFullYear()}년 {weekNumber}주차 보고서
          </p>
        )}
      </div>

      <ReportForm
        reportType={reportType}
        departments={departments}
        defaultDate={report.report_date}
        weekNumber={weekNumber}
        authorId={user.id}
        editMode={true}
        existingReport={existingReport}
      />
    </div>
  )
}
