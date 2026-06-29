'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { toLocalDateString, getWeekNumber } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { isAdmin as checkAdmin } from '@/lib/permissions'
import ReportForm from '@/components/reports/ReportForm'
import type { UserDepartment } from '@/types/shared'

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project' | 'visitation'

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string }> = {
  weekly: { label: '주차 보고서', icon: '📋' },
  meeting: { label: '모임 보고서', icon: '👥' },
  education: { label: '교육 보고서', icon: '📚' },
  cell_leader: { label: '셀장 보고서', icon: '🏠' },
  project: { label: '프로젝트 계획', icon: '📝' },
  visitation: { label: '심방 보고서', icon: '🙏' },
}

export default function NewReportPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { data: allDepartments = [], isLoading: deptsLoading } = useDepartments()

  const { canWrite, departments, isDeptHead } = useMemo(() => {
    if (!user) return { canWrite: false, departments: [], isDeptHead: false }

    const adminRoles = ['super_admin', 'president', 'accountant']
    const isAdmin = checkAdmin(user.role) || adminRoles.includes(user.role)
    const isDeptHead = user.user_departments?.some((ud: UserDepartment) => ud.is_team_leader)

    if (!isAdmin && !isDeptHead && user.role !== 'team_leader') {
      return { canWrite: false, departments: [], isDeptHead: false }
    }

    if (isAdmin) {
      return {
        canWrite: true,
        departments: allDepartments.map((department) => ({
          id: department.id,
          name: department.name,
          code: department.code,
        })),
        isDeptHead: true,
      }
    }

    if (isDeptHead) {
      const teamLeaderDepartments = user.user_departments
        ?.filter((ud: UserDepartment) => ud.is_team_leader)
        .map((ud: UserDepartment) => ud.departments) || []
      return { canWrite: true, departments: teamLeaderDepartments, isDeptHead: true }
    }

    const cellDepartments = user.user_departments?.map((ud: UserDepartment) => ud.departments) || []
    return { canWrite: true, departments: cellDepartments, isDeptHead: false }
  }, [allDepartments, user])

  const reportType = (searchParams.get('type') as ReportType) || (isDeptHead ? 'weekly' : 'cell_leader')
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = toLocalDateString(sunday)
  const weekNumber = getWeekNumber(sundayStr)

  if (!user || deptsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!canWrite) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">보고서 작성 권한이 없습니다.</p>
      </div>
    )
  }

  const config = REPORT_TYPE_CONFIG[reportType]

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h1 className="text-lg font-bold text-gray-900 lg:text-xl">{config.label} 작성</h1>
        </div>
        {reportType === 'weekly' ? (
          <p className="mt-0.5 text-sm text-gray-500">
            {now.getFullYear()}년 {weekNumber}주차 보고서
          </p>
        ) : null}
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
