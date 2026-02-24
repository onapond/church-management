'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useVisitations, useUpdateVisitation, useDeleteVisitation, type VisitationWithDetails } from '@/queries/visitations'
import { useToast } from '@/hooks/useToast'
import { VISITATION_REASON_LABELS, VISITATION_STATUS_LABELS, MONTHS } from '@/lib/constants'
import { isAdminRole } from '@/lib/permissions'
import type { VisitationStatus } from '@/types/database'
import { escapeHtml, printHtmlInIframe } from '@/lib/utils'
import dynamic from 'next/dynamic'

const VisitationForm = dynamic(() => import('./VisitationForm'), { ssr: false })

type ViewMode = 'calendar' | 'list'

export default function VisitationClient() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { data: departments = [] } = useDepartments()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [departmentId, setDepartmentId] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<VisitationWithDetails | null>(null)
  const [defaultDate, setDefaultDate] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const { data: visitations = [], isLoading, isFetching } = useVisitations(year, month, departmentId || undefined)
  const updateVisitation = useUpdateVisitation()
  const deleteVisitation = useDeleteVisitation()

  // 날짜별 심방 그룹핑
  const visitationsByDate = useMemo(() => {
    const map: Record<string, VisitationWithDetails[]> = {}
    visitations.forEach(v => {
      if (!map[v.visit_date]) map[v.visit_date] = []
      map[v.visit_date].push(v)
    })
    return map
  }, [visitations])

  // 선택된 날짜의 심방 목록
  const selectedVisitations = useMemo(() => {
    if (!selectedDate) return visitations
    return visitationsByDate[selectedDate] || []
  }, [selectedDate, visitationsByDate, visitations])

  // 월 이동
  const handlePrevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDate('')
  }, [month])

  const handleNextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDate('')
  }, [month])

  // 일정 등록 모달 열기
  const handleAdd = useCallback((date?: string) => {
    setEditTarget(null)
    setDefaultDate(date || '')
    setShowForm(true)
  }, [])

  // 일정 수정 모달 열기
  const handleEdit = useCallback((v: VisitationWithDetails) => {
    setEditTarget(v)
    setShowForm(true)
  }, [])

  // 상태 변경
  const handleStatusChange = useCallback(async (id: string, status: VisitationStatus) => {
    try {
      await updateVisitation.mutateAsync({ id, status })
      addToast(`${VISITATION_STATUS_LABELS[status]}(으)로 변경했습니다.`, 'success')
    } catch {
      addToast('상태 변경 중 오류가 발생했습니다.', 'error')
    }
  }, [updateVisitation, addToast])

  // 삭제
  const handleDelete = useCallback(async (v: VisitationWithDetails) => {
    if (!confirm(`${v.member_name}님 심방 일정을 삭제할까요?`)) return
    try {
      await deleteVisitation.mutateAsync(v.id)
      addToast('심방 일정이 삭제되었습니다.', 'success')
    } catch {
      addToast('삭제 중 오류가 발생했습니다.', 'error')
    }
  }, [deleteVisitation, addToast])

  // 인쇄
  const handlePrint = useCallback((v: VisitationWithDetails) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>심방보고서 - ${escapeHtml(v.member_name)}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; font-size: 11pt; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; }
          .header { display: flex; align-items: start; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
          .logo-text { font-size: 9pt; color: #666; line-height: 1.2; }
          .title { font-size: 24pt; font-weight: bold; text-align: center; letter-spacing: 0.5em; flex: 1; margin: 0 20px; }
          .approval-table { border-collapse: collapse; font-size: 8.5pt; margin-top: -10px; }
          .approval-table td { border: 1px solid #000; padding: 4px 8px; text-align: center; }
          .bg-gray { background-color: #f3f4f6; font-weight: bold; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-table th, .info-table td { border: 1px solid #999; padding: 10px; text-align: left; }
          .info-table th { background-color: #f9fafb; width: 100px; text-align: center; font-weight: bold; }
          .section-title { background-color: #eff6ff; padding: 6px 12px; font-weight: bold; border: 1px solid #999; border-bottom: none; margin-top: 20px; }
          .content-box { border: 1px solid #999; padding: 15px; min-height: 250px; white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word; }
          .prayer-box { border: 1px solid #999; padding: 15px; min-height: 120px; white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">
              청파중앙교회<br/>Cheongpa Joongang Church
            </div>
            <div class="title">심방보고서</div>
            <table class="approval-table">
              <tr>
                <td rowspan="2" class="bg-gray" style="width:25px;">결<br/>재</td>
                <td style="width:55px;">작성자</td>
                <td style="width:55px;">부장</td>
              </tr>
              <tr>
                <td style="height:45px;"></td>
                <td style="height:45px;">강현숙</td>
              </tr>
              <tr>
                <td class="bg-gray">협조</td>
                <td>신요한</td>
                <td>전홍균</td>
              </tr>
            </table>
          </div>

          <table class="info-table">
            <tr>
              <th>대상자</th>
              <td style="width:35%;">${escapeHtml(v.member_name)}</td>
              <th>소속부서</th>
              <td>${escapeHtml(v.departments?.name || '-')}</td>
            </tr>
            <tr>
              <th>일시</th>
              <td>${escapeHtml(v.visit_date.replace(/-/g, '.'))} ${escapeHtml(v.visit_time?.slice(0, 5) || '')}</td>
              <th>심방구분</th>
              <td>${escapeHtml(VISITATION_REASON_LABELS[v.reason])}</td>
            </tr>
            <tr>
              <th>심방자</th>
              <td colspan="3">${escapeHtml(v.visitor)}</td>
            </tr>
          </table>

          <div class="section-title">심방 내용</div>
          <div class="content-box">${escapeHtml(v.report_content || v.notes || '-')}</div>

          <div class="section-title">기도 제목</div>
          <div class="prayer-box">${escapeHtml(v.prayer_topics || '-')}</div>

          <div class="footer">
            청파중앙교회 ${escapeHtml(v.departments?.name || '')}
          </div>
        </div>
      </body>
      </html>
    `
    printHtmlInIframe(html)
  }, [])

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">심방 일정</h1>
        <button
          onClick={() => handleAdd()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          + 일정 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* 월 네비게이션 */}
        <div className="flex items-center gap-2 bg-white rounded-xl border px-2 py-1">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900 min-w-[100px] text-center">
            {year}년 {MONTHS[month - 1]}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 부서 필터 */}
        <select
          value={departmentId}
          onChange={e => setDepartmentId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">전체 부서</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* 뷰 모드 */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            달력
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            목록
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 달력 뷰 */}
      {!isLoading && viewMode === 'calendar' && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
          <CalendarView
            year={year}
            month={month}
            visitationsByDate={visitationsByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddClick={handleAdd}
          />
        </div>
      )}

      {/* 목록 뷰 또는 선택된 날짜의 목록 */}
      {!isLoading && (viewMode === 'list' || selectedDate) && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
          {selectedDate && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                {selectedDate.replace(/-/g, '.')} 일정 ({selectedVisitations.length}건)
              </h3>
              <button
                onClick={() => setSelectedDate('')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                전체 보기
              </button>
            </div>
          )}
          <VisitationList
            visitations={selectedVisitations}
            currentUserId={user?.id || ''}
            isAdmin={isAdminRole(user?.role || '')}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onPrint={handlePrint}
          />
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showForm && (
        <VisitationForm
          visitation={editTarget}
          defaultDate={defaultDate}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}

// ─── 달력 뷰 ─────────────────────────────────────
interface CalendarViewProps {
  year: number
  month: number
  visitationsByDate: Record<string, VisitationWithDetails[]>
  selectedDate: string
  onSelectDate: (date: string) => void
  onAddClick: (date: string) => void
}

const CalendarView = memo(function CalendarView({
  year, month, visitationsByDate, selectedDate, onSelectDate, onAddClick,
}: CalendarViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10)

  // 달력 날짜 계산
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=일요일
  const lastDate = new Date(year, month, 0).getDate()
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(firstDay).fill(null)

  for (let d = 1; d <= lastDate; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map((name, i) => (
          <div
            key={name}
            className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* 달력 본체 */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map((day, di) => {
            if (day === null) return <div key={di} className="min-h-[80px] lg:min-h-[100px] bg-gray-50" />

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayVisitations = visitationsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <div
                key={di}
                onClick={() => onSelectDate(dateStr === selectedDate ? '' : dateStr)}
                className={`min-h-[80px] lg:min-h-[100px] p-1 cursor-pointer transition-colors border-r last:border-r-0 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <span className={`text-sm font-medium ${
                    isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' :
                    di === 0 ? 'text-red-500' :
                    di === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  {dayVisitations.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); onAddClick(dateStr) }}
                      className="text-gray-400 hover:text-blue-600 text-xs"
                    >
                      +
                    </button>
                  )}
                </div>
                {/* 일정 표시 */}
                <div className="mt-1 space-y-0.5">
                  {dayVisitations.slice(0, 3).map(v => (
                    <div
                      key={v.id}
                      className={`text-xs px-1.5 py-0.5 rounded truncate ${
                        v.status === 'completed' ? 'bg-green-100 text-green-700' :
                        v.status === 'cancelled' ? 'bg-gray-100 text-gray-400 line-through' :
                        'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {v.member_name}
                    </div>
                  ))}
                  {dayVisitations.length > 3 && (
                    <p className="text-xs text-gray-400 px-1">+{dayVisitations.length - 3}건</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
})

// ─── 목록 뷰 ─────────────────────────────────────
interface VisitationListProps {
  visitations: VisitationWithDetails[]
  currentUserId: string
  isAdmin: boolean
  onEdit: (v: VisitationWithDetails) => void
  onStatusChange: (id: string, status: VisitationStatus) => void
  onDelete: (v: VisitationWithDetails) => void
  onPrint: (v: VisitationWithDetails) => void
}

const VisitationList = memo(function VisitationList({
  visitations, currentUserId, isAdmin, onEdit, onStatusChange, onDelete, onPrint,
}: VisitationListProps) {
  if (visitations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">
        심방 일정이 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border divide-y">
      {visitations.map(v => {
        const isOwner = v.created_by === currentUserId
        const canManage = isOwner || isAdmin

        return (
          <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{v.member_name}</span>
                  <StatusBadge status={v.status} />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.reason === 'hospital' ? 'bg-red-100 text-red-600' :
                    v.reason === 'newcomer' ? 'bg-purple-100 text-purple-600' :
                    v.reason === 'encouragement' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {VISITATION_REASON_LABELS[v.reason]}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500 space-x-3">
                  <span>{v.visit_date.replace(/-/g, '.')}</span>
                  {v.visit_time && <span>{v.visit_time.slice(0, 5)}</span>}
                  <span>심방자: {v.visitor}</span>
                  {v.departments?.name && <span>{v.departments.name}</span>}
                </div>
                {v.notes && (
                  <p className="mt-1 text-sm text-gray-600">{v.notes}</p>
                )}
              </div>

              {/* 액션 버튼 */}
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  {v.status === 'scheduled' && (
                    <button
                      onClick={() => onStatusChange(v.id, 'completed')}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      완료
                    </button>
                  )}
                  {v.status === 'scheduled' && (
                    <button
                      onClick={() => onStatusChange(v.id, 'cancelled')}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                    >
                      취소
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(v)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onPrint(v)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                  >
                    보고서
                  </button>
                  <button
                    onClick={() => onDelete(v)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-500 rounded-lg hover:bg-red-200"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

// ─── 상태 뱃지 ────────────────────────────────────
function StatusBadge({ status }: { status: VisitationStatus }) {
  const styles = {
    scheduled: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {VISITATION_STATUS_LABELS[status]}
    </span>
  )
}

// ─── 아이콘 ──────────────────────────────────────
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
