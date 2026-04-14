'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useCellLeaderReportsByDate } from '@/queries/reports'
import { toLocalDateString, getWeekNumber, formatDate } from '@/lib/utils'
import { APPROVAL_STATUS_LABELS } from '@/lib/constants'
import { canAccessAllDepartments } from '@/lib/permissions'
import type { UserDepartment } from '@/types/shared'
import type { ReportSaveRequest } from './utils/reportSavePayload'
import type { CellAttendance } from './types'
import { genKey } from './types'

function getLastSunday(): string {
  const now = new Date()
  const d = new Date(now)
  d.setDate(now.getDate() - now.getDay())
  return toLocalDateString(d)
}

function safeParseNotes(notes: string | null): Record<string, string> {
  try { return JSON.parse(notes || '{}') } catch { return {} }
}

/** 셀 이름만 추출 (cells.name 우선, 없으면 meeting_title에서 접미사 제거) */
function extractCellName(report: { meeting_title: string | null; cells: { name: string } | null }): string {
  if (report.cells?.name) return report.cells.name
  if (!report.meeting_title) return '셀'
  return report.meeting_title.replace(/\s*(모임\s*보고서|보고서|모임)\s*$/, '').trim() || report.meeting_title
}

export default function CellReportAggregatorClient() {
  const { user } = useAuth()
  const router = useRouter()
  const { data: allDepartments = [] } = useDepartments()

  const [selectedDate, setSelectedDate] = useState(getLastSunday)
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 접근 가능한 팀장 부서 목록
  const leaderDepts = useMemo(() => {
    if (!user) return []
    if (canAccessAllDepartments(user.role)) return allDepartments
    return (user.user_departments || [])
      .filter((ud: UserDepartment) => ud.is_team_leader)
      .map((ud: UserDepartment) => ud.departments)
  }, [user, allDepartments])

  // 선택된 부서 ID (기본값: 첫 번째 부서)
  const activeDeptId = selectedDeptId || leaderDepts[0]?.id || ''

  const deptIds = useMemo(
    () => (activeDeptId ? [activeDeptId] : leaderDepts.map(d => d.id)),
    [activeDeptId, leaderDepts]
  )

  const { data: cellReports = [], isLoading } = useCellLeaderReportsByDate(deptIds, selectedDate)

  // 날짜가 바뀌면 선택 초기화
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedIds(new Set())
    setError(null)
  }

  const handleDeptChange = (deptId: string) => {
    setSelectedDeptId(deptId)
    setSelectedIds(new Set())
    setError(null)
  }

  const toggleReport = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === cellReports.length ? new Set() : new Set(cellReports.map(r => r.id))
    )
  }

  const selectedReports = useMemo(
    () => cellReports.filter(r => selectedIds.has(r.id)),
    [cellReports, selectedIds]
  )

  const totals = useMemo(() => ({
    worship: selectedReports.reduce((s, r) => s + (r.worship_attendance || 0), 0),
    registered: selectedReports.reduce((s, r) => s + (r.total_registered || 0), 0),
    meeting: selectedReports.reduce((s, r) => s + (r.meeting_attendance || 0), 0),
  }), [selectedReports])

  const handleCreate = async () => {
    if (selectedReports.length === 0 || !activeDeptId) return
    setIsCreating(true)
    setError(null)

    try {
      const cellAttendance: CellAttendance[] = selectedReports.map(r => ({
        _key: genKey(),
        cell_name: extractCellName(r),
        registered: r.total_registered || 0,
        worship: r.worship_attendance || 0,
        meeting: r.meeting_attendance || 0,
        note: '',
      }))

      const firstNotes = safeParseNotes(selectedReports[0]?.notes)

      const compiledDiscussion = selectedReports
        .map(r => {
          const n = safeParseNotes(r.notes)
          if (!n.discussion_notes) return null
          return `[${extractCellName(r)}]\n${n.discussion_notes}`
        })
        .filter(Boolean)
        .join('\n\n')

      const compiledOther = selectedReports
        .map(r => {
          const n = safeParseNotes(r.notes)
          if (!n.other_notes) return null
          return `[${extractCellName(r)}]\n${n.other_notes}`
        })
        .filter(Boolean)
        .join('\n\n')

      const payload: ReportSaveRequest = {
        reportType: 'weekly',
        weekNumber: getWeekNumber(selectedDate),
        isDraft: true,
        form: {
          department_id: activeDeptId,
          report_date: selectedDate,
          sermon_title: firstNotes.sermon_title || '',
          sermon_scripture: firstNotes.sermon_scripture || '',
          discussion_notes: compiledDiscussion,
          other_notes: compiledOther,
          meeting_title: '',
          meeting_location: '',
          attendees: '',
          main_content: '',
          application_notes: '',
          organization: '',
        },
        programs: [],
        newcomers: [],
        contentItems: [],
        scheduleItems: [],
        budgetItems: [],
        cellAttendance,
        memberAttendance: [],
        selectedCellId: '',
        enabledSections: [],
        attendanceSummary: {
          total: totals.registered,
          worship: totals.worship,
          meeting: totals.meeting,
        },
      }

      const res = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.ok) {
        if (json.duplicate) {
          // 이미 해당 날짜에 주차 보고서가 있으면 편집 페이지로 이동
          setError('이미 해당 주차 보고서가 존재합니다. 기존 보고서로 이동합니다.')
          setTimeout(() => router.push(`/reports/${json.id}/edit`), 1500)
          return
        }
        setError(json.message || '저장에 실패했습니다.')
        return
      }

      router.push(`/reports/${json.reportId}/edit`)
    } catch {
      setError('오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setIsCreating(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (leaderDepts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">접근 권한이 없습니다.</p>
      </div>
    )
  }

  const weekNumber = getWeekNumber(selectedDate)
  const yearStr = selectedDate.split('-')[0]

  return (
    <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">셀장 보고서 취합</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          셀장 보고서를 선택해 주차 보고서 초안을 자동으로 생성합니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        {/* 부서 선택 (복수 부서일 때만 표시) */}
        {leaderDepts.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">부서</label>
            <div className="flex gap-2 flex-wrap">
              {leaderDepts.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => handleDeptChange(dept.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeDeptId === dept.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 날짜 선택 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            기준 날짜 <span className="font-normal text-gray-400">(해당 날짜 포함 1주일 내 보고서)</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => handleDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-500">
            {yearStr}년 {weekNumber}주차
          </span>
        </div>
      </div>

      {/* 셀장 보고서 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            셀장 보고서
            {!isLoading && (
              <span className="ml-1.5 text-gray-400 font-normal">({cellReports.length}건)</span>
            )}
          </h2>
          {cellReports.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedIds.size === cellReports.length ? '전체 해제' : '전체 선택'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : cellReports.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-sm">해당 기간에 제출된 셀장 보고서가 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">날짜를 변경하거나 셀장이 보고서를 제출했는지 확인해 주세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cellReports.map(report => {
              const isChecked = selectedIds.has(report.id)
              const notes = safeParseNotes(report.notes)
              const statusLabel = APPROVAL_STATUS_LABELS[report.status] || report.status
              const cellName = extractCellName(report)

              return (
                <label
                  key={report.id}
                  className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleReport(report.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{cellName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        report.status === 'final_approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>예배 {report.worship_attendance ?? 0}명</span>
                      <span>/</span>
                      <span>등록 {report.total_registered ?? 0}명</span>
                      {report.users?.name && (
                        <>
                          <span>·</span>
                          <span>{report.users.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{formatDate(report.report_date, 'month-day')}</span>
                    </div>
                    {notes.discussion_notes && (
                      <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                        나눔: {notes.discussion_notes}
                      </p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* 취합 미리보기 */}
      {selectedReports.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-blue-800">취합 미리보기</h2>

          {/* 출석 합계 */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{totals.worship}</p>
              <p className="text-xs text-blue-500 mt-0.5">예배 출석</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{totals.registered}</p>
              <p className="text-xs text-blue-500 mt-0.5">등록 인원</p>
            </div>
            {totals.meeting > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">{totals.meeting}</p>
                <p className="text-xs text-blue-500 mt-0.5">모임 출석</p>
              </div>
            )}
          </div>

          {/* 셀별 요약 */}
          <div className="space-y-2">
            {selectedReports.map(r => {
              const n = safeParseNotes(r.notes)
              const cellName = extractCellName(r)
              return (
                <div key={r.id} className="bg-white rounded-xl p-3 text-xs">
                  <p className="font-semibold text-gray-700 mb-1">
                    {cellName} · {r.worship_attendance ?? 0}/{r.total_registered ?? 0}명
                  </p>
                  {n.discussion_notes && (
                    <p className="text-gray-500 line-clamp-2">나눔: {n.discussion_notes}</p>
                  )}
                  {n.other_notes && (
                    <p className="text-gray-400 line-clamp-1 mt-0.5">참고: {n.other_notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 취합 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          돌아가기
        </button>
        <button
          onClick={handleCreate}
          disabled={selectedReports.length === 0 || isCreating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>생성 중...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>
                {selectedReports.length > 0
                  ? `${selectedReports.length}개 취합하여 주차보고서 작성`
                  : '보고서를 선택해 주세요'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
