import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface UserData {
  role: string
  department_id: string | null
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user!.id)
    .single()

  const userInfo = userData as UserData | null
  const isAdmin = userInfo?.role === 'super_admin' || userInfo?.role === 'president' || userInfo?.role === 'manager' || userInfo?.role === 'pastor'
  const canWriteReport = isAdmin || userInfo?.role === 'leader'

  // 보고서 목록
  let reports: Array<{
    id: string
    report_date: string
    status: string
    worship_attendance: number
    total_registered: number
    departments: { name: string } | null
    users: { name: string } | null
  }> = []

  if (isAdmin) {
    // 관리자는 모든 보고서 조회
    const { data } = await supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .order('report_date', { ascending: false })
      .limit(50)
    reports = (data || []) as typeof reports
  } else if (userInfo?.department_id) {
    // 일반 사용자는 자기 부서 보고서만
    const { data } = await supabase
      .from('weekly_reports')
      .select('*, departments(name), users!weekly_reports_author_id_fkey(name)')
      .eq('department_id', userInfo.department_id)
      .order('report_date', { ascending: false })
      .limit(50)
    reports = (data || []) as typeof reports
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">주차 보고서</h1>
          <p className="text-sm text-gray-500 mt-0.5">부서별 주간 보고서 관리</p>
        </div>
        {canWriteReport && (
          <Link
            href="/reports/new"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>작성</span>
          </Link>
        )}
      </div>

      {/* 보고서 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {reports.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* 아이콘 */}
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {report.departments?.name}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <span>
                      {new Date(report.report_date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span>·</span>
                    <span className="truncate">{report.users?.name}</span>
                  </div>
                </div>

                {/* 출석 정보 */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {report.worship_attendance}
                    <span className="text-sm font-normal text-gray-400">/{report.total_registered}</span>
                  </p>
                  <p className="text-xs text-gray-400">출석</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 px-4 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm">아직 작성된 보고서가 없습니다.</p>
            {canWriteReport && (
              <Link href="/reports/new" className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
                첫 보고서 작성하기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
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

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
