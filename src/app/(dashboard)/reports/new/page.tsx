'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { toLocalDateString, getWeekNumber } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { isAdmin as checkAdmin } from '@/lib/permissions'
import ReportForm from '@/components/reports/ReportForm'

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project' | 'visitation'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
  cell_leader: { label: '셀장 보고서', icon: '🏠' },
  project: { label: '프로젝트 계획', icon: '📑' },
  visitation: { label: '심방 보고서', icon: '🙏' },
}

export default function NewReportPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { data: allDepartments = [], isLoading: deptsLoading } = useDepartments()

  // 작성 가능 부서 (관리자: 전체, 팀장: is_team_leader=true인 부서만)
  const { canWrite, departments, isDeptHead } = useMemo(() => {
    if (!user) return { canWrite: false, departments: [], isDeptHead: false }

    const adminRoles = ['super_admin', 'president', 'accountant']
    const isAdmin = checkAdmin(user.role) || adminRoles.includes(user.role)
    const isDeptHead = user.user_departments?.some((ud: { is_team_leader: boolean }) => ud.is_team_leader)

    if (!isAdmin && !isDeptHead && user.role !== 'team_leader') {
      return { canWrite: false, departments: [], isDeptHead: false }
    }

    if (isAdmin) {
      return { canWrite: true, departments: allDepartments.map(d => ({ id: d.id, name: d.name, code: d.code })), isDeptHead: true }
    }

    // 부서장: is_team_leader=true인 부서만
    if (isDeptHead) {
      const depts = user.user_departments
        ?.filter((ud: { is_team_leader: boolean }) => ud.is_team_leader)
        .map((ud: { departments: { id: string; name: string; code: string } }) => ud.departments) || []
      return { canWrite: true, departments: depts, isDeptHead: true }
    }

    // 일반 셀장 (role=team_leader, but isDeptHead=false): 소속 부서만
    const cellDepts = user.user_departments?.map((ud: any) => ud.departments) || []
    return { canWrite: true, departments: cellDepts, isDeptHead: false }
  }, [user, allDepartments])

  const reportType = (searchParams.get('type') as ReportType) || (isDeptHead ? 'weekly' : 'cell_leader')

  // 이번 주 일요일
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = toLocalDateString(sunday)

  // 주차 계산 (일요일 기준)
  const weekNumber = getWeekNumber(sundayStr)

  // 로딩 상태
  if (!user || deptsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!canWrite) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">보고서 작성 권한이 없습니다.</p>
      </div>
    )
  }

  const config = REPORT_TYPE_CONFIG[reportType]

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">{config.label} 작성</h1>
        </div>
        {reportType === 'weekly' && (
          <p className="text-sm text-gray-500 mt-0.5">
            {now.getFullYear()}년 {weekNumber}주차 보고서
          </p>
        )}
      </div>

      <ReportForm
        reportType={reportType}
        departments={departments}
        defaultDate={sundayStr}
        weekNumber={weekNumber}
        authorId={user.id}
      />
    </div>
  )
}
