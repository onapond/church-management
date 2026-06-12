'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Program, Newcomer, CellAttendance, ProjectContentItem, ProjectScheduleItem, ProjectBudgetItem } from '../types'
import { genKey } from '../types'
import type { MemberAttendanceItem } from '../CellMemberAttendance'
import { useCells } from '@/queries/departments'
import { useCellMembers, useCellAttendanceRecords } from '@/queries/attendance'

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
  projectContentItems?: Array<{ id: string; col1: string; col2: string; col3: string; col4: string; order_index: number }>
  projectScheduleItems?: Array<{ id: string; schedule: string; detail: string; note: string; order_index: number }>
  projectBudgetItems?: Array<{ id: string; category: string; subcategory: string; item_name: string; basis: string; unit_price?: number; quantity?: number; amount: number; note: string; order_index: number }>
  programs: Array<{ id: string; start_time: string; content: string; person_in_charge: string | null; order_index: number }>
  newcomers: Array<{ id: string; name: string; phone: string | null; birth_date: string | null; introducer: string | null; address: string | null; affiliation: string | null }>
}

type ToastContext = {
  error: (msg: string) => void
  warning: (msg: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

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
const ALL_PROJECT_SECTIONS: ProjectSectionId[] = PROJECT_OPTIONAL_SECTIONS.map(s => s.id)
const PROJECT_SECTION_ORDER: ProjectSectionId[] = ['overview', 'purpose', 'organization', 'content', 'schedule', 'budget']

const DEFAULT_BUDGET: ProjectBudgetItem[] = [
  { _key: genKey(), category: '교육위원회', subcategory: '', item_name: '', basis: '', unit_price: 0, quantity: 1, amount: 0, note: '', order_index: 0 },
]

export interface UseReportFormOptions {
  reportType: ReportType
  departments: Department[]
  defaultDate: string
  editMode: boolean
  existingReport?: ExistingReport
  supabase: SupabaseClient
  toast: ToastContext
}

export interface UseReportFormReturn {
  // 중복 보고서 상태
  existingReportId: string | null
  setExistingReportId: React.Dispatch<React.SetStateAction<string | null>>
  existingReportStatus: string | null
  setExistingReportStatus: React.Dispatch<React.SetStateAction<string | null>>
  // 폼 필드
  form: {
    department_id: string
    report_date: string
    sermon_title: string
    sermon_scripture: string
    discussion_notes: string
    other_notes: string
    meeting_title: string
    meeting_location: string
    attendees: string
    main_content: string
    application_notes: string
    organization: string
  }
  setForm: React.Dispatch<React.SetStateAction<UseReportFormReturn['form']>>
  // 프로그램
  programs: Program[]
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>
  addProgram: () => void
  removeProgram: (index: number) => void
  updateProgram: (index: number, field: keyof Program, value: string | number) => void
  // 셀 출결
  cellAttendance: CellAttendance[]
  setCellAttendance: React.Dispatch<React.SetStateAction<CellAttendance[]>>
  addCellAttendance: () => void
  removeCellAttendance: (index: number) => void
  updateCellAttendance: (index: number, field: keyof CellAttendance, value: string | number) => void
  // 새신자
  newcomers: Newcomer[]
  setNewcomers: React.Dispatch<React.SetStateAction<Newcomer[]>>
  addNewcomer: () => void
  removeNewcomer: (index: number) => void
  updateNewcomer: (index: number, field: keyof Newcomer, value: string) => void
  // 프로젝트: 세부계획 내용
  contentItems: ProjectContentItem[]
  setContentItems: React.Dispatch<React.SetStateAction<ProjectContentItem[]>>
  addContentItem: () => void
  removeContentItem: (index: number) => void
  updateContentItem: (index: number, field: keyof ProjectContentItem, value: string) => void
  // 프로젝트: 일정표
  scheduleItems: ProjectScheduleItem[]
  setScheduleItems: React.Dispatch<React.SetStateAction<ProjectScheduleItem[]>>
  addScheduleItem: () => void
  removeScheduleItem: (index: number) => void
  updateScheduleItem: (index: number, field: keyof ProjectScheduleItem, value: string) => void
  // 프로젝트: 예산
  budgetItems: ProjectBudgetItem[]
  setBudgetItems: React.Dispatch<React.SetStateAction<ProjectBudgetItem[]>>
  addBudgetItem: () => void
  removeBudgetItem: (index: number) => void
  updateBudgetItem: (index: number, field: keyof ProjectBudgetItem, value: string | number) => void
  // 사진
  photoFiles: File[]
  photoPreviews: string[]
  handlePhotoAdd: (e: React.ChangeEvent<HTMLInputElement>) => void
  removePhoto: (index: number) => void
  // 프로젝트 섹션 토글
  enabledSections: ProjectSectionId[]
  setEnabledSections: React.Dispatch<React.SetStateAction<ProjectSectionId[]>>
  isSectionEnabled: (id: ProjectSectionId) => boolean
  toggleSection: (id: ProjectSectionId) => void
  toggleAllSections: () => void
  projNum: Partial<Record<ProjectSectionId, number>>
  // 셀장보고서: 셀/셀원 출결
  selectedCellId: string
  setSelectedCellId: React.Dispatch<React.SetStateAction<string>>
  memberAttendance: MemberAttendanceItem[]
  setMemberAttendance: React.Dispatch<React.SetStateAction<MemberAttendanceItem[]>>
  handleToggleMemberAttendance: (memberId: string) => void
  handleBulkAttendance: (allPresent: boolean) => void
  handleCellChange: (cellId: string) => void
  handleDepartmentChange: (departmentId: string) => void
  cells: Array<{ id: string; name: string }>
  // 출결 요약 (주차 보고서)
  attendanceSummary: { total: number; worship: number; meeting: number }
}

export function useReportForm({
  reportType,
  departments,
  defaultDate,
  editMode,
  existingReport,
  supabase,
  toast,
}: UseReportFormOptions): UseReportFormReturn {

  const [existingReportId, setExistingReportId] = useState<string | null>(null)
  const [existingReportStatus, setExistingReportStatus] = useState<string | null>(null)
  const [selectedCellId, setSelectedCellId] = useState<string>(existingReport?.cell_id || '')
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendanceItem[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  // 기존 데이터에서 notes 파싱
  const parsedNotes = useMemo(() => {
    if (!existingReport?.notes) return {}
    try {
      return JSON.parse(existingReport.notes)
    } catch (error) {
      console.error('Invalid report notes JSON:', error)
      return {}
    }
  }, [existingReport?.notes])

  // 프로젝트 섹션 토글
  const [enabledSections, setEnabledSections] = useState<ProjectSectionId[]>(
    parsedNotes.project_sections || ALL_PROJECT_SECTIONS
  )
  const isSectionEnabled = useCallback((id: ProjectSectionId) => enabledSections.includes(id), [enabledSections])
  const toggleSection = useCallback((id: ProjectSectionId) => {
    setEnabledSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }, [])
  const toggleAllSections = useCallback(() => {
    setEnabledSections(prev =>
      prev.length === ALL_PROJECT_SECTIONS.length ? [] : [...ALL_PROJECT_SECTIONS]
    )
  }, [])

  // 프로젝트 섹션 동적 번호 (활성화된 것만 순서대로)
  const projNum = useMemo(() => {
    const map: Partial<Record<ProjectSectionId, number>> = {}
    let n = 1
    for (const id of PROJECT_SECTION_ORDER) {
      if (!enabledSections.includes(id)) continue
      if (id === 'schedule' && map['content']) continue
      map[id] = n
      if (id === 'content') map['schedule'] = n
      n++
    }
    return map
  }, [enabledSections])

  // 공통 필드
  const [form, setForm] = useState({
    department_id: existingReport?.department_id || departments[0]?.id || '',
    report_date: existingReport?.report_date || defaultDate,
    sermon_title: parsedNotes.sermon_title || '',
    sermon_scripture: parsedNotes.sermon_scripture || '',
    discussion_notes: parsedNotes.discussion_notes || '',
    other_notes: parsedNotes.other_notes || '',
    meeting_title: existingReport?.meeting_title || '',
    meeting_location: existingReport?.meeting_location || '',
    attendees: existingReport?.attendees || '',
    main_content: existingReport?.main_content || '',
    application_notes: existingReport?.application_notes || '',
    organization: parsedNotes.organization || '',
  })

  // 셀 목록 조회 (셀장보고서일 때만)
  const { data: cells = [] } = useCells(reportType === 'cell_leader' ? form.department_id : undefined)
  const { data: cellMembers = [] } = useCellMembers(reportType === 'cell_leader' && selectedCellId ? selectedCellId : undefined)
  const cellMemberIds = useMemo(() => cellMembers.map(m => m.id), [cellMembers])
  const { data: cellRecordsData } = useCellAttendanceRecords(
    editMode && reportType === 'cell_leader' ? cellMemberIds : [],
    editMode ? form.report_date : ''
  )
  const existingCellRecords = useMemo(() => cellRecordsData ?? [], [cellRecordsData])

  // 셀원 목록이 변경되면 출결 상태 초기화
  useEffect(() => {
    if (reportType !== 'cell_leader' || cellMembers.length === 0) return
    const attendanceMap = new Map(existingCellRecords.map(r => [r.member_id, r.is_present]))
    setMemberAttendance(prev => {
      if (prev.length === cellMembers.length &&
          prev.every((m, i) => m.memberId === cellMembers[i]?.id)) {
        return prev
      }
      return cellMembers.map(m => ({
        memberId: m.id,
        name: m.name,
        photoUrl: m.photo_url,
        isPresent: editMode ? (attendanceMap.get(m.id) ?? false) : false,
      }))
    })
  }, [cellMembers, existingCellRecords, editMode, reportType])

  const handleToggleMemberAttendance = useCallback((memberId: string) => {
    setMemberAttendance(prev =>
      prev.map(m => m.memberId === memberId ? { ...m, isPresent: !m.isPresent } : m)
    )
  }, [])

  const handleBulkAttendance = useCallback((allPresent: boolean) => {
    setMemberAttendance(prev => prev.map(m => ({ ...m, isPresent: allPresent })))
  }, [])

  const handleDepartmentChange = useCallback((departmentId: string) => {
    setForm(prev => ({ ...prev, department_id: departmentId }))
    setSelectedCellId('')
    setMemberAttendance([])
  }, [])

  const handleCellChange = useCallback((cellId: string) => {
    setSelectedCellId(cellId)
    setMemberAttendance([])
    const cell = cells.find(c => c.id === cellId)
    if (cell) {
      setForm(prev => ({ ...prev, meeting_title: `${cell.name} 모임 보고서` }))
    }
  }, [cells])

  // 프로그램 초기화
  const initialPrograms: Program[] = useMemo(() => existingReport?.programs?.length
    ? existingReport.programs.map(p => ({
        _key: genKey(),
        id: p.id,
        start_time: p.start_time?.slice(0, 5) || '',
        end_time: '',
        content: p.content || '',
        person_in_charge: p.person_in_charge || '',
        note: '',
        order_index: p.order_index,
      }))
    : [
        { _key: genKey(), start_time: '13:30', end_time: '13:40', content: '찬양 및 기도', person_in_charge: '', note: '', order_index: 0 },
        { _key: genKey(), start_time: '13:40', end_time: '14:00', content: '말씀', person_in_charge: '', note: '', order_index: 1 },
        { _key: genKey(), start_time: '14:00', end_time: '14:10', content: '광고', person_in_charge: '', note: '', order_index: 2 },
      ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [])

  const [programs, setPrograms] = useState<Program[]>(initialPrograms)

  // 셀 출결 초기화
  const [cellAttendance, setCellAttendance] = useState<CellAttendance[]>(() =>
    parsedNotes.cell_attendance?.length
      ? parsedNotes.cell_attendance.map((c: CellAttendance) => ({ ...c, _key: c._key || genKey() }))
      : [{ _key: genKey(), cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }]
  )

  // 새신자 초기화
  const [newcomers, setNewcomers] = useState<Newcomer[]>(() =>
    existingReport?.newcomers?.length
      ? existingReport.newcomers.map(n => ({
          id: n.id,
          _key: genKey(),
          name: n.name,
          phone: n.phone || '',
          birth_date: n.birth_date || '',
          introducer: n.introducer || '',
          address: n.address || '',
          affiliation: n.affiliation || '',
        }))
      : []
  )

  // 프로젝트: 세부계획 내용
  const [contentItems, setContentItems] = useState<ProjectContentItem[]>(() =>
    existingReport?.projectContentItems?.length
      ? existingReport.projectContentItems.map(c => ({
          id: c.id,
          _key: genKey(), col1: c.col1 || '', col2: c.col2 || '', col3: c.col3 || '', col4: c.col4 || '', order_index: c.order_index,
        }))
      : [{ _key: genKey(), col1: '', col2: '', col3: '', col4: '', order_index: 0 }]
  )

  // 프로젝트: 일정표
  const [scheduleItems, setScheduleItems] = useState<ProjectScheduleItem[]>(() =>
    existingReport?.projectScheduleItems?.length
      ? existingReport.projectScheduleItems.map(s => ({
          id: s.id,
          _key: genKey(), schedule: s.schedule || '', detail: s.detail || '', note: s.note || '', order_index: s.order_index,
        }))
      : [{ _key: genKey(), schedule: '', detail: '', note: '', order_index: 0 }]
  )

  // 프로젝트: 예산
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>(() =>
    existingReport?.projectBudgetItems?.length
      ? existingReport.projectBudgetItems.map(b => ({
          id: b.id,
          _key: genKey(), category: b.category || '', subcategory: b.subcategory || '', item_name: b.item_name || '',
          basis: b.basis || '', unit_price: b.unit_price ?? b.amount ?? 0, quantity: b.quantity ?? 1,
          amount: b.amount || 0, note: b.note || '', order_index: b.order_index,
        }))
      : DEFAULT_BUDGET
  )

  // 출결 요약 (주차 보고서)
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, worship: 0, meeting: 0 })

  useEffect(() => {
    if (reportType !== 'weekly') return

    const loadData = async () => {
      if (!form.department_id) return
      try {
        const { data: memberDeptData, error: memberDeptError } = await supabase
          .from('member_departments')
          .select('member_id')
          .eq('department_id', form.department_id)
        if (memberDeptError) throw memberDeptError

        const memberIds = [...new Set((memberDeptData || []).map((md: { member_id: string }) => md.member_id))]
        if (memberIds.length === 0) { setAttendanceSummary({ total: 0, worship: 0, meeting: 0 }); return }

        const { data: activeMembers, count, error: membersError } = await supabase
          .from('members')
          .select('id', { count: 'exact' })
          .in('id', memberIds)
          .eq('is_active', true)
        if (membersError) throw membersError

        const activeMemberIds = (activeMembers || []).map((m: { id: string }) => m.id)
        if (activeMemberIds.length === 0) { setAttendanceSummary({ total: 0, worship: 0, meeting: 0 }); return }

        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('attendance_date', form.report_date)
          .in('member_id', activeMemberIds)
        if (attendanceError) throw attendanceError

        const worshipCount = attendance?.filter((a: { attendance_type: string; is_present: boolean }) => a.attendance_type === 'worship' && a.is_present).length || 0
        const meetingCount = attendance?.filter((a: { attendance_type: string; is_present: boolean }) => a.attendance_type === 'meeting' && a.is_present).length || 0
        setAttendanceSummary({ total: count || 0, worship: worshipCount, meeting: meetingCount })
      } catch (err) {
        console.error('출결 데이터 로드 오류:', err)
        setAttendanceSummary({ total: 0, worship: 0, meeting: 0 })
      }
    }

    loadData()
  }, [form.department_id, form.report_date, supabase, reportType])

  // ── 핸들러 ──────────────────────────────────────────

  const addProgram = useCallback(() => {
    setPrograms(prev => [...prev, { _key: genKey(), start_time: '', end_time: '', content: '', person_in_charge: '', note: '', order_index: prev.length }])
  }, [])
  const removeProgram = useCallback((index: number) => {
    setPrograms(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateProgram = useCallback((index: number, field: keyof Program, value: string | number) => {
    setPrograms(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }, [])

  const addCellAttendance = useCallback(() => {
    setCellAttendance(prev => [...prev, { _key: genKey(), cell_name: '', registered: 0, worship: 0, meeting: 0, note: '' }])
  }, [])
  const removeCellAttendance = useCallback((index: number) => {
    setCellAttendance(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateCellAttendance = useCallback((index: number, field: keyof CellAttendance, value: string | number) => {
    setCellAttendance(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }, [])

  const addNewcomer = useCallback(() => {
    setNewcomers(prev => [...prev, { _key: genKey(), name: '', phone: '', birth_date: '', introducer: '', address: '', affiliation: '' }])
  }, [])
  const removeNewcomer = useCallback((index: number) => {
    setNewcomers(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateNewcomer = useCallback((index: number, field: keyof Newcomer, value: string) => {
    setNewcomers(prev => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)))
  }, [])

  const addContentItem = useCallback(() => {
    setContentItems(prev => [...prev, { _key: genKey(), col1: '', col2: '', col3: '', col4: '', order_index: prev.length }])
  }, [])
  const removeContentItem = useCallback((index: number) => {
    setContentItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateContentItem = useCallback((index: number, field: keyof ProjectContentItem, value: string) => {
    setContentItems(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }, [])

  const addScheduleItem = useCallback(() => {
    setScheduleItems(prev => [...prev, { _key: genKey(), schedule: '', detail: '', note: '', order_index: prev.length }])
  }, [])
  const removeScheduleItem = useCallback((index: number) => {
    setScheduleItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateScheduleItem = useCallback((index: number, field: keyof ProjectScheduleItem, value: string) => {
    setScheduleItems(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }, [])

  const addBudgetItem = useCallback(() => {
    setBudgetItems(prev => [...prev, { _key: genKey(), category: '교육위원회', subcategory: '', item_name: '', basis: '', unit_price: 0, quantity: 1, amount: 0, note: '', order_index: prev.length }])
  }, [])
  const removeBudgetItem = useCallback((index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index))
  }, [])
  const updateBudgetItem = useCallback((index: number, field: keyof ProjectBudgetItem, value: string | number) => {
    setBudgetItems(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }, [])

  const handlePhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_SIZE = 10 * 1024 * 1024
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error('지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP만 가능)')
        return
      }
      if (f.size > MAX_SIZE) {
        toast.error('파일 크기는 10MB 이하만 가능합니다.')
        return
      }
    }

    const totalPhotos = photoFiles.length + files.length
    if (totalPhotos > 10) {
      toast.warning('사진은 최대 10장까지 첨부할 수 있습니다.')
      return
    }

    setPhotoFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreviews(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }, [photoFiles.length, toast])

  const removePhoto = useCallback((index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
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
  }
}

