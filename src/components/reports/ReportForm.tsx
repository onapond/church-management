'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToastContext } from '@/providers/ToastProvider'
import dynamic from 'next/dynamic'
import type { Program, Newcomer, CellAttendance, ProjectContentItem, ProjectScheduleItem, ProjectBudgetItem } from './types'
import ProgramTable from './ProgramTable'
import AttendanceInput from './AttendanceInput'
import NewcomerSection from './NewcomerSection'
import PhotoUploadSection from './PhotoUploadSection'
import CellMemberAttendance from './CellMemberAttendance'
import { useQueryClient } from '@tanstack/react-query'
import { useReportSubmit } from './hooks/useReportSubmit'
import { useReportForm } from './hooks/useReportForm'
import type { ReportFormFields } from './utils/reportDataBuilder'
import type { MemberAttendanceItem } from './CellMemberAttendance'

// 클라이언트 전용 컴포넌트로 동적 import
const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="h-10 bg-gray-50 border-b border-gray-200" />
      <div className="min-h-[120px] p-3 text-gray-400 text-sm">로딩 중...</div>
    </div>
  ),
})

type ReportType = 'weekly' | 'meeting' | 'education' | 'cell_leader' | 'project' | 'visitation'

interface Department {
  id: string
  name: string
  code: string
}

interface ExistingReport {
  id: string
  department_id: string
  author_id: string
  status: string
  report_date: string
  week_number: number | null
  notes: string | null
  meeting_title: string | null
  meeting_location: string | null
  attendees: string | null
  main_content: string | null
  application_notes: string | null
  cell_id?: string | null
  // 프로젝트 보고서 전용
  projectContentItems?: Array<{
    id: string
    col1: string
    col2: string
    col3: string
    col4: string
    order_index: number
  }>
  projectScheduleItems?: Array<{
    id: string
    schedule: string
    detail: string
    note: string
    order_index: number
  }>
  projectBudgetItems?: Array<{
    id: string
    category: string
    subcategory: string
    item_name: string
    basis: string
    unit_price?: number
    quantity?: number
    amount: number
    note: string
    order_index: number
  }>
  programs: Array<{
    id: string
    start_time: string
    content: string
    person_in_charge: string | null
    order_index: number
  }>
  newcomers: Array<{
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    introducer: string | null
    address: string | null
    affiliation: string | null
  }>
}

interface ReportFormProps {
  reportType: ReportType
  departments: Department[]
  defaultDate: string
  weekNumber: number
  authorId: string
  editMode?: boolean
  existingReport?: ExistingReport
}

interface ReportDraftBackup {
  version: 1
  updatedAt: number
  draftReportId: string | null
  data: {
    form: ReportFormFields
    programs: Program[]
    cellAttendance: CellAttendance[]
    newcomers: Newcomer[]
    contentItems: ProjectContentItem[]
    scheduleItems: ProjectScheduleItem[]
    budgetItems: ProjectBudgetItem[]
    enabledSections: ProjectSectionId[]
    selectedCellId: string
    memberAttendance: MemberAttendanceItem[]
  }
}

// 섹션 정의
const SECTIONS = [
  { id: 'basic', label: '기본', icon: '📋' },
  { id: 'program', label: '순서', icon: '⏱️' },
  { id: 'cell-attendance', label: '출석', icon: '✅' },
  { id: 'attendance', label: '출결', icon: '✅' },
  { id: 'newcomer', label: '새신자', icon: '👋' },
  // 프로젝트 전용 섹션
  { id: 'overview', label: '개요', icon: '📝' },
  { id: 'plan', label: '계획', icon: '📊' },
  { id: 'budget', label: '예산', icon: '💰' },
  { id: 'photos', label: '사진', icon: '📷' },
  { id: 'notes', label: '논의', icon: '💬' },
]

// 프로젝트 기획서: 선택 가능한 항목
const PROJECT_OPTIONAL_SECTIONS = [
  { id: 'overview', label: '개요' },
  { id: 'purpose', label: '목적' },
  { id: 'organization', label: '조직도' },
  { id: 'content', label: '세부계획 (내용)' },
  { id: 'schedule', label: '세부계획 (일정표)' },
  { id: 'budget', label: '예산' },
  { id: 'discussion', label: '논의사항' },
  { id: 'other', label: '기타사항' },
] as const

type ProjectSectionId = typeof PROJECT_OPTIONAL_SECTIONS[number]['id']

// 기본값: 모두 활성
const ALL_PROJECT_SECTIONS: ProjectSectionId[] = PROJECT_OPTIONAL_SECTIONS.map(s => s.id)

// 프로젝트 섹션 표시 순서 (컴포넌트 외부에서 상수로 정의)
export default function ReportForm({
  reportType,
  departments,
  defaultDate,
  weekNumber,
  authorId,
  editMode = false,
  existingReport,
}: ReportFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const toast = useToastContext()
  const queryClient = useQueryClient()

  const {
    existingReportId, setExistingReportId,
    existingReportStatus, setExistingReportStatus,
    form, setForm,
    programs, setPrograms, addProgram, removeProgram, updateProgram,
    cellAttendance, setCellAttendance, addCellAttendance, removeCellAttendance, updateCellAttendance,
    newcomers, setNewcomers, addNewcomer, removeNewcomer, updateNewcomer,
    contentItems, setContentItems, addContentItem, removeContentItem, updateContentItem,
    scheduleItems, setScheduleItems, addScheduleItem, removeScheduleItem, updateScheduleItem,
    budgetItems, setBudgetItems, addBudgetItem, removeBudgetItem, updateBudgetItem,
    photoFiles, photoPreviews, handlePhotoAdd, removePhoto,
    enabledSections, setEnabledSections, isSectionEnabled, toggleSection, toggleAllSections, projNum,
    selectedCellId, setSelectedCellId, memberAttendance, setMemberAttendance, handleToggleMemberAttendance, handleBulkAttendance, handleCellChange, handleDepartmentChange, cells,
    attendanceSummary,
  } = useReportForm({ reportType, departments, defaultDate, editMode, existingReport, supabase, toast })

  // 섹션 네비게이션 상태
  const [activeSection, setActiveSection] = useState('basic')
  const [draftReportId, setDraftReportId] = useState<string | null>(existingReport?.id || null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'local' | 'saving' | 'saved' | 'error'>('idle')
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const hasRestoredBackupRef = useRef(false)
  const lastAutosavedSnapshotRef = useRef('')

  const backupKey = useMemo(() => {
    const scope = existingReport?.id || `${authorId}:${reportType}:${defaultDate}`
    return `report-draft:${scope}`
  }, [authorId, defaultDate, existingReport?.id, reportType])

  const serializableSnapshot = useMemo<ReportDraftBackup>(() => ({
    version: 1,
    updatedAt: 0,
    draftReportId,
    data: {
      form,
      programs,
      cellAttendance,
      newcomers,
      contentItems,
      scheduleItems,
      budgetItems,
      enabledSections,
      selectedCellId,
      memberAttendance,
    },
  }), [
    budgetItems,
    cellAttendance,
    contentItems,
    draftReportId,
    enabledSections,
    form,
    memberAttendance,
    newcomers,
    programs,
    scheduleItems,
    selectedCellId,
  ])

  const snapshotString = useMemo(() => JSON.stringify(serializableSnapshot.data), [serializableSnapshot.data])

  // Intersection Observer로 현재 섹션 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const sectionId = entry.target.getAttribute('data-section')
            if (sectionId) {
              setActiveSection(sectionId)
            }
          }
        })
      },
      {
        rootMargin: '-80px 0px -50% 0px',
        threshold: [0.3]
      }
    )

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  // 섹션 스크롤
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId]
    if (element) {
      const yOffset = -80 // 헤더 높이 고려
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }, [])

  // 제출 (useReportSubmit 훅에 로직 위임)
  const { submit, saveDraftSnapshot, isLoading: loading, error } = useReportSubmit({
    supabase,
    authorId,
    reportType,
    departments,
    weekNumber,
    editMode,
    existingReport,
    form,
    programs,
    newcomers,
    contentItems,
    scheduleItems,
    budgetItems,
    cellAttendance,
    memberAttendance,
    selectedCellId,
    photoFiles,
    enabledSections,
    attendanceSummary,
    toast,
    queryClient,
    router,
    draftReportId,
    onDuplicateFound: (id, status) => {
      setExistingReportId(id)
      setExistingReportStatus(status)
    },
  })

  useEffect(() => {
    if (hasRestoredBackupRef.current) return
    hasRestoredBackupRef.current = true

    const raw = window.localStorage.getItem(backupKey)
    if (!raw) return

    try {
      const backup = JSON.parse(raw) as ReportDraftBackup
      if (backup.version !== 1) return

      setForm(backup.data.form)
      setPrograms(backup.data.programs)
      setCellAttendance(backup.data.cellAttendance)
      setNewcomers(backup.data.newcomers)
      setContentItems(backup.data.contentItems)
      setScheduleItems(backup.data.scheduleItems)
      setBudgetItems(backup.data.budgetItems)
      setEnabledSections(backup.data.enabledSections)
      setSelectedCellId(backup.data.selectedCellId)
      setMemberAttendance(backup.data.memberAttendance)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftReportId(backup.draftReportId)
      setAutosaveStatus('local')
      toast.warning('로컬 임시 저장본을 복구했습니다.')
    } catch (restoreError) {
      console.error('Failed to restore report draft backup:', restoreError)
    }
  }, [
    backupKey,
    setBudgetItems,
    setCellAttendance,
    setContentItems,
    setEnabledSections,
    setForm,
    setMemberAttendance,
    setNewcomers,
    setPrograms,
    setScheduleItems,
    setSelectedCellId,
    toast,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(backupKey, JSON.stringify({
        ...serializableSnapshot,
        updatedAt: Date.now(),
      }))
      setAutosaveStatus(prev => (prev === 'idle' ? 'local' : prev))
    }, 400)

    return () => window.clearTimeout(timer)
  }, [backupKey, serializableSnapshot])

  useEffect(() => {
    if (!hasRestoredBackupRef.current) return
    if (!form.department_id || !form.report_date || loading) return
    if (snapshotString === lastAutosavedSnapshotRef.current) return

    const timer = window.setTimeout(async () => {
      setAutosaveStatus('saving')
      const autosaveResult = await saveDraftSnapshot(draftReportId)
      if (autosaveResult.status === 'saved') {
        setDraftReportId(autosaveResult.reportId)
        lastAutosavedSnapshotRef.current = snapshotString
        setAutosaveStatus('saved')
        window.localStorage.setItem(backupKey, JSON.stringify({
          ...serializableSnapshot,
          draftReportId: autosaveResult.reportId,
        }))
      } else if (autosaveResult.status === 'failed') {
        setAutosaveStatus('error')
      } else {
        setAutosaveStatus('local')
      }
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [
    backupKey,
    draftReportId,
    form.department_id,
    form.report_date,
    loading,
    saveDraftSnapshot,
    serializableSnapshot,
    snapshotString,
  ])


  const handleSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault()
    submit(isDraft)
  }

  // 현재 보고서 유형에 맞는 섹션 필터링
  const visibleSections = useMemo(() => {
    if (reportType === 'weekly') {
      return SECTIONS.filter(s => !['cell-attendance', 'overview', 'plan', 'budget'].includes(s.id))
    }
    if (reportType === 'cell_leader') {
      // 셀장 보고서: 순서/출결(weekly)/새신자/프로젝트 섹션 제외, cell-attendance 포함
      return SECTIONS.filter(s => !['program', 'attendance', 'newcomer', 'overview', 'plan', 'budget'].includes(s.id))
    }
    if (reportType === 'project') {
      // 프로젝트: 순서/출결/새신자/셀출석 제외
      const hideNav: string[] = ['program', 'cell-attendance', 'attendance', 'newcomer']
      // 토글로 비활성화된 섹션의 네비게이션도 제외
      if (!enabledSections.includes('overview') && !enabledSections.includes('purpose') && !enabledSections.includes('organization')) hideNav.push('overview')
      if (!enabledSections.includes('content') && !enabledSections.includes('schedule')) hideNav.push('plan')
      if (!enabledSections.includes('budget')) hideNav.push('budget')
      if (!enabledSections.includes('discussion') && !enabledSections.includes('other')) hideNav.push('notes')
      return SECTIONS.filter(s => !hideNav.includes(s.id))
    }
    // 모임/교육 보고서는 출결/새신자/프로젝트/셀출석 섹션 제외
    return SECTIONS.filter(s => !['cell-attendance', 'attendance', 'newcomer', 'overview', 'plan', 'budget'].includes(s.id))
  }, [reportType, enabledSections])

  // sectionRef 콜백 생성
  const setSectionRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[key] = el
  }, [])

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 md:space-y-6">
      {/* 스티키 섹션 네비게이션 (모바일만) */}
      <div className="sticky top-16 z-10 -mx-4 px-4 py-2 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {visibleSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span>자동 저장은 초안만 저장됩니다.</span>
        <span className={autosaveStatus === 'error' ? 'text-red-600' : autosaveStatus === 'saved' ? 'text-green-600' : 'text-gray-500'}>
          {autosaveStatus === 'saving' && '자동 저장 중...'}
          {autosaveStatus === 'saved' && '자동 저장됨'}
          {autosaveStatus === 'local' && '로컬 백업 저장됨'}
          {autosaveStatus === 'error' && '자동 저장 실패'}
          {autosaveStatus === 'idle' && '변경 대기 중'}
        </span>
      </div>

      <div
        ref={(el) => { sectionRefs.current['basic'] = el }}
        data-section="basic"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4 scroll-mt-24"
      >
        <h2 className="font-semibold text-gray-900 text-base md:text-lg border-b pb-2">
          {reportType === 'weekly' ? '기본 정보' : reportType === 'cell_leader' ? '셀 모임 개요' : reportType === 'project' ? '프로젝트 기본 정보' : reportType === 'meeting' ? '모임 개요' : reportType === 'visitation' ? '심방 개요' : '교육 개요'}
        </h2>

        {/* 모임/교육 제목 */}
        {reportType !== 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'cell_leader' ? '셀 모임명' : reportType === 'project' ? '프로젝트명' : reportType === 'meeting' ? '모임명' : reportType === 'visitation' ? '심방 대상자' : '교육명'}
            </label>
            <input
              type="text"
              value={form.meeting_title}
              onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
              placeholder={reportType === 'cell_leader' ? '예: 현진셀 모임 보고서' : reportType === 'project' ? '예: 2024 교육부 프로젝트' : reportType === 'meeting' ? '예: 청년1 셀장모임' : reportType === 'visitation' ? '예: 홍길동 (또는 홍길동·이순신)' : '예: 리더 교육'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 부서 (모든 보고서 공통) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={form.department_id}
              onChange={(e) => {
                handleDepartmentChange(e.target.value)
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reportType === 'weekly' ? '날짜' : '일시'}
            </label>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* 셀장보고서: 셀 선택 드롭다운 */}
          {reportType === 'cell_leader' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">셀 선택</label>
              <select
                value={selectedCellId}
                onChange={(e) => handleCellChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">셀을 선택하세요</option>
                {cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== 'weekly' && reportType !== 'project' && (
            <>
              {reportType !== 'cell_leader' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input
                  type="text"
                  value={form.meeting_location}
                  onChange={(e) => setForm({ ...form, meeting_location: e.target.value })}
                  placeholder="예: 사무실"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              )}
              {/* 셀장보고서에서 셀이 선택된 경우 참석자 입력 숨김 (체크박스로 대체) */}
              {!(reportType === 'cell_leader' && selectedCellId) && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">참석자</label>
                  <input
                    type="text"
                    value={form.attendees}
                    onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                    placeholder="예: 전홍균, 강현숙, 신요한, 김유창 (총 4명)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 프로젝트 기획서: 포함할 항목 선택 */}
      {reportType === 'project' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 md:p-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm md:text-base">포함할 항목</h2>
            <button
              type="button"
              onClick={toggleAllSections}
              className="text-xs text-blue-600 font-medium"
            >
              {enabledSections.length === ALL_PROJECT_SECTIONS.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROJECT_OPTIONAL_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  isSectionEnabled(section.id)
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                }`}
              >
                {isSectionEnabled(section.id) ? '✓ ' : ''}{section.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 진행순서 (셀장/프로젝트 보고서 제외) */}
      {reportType !== 'cell_leader' && reportType !== 'project' && (
        <ProgramTable
          programs={programs}
          onAdd={addProgram}
          onUpdate={updateProgram}
          onRemove={removeProgram}
          sectionRef={setSectionRef('program')}
        />
      )}

      {/* 말씀 정보 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">말씀 제목</label>
              <input
                type="text"
                value={form.sermon_title}
                onChange={(e) => setForm({ ...form, sermon_title: e.target.value })}
                placeholder="예: 그리스도인과 돈"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">말씀 본문</label>
              <input
                type="text"
                value={form.sermon_scripture}
                onChange={(e) => setForm({ ...form, sermon_scripture: e.target.value })}
                placeholder="예: 누가복음 16:1~13"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* 셀원 출석 체크 (셀장보고서 + 셀 선택됨) */}
      {reportType === 'cell_leader' && selectedCellId && (
        <CellMemberAttendance
          memberAttendance={memberAttendance}
          onToggle={handleToggleMemberAttendance}
          onBulkAction={handleBulkAttendance}
          sectionRef={setSectionRef('cell-attendance')}
        />
      )}

      {/* 주요내용 (모임/교육/셀장/심방 보고서 - 프로젝트 제외) */}
      {reportType !== 'weekly' && reportType !== 'project' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
            {reportType === 'cell_leader' ? '나눔 내용' : reportType === 'visitation' ? '심방 내용' : reportType === 'meeting' ? '주요내용' : '교육내용'}
          </label>
          <RichTextEditor
            value={form.main_content}
            onChange={(value) => setForm({ ...form, main_content: value })}
            placeholder={reportType === 'cell_leader' ? '셀 모임에서 나눈 내용을 입력하세요' : reportType === 'visitation' ? '심방 중 나눈 내용을 입력하세요' : reportType === 'meeting' ? '주요 내용을 입력하세요' : '교육 내용을 입력하세요'}
            minHeight="150px"
          />
        </div>
      )}

      {/* 프로젝트: 개요/목적/조직도 */}
      {reportType === 'project' && (isSectionEnabled('overview') || isSectionEnabled('purpose') || isSectionEnabled('organization')) && (
        <div
          ref={(el) => { sectionRefs.current['overview'] = el }}
          data-section="overview"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4 scroll-mt-24"
        >
          {isSectionEnabled('overview') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.overview}. 개요</label>
              <RichTextEditor
                value={form.main_content}
                onChange={(value) => setForm({ ...form, main_content: value })}
                placeholder="프로젝트 개요를 입력하세요"
                minHeight="120px"
              />
            </div>
          )}
          {isSectionEnabled('purpose') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.purpose}. 목적</label>
              <RichTextEditor
                value={form.application_notes}
                onChange={(value) => setForm({ ...form, application_notes: value })}
                placeholder="프로젝트 목적을 입력하세요"
                minHeight="120px"
              />
            </div>
          )}
          {isSectionEnabled('organization') && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">{projNum.organization}. 조직도</label>
              <RichTextEditor
                value={form.organization}
                onChange={(value) => setForm({ ...form, organization: value })}
                placeholder="조직 구성을 입력하세요"
                minHeight="100px"
              />
            </div>
          )}
        </div>
      )}

      {/* 프로젝트: 세부계획 (내용 + 일정표) */}
      {reportType === 'project' && (isSectionEnabled('content') || isSectionEnabled('schedule')) && (
        <div
          ref={(el) => { sectionRefs.current['plan'] = el }}
          data-section="plan"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-6 scroll-mt-24"
        >
          <h2 className="font-semibold text-gray-900 text-base md:text-lg border-b pb-2">{projNum.content || projNum.schedule}. 세부 계획</h2>

          {/* 내용 테이블 (4열) */}
          {isSectionEnabled('content') && <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700 text-sm">내용</label>
              <button
                type="button"
                onClick={addContentItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">항목</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">내용</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">담당</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">비고</th>
                    <th className="px-2 py-2 border-b w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {contentItems.map((item, i) => (
                    <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-1 py-1"><input type="text" value={item.col1} onChange={(e) => updateContentItem(i, 'col1', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="항목" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col2} onChange={(e) => updateContentItem(i, 'col2', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="내용" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col3} onChange={(e) => updateContentItem(i, 'col3', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="담당" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.col4} onChange={(e) => updateContentItem(i, 'col4', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="비고" /></td>
                      <td className="px-1 py-1 text-center">
                        {contentItems.length > 1 && (
                          <button type="button" onClick={() => removeContentItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* 세부 일정표 */}
          {isSectionEnabled('schedule') && <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700 text-sm">세부 일정표</label>
              <button
                type="button"
                onClick={addScheduleItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + 행 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '30%' }}>일정표</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">세부내용</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 border-b" style={{ width: '20%' }}>비고</th>
                    <th className="px-2 py-2 border-b w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleItems.map((item, i) => (
                    <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-1 py-1"><input type="text" value={item.schedule} onChange={(e) => updateScheduleItem(i, 'schedule', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="예: 3월 1주차" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.detail} onChange={(e) => updateScheduleItem(i, 'detail', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="세부내용" /></td>
                      <td className="px-1 py-1"><input type="text" value={item.note} onChange={(e) => updateScheduleItem(i, 'note', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="비고" /></td>
                      <td className="px-1 py-1 text-center">
                        {scheduleItems.length > 1 && (
                          <button type="button" onClick={() => removeScheduleItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      )}

      {/* 프로젝트: 예산 */}
      {reportType === 'project' && isSectionEnabled('budget') && (
        <div
          ref={(el) => { sectionRefs.current['budget'] = el }}
          data-section="budget"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-base md:text-lg">{projNum.budget}. 예산 <span className="text-xs font-normal text-gray-400">(단위: 원)</span></h2>
            <button
              type="button"
              onClick={addBudgetItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + 항목 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '13%' }}>항</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '13%' }}>목</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '20%' }}>세부품목</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '14%' }}>금액</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '10%' }}>개수</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 border-b text-xs" style={{ width: '14%' }}>합계</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 border-b text-xs" style={{ width: '12%' }}>비고</th>
                  <th className="px-1 py-2 border-b w-8"></th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item, i) => (
                  <tr key={item._key} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-1 py-1"><input type="text" value={item.subcategory} onChange={(e) => updateBudgetItem(i, 'subcategory', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1"><input type="text" value={item.item_name} onChange={(e) => updateBudgetItem(i, 'item_name', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1"><input type="text" value={item.basis} onChange={(e) => updateBudgetItem(i, 'basis', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" placeholder="세부품목" /></td>
                    <td className="px-1 py-1"><input type="number" value={item.unit_price || ''} onChange={(e) => updateBudgetItem(i, 'unit_price', parseInt(e.target.value) || 0)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs text-right" placeholder="0" /></td>
                    <td className="px-1 py-1"><input type="number" value={item.quantity || ''} onChange={(e) => updateBudgetItem(i, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs text-right" placeholder="1" /></td>
                    <td className="px-1 py-1 text-right text-xs font-medium text-gray-900 whitespace-nowrap">
                      {((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                    </td>
                    <td className="px-1 py-1"><input type="text" value={item.note} onChange={(e) => updateBudgetItem(i, 'note', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-xs" /></td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeBudgetItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50">
                  <td colSpan={5} className="px-3 py-2 text-right font-bold text-gray-900 text-sm">합계</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-700 text-sm">
                    {budgetItems.reduce((sum, b) => sum + ((b.unit_price || 0) * (b.quantity || 0)), 0).toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 출결상황 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <AttendanceInput
          cellAttendance={cellAttendance}
          attendanceSummary={attendanceSummary}
          onAdd={addCellAttendance}
          onUpdate={updateCellAttendance}
          onRemove={removeCellAttendance}
          sectionRef={setSectionRef('attendance')}
        />
      )}

      {/* 새신자 명단 (주차 보고서만) */}
      {reportType === 'weekly' && (
        <NewcomerSection
          newcomers={newcomers}
          onAdd={addNewcomer}
          onUpdate={updateNewcomer}
          onRemove={removeNewcomer}
          sectionRef={setSectionRef('newcomer')}
        />
      )}

      {/* 사진 첨부 */}
      <PhotoUploadSection
        photoFiles={photoFiles}
        photoPreviews={photoPreviews}
        onPhotoAdd={handlePhotoAdd}
        onPhotoRemove={removePhoto}
        sectionRef={setSectionRef('photos')}
      />

      {/* 논의사항 / 기타사항 (프로젝트: 토글 가능) */}
      {(reportType !== 'project' || isSectionEnabled('discussion') || isSectionEnabled('other')) && (
        <div
          ref={(el) => { sectionRefs.current['notes'] = el }}
          data-section="notes"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {(reportType !== 'project' || isSectionEnabled('discussion')) && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">
                  {reportType === 'cell_leader' || reportType === 'visitation' ? '기도제목' : reportType === 'education' ? '적용점' : '논의(특이)사항'}
                </label>
                <RichTextEditor
                  value={reportType === 'cell_leader' || reportType === 'education' || reportType === 'visitation' ? form.application_notes : form.discussion_notes}
                  onChange={(value) => setForm({
                    ...form,
                    [reportType === 'cell_leader' || reportType === 'education' || reportType === 'visitation' ? 'application_notes' : 'discussion_notes']: value
                  })}
                  placeholder={reportType === 'cell_leader' || reportType === 'visitation' ? '기도제목을 입력하세요' : reportType === 'education' ? '적용점을 입력하세요' : '논의사항을 입력하세요'}
                  minHeight="120px"
                />
              </div>
            )}
            {(reportType !== 'project' || isSectionEnabled('other')) && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2 text-sm md:text-base">기타사항</label>
                <RichTextEditor
                  value={form.other_notes}
                  onChange={(value) => setForm({ ...form, other_notes: value })}
                  placeholder="기타사항을 입력하세요"
                  minHeight="120px"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-sm">
          <p>{error}</p>
          {existingReportId && (
            <div className="mt-2 flex gap-2">
              {existingReportStatus === 'draft' || existingReportStatus === 'rejected' ? (
                <button
                  type="button"
                  onClick={() => router.push(`/reports/${existingReportId}/edit`)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  기존 보고서 수정하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/reports/${existingReportId}`)}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  기존 보고서 보기
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="sm:flex-1 px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm md:text-base order-3 sm:order-1"
        >
          취소
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="sm:flex-1 px-4 py-2.5 md:py-3 border border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm md:text-base order-2"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={loading}
          className="sm:flex-1 px-4 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base order-1 sm:order-3"
        >
          {loading ? '저장 중...' : '제출'}
        </button>
      </div>
    </form>
  )
}


