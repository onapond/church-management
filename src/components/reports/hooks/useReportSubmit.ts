import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QueryClient } from '@tanstack/react-query'
import { buildReportData } from '../utils/reportDataBuilder'
import type { ReportType, ReportFormFields } from '../utils/reportDataBuilder'
import type {
  CellAttendance,
  Newcomer,
  Program,
  ProjectBudgetItem,
  ProjectContentItem,
  ProjectScheduleItem,
} from '../types'
import type { MemberAttendanceItem } from '../CellMemberAttendance'
import type { ReportSaveRequest, ReportSaveResponse } from '../utils/reportSavePayload'

type ToastContext = {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
}

interface Department {
  id: string
  name: string
  code: string
}

interface ExistingReport {
  id: string
  author_id: string
  status: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface UseReportSubmitOptions {
  supabase: SupabaseClient
  authorId: string
  reportType: ReportType
  departments: Department[]
  weekNumber: number
  editMode: boolean
  existingReport?: ExistingReport
  form: ReportFormFields
  programs: Program[]
  newcomers: Newcomer[]
  contentItems: ProjectContentItem[]
  scheduleItems: ProjectScheduleItem[]
  budgetItems: ProjectBudgetItem[]
  cellAttendance: CellAttendance[]
  memberAttendance: MemberAttendanceItem[]
  selectedCellId: string
  photoFiles: File[]
  enabledSections: string[]
  attendanceSummary: { total: number; worship: number; meeting: number }
  toast: ToastContext
  queryClient: QueryClient
  router: ReturnType<typeof useRouter>
  onDuplicateFound: (id: string, status: string) => void
  draftReportId?: string | null
}

export interface UseReportSubmitReturn {
  submit: (isDraft: boolean) => Promise<void>
  saveDraftSnapshot: (targetReportId?: string | null) => Promise<AutosaveResult>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export type AutosaveResult =
  | { status: 'saved'; reportId: string }
  | { status: 'skipped' }
  | { status: 'failed' }

async function uploadPhotos(
  supabase: SupabaseClient,
  reportId: string,
  photoFiles: File[],
  authorId: string,
) {
  if (photoFiles.length === 0) return

  const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

  for (let index = 0; index < photoFiles.length; index += 1) {
    const file = photoFiles[index]
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    if (!allowedExtensions.has(fileExt)) continue

    const fileName = `${reportId}/${Date.now()}_${index}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('report-photos').upload(fileName, file)
    if (uploadError) {
      console.error('Photo upload failed:', uploadError)
      continue
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('report-photos').getPublicUrl(fileName)

    const { error: photoInsertError } = await supabase.from('report_photos').insert({
      report_id: reportId,
      photo_url: publicUrl,
      order_index: index,
      uploaded_by: authorId,
    })

    if (photoInsertError) {
      console.error('Photo metadata insert failed:', photoInsertError)
    }
  }
}

async function saveReportViaApi(payload: ReportSaveRequest): Promise<ReportSaveResponse> {
  const response = await fetch('/api/reports/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const rawBody = await response.text()
  const fallbackMessage = response.ok
    ? 'Report save response was malformed.'
    : `Report save failed with status ${response.status}.`

  if (!rawBody.trim()) {
    return { ok: false, message: fallbackMessage }
  }

  try {
    const parsed = JSON.parse(rawBody) as Partial<ReportSaveResponse>
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
      return parsed as ReportSaveResponse
    }

    return { ok: false, message: fallbackMessage }
  } catch {
    return {
      ok: false,
      message: response.ok ? fallbackMessage : rawBody.trim() || fallbackMessage,
    }
  }
}

export function useReportSubmit(options: UseReportSubmitOptions): UseReportSubmitReturn {
  const {
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
    onDuplicateFound,
    draftReportId,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmittingRef = useRef(false)
  const requestQueueRef = useRef(Promise.resolve())

  const clearError = useCallback(() => setError(null), [])

  const runExclusive = useCallback(async <T,>(task: () => Promise<T>) => {
    const previous = requestQueueRef.current.catch(() => undefined)
    let release!: () => void
    requestQueueRef.current = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous

    try {
      return await task()
    } finally {
      release()
    }
  }, [])

  const handlePartialSaveFailure = useCallback(async (reportId: string, message: string) => {
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setError(message)
    toast.warning('The base report was saved. Review the edit page to complete recovery.')
    router.push(`/reports/${reportId}/edit`)
  }, [queryClient, router, toast])

  const buildSavePayload = useCallback((isDraft: boolean, targetReportId?: string | null): ReportSaveRequest => ({
    reportType,
    weekNumber,
    isDraft,
    targetReportId,
    editReportId: editMode ? existingReport?.id || null : null,
    form,
    programs,
    newcomers,
    contentItems,
    scheduleItems,
    budgetItems,
    cellAttendance,
    memberAttendance,
    selectedCellId,
    enabledSections,
    attendanceSummary,
    departmentName: departments.find((department) => department.id === form.department_id)?.name,
  }), [
    attendanceSummary,
    budgetItems,
    cellAttendance,
    contentItems,
    departments,
    editMode,
    enabledSections,
    existingReport?.id,
    form,
    memberAttendance,
    newcomers,
    programs,
    reportType,
    scheduleItems,
    selectedCellId,
    weekNumber,
  ])

  const saveDraftSnapshot = useCallback(async (targetReportId?: string | null) => {
    // editMode에서는 autosave skip — editReportId + targetReportId 동시 세팅으로 400 에러 발생
    if (editMode) return { status: 'skipped' } as const

    const reportYear = parseInt(form.report_date.split('-')[0], 10)
    if (!Number.isFinite(reportYear) || !form.department_id || !form.report_date) {
      return { status: 'failed' } as const
    }

    if (isSubmittingRef.current) {
      return { status: 'skipped' } as const
    }

    try {
      const result = await runExclusive(() => saveReportViaApi(buildSavePayload(true, targetReportId)))
      if (!result.ok) return { status: 'failed' } as const

      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      return { status: 'saved', reportId: result.reportId } as const
    } catch (saveError) {
      console.error('saveDraftSnapshot error:', saveError)
      return { status: 'failed' } as const
    }
  }, [buildSavePayload, editMode, form.department_id, form.report_date, queryClient, runExclusive])

  const submit = useCallback(async (isDraft: boolean) => {
    const reportYear = parseInt(form.report_date.split('-')[0], 10)
    if (!Number.isFinite(reportYear)) {
      setError('Select a valid report date.')
      toast.error('Select a valid report date.')
      return
    }

    if (!form.department_id) {
      setError('Select a department first.')
      toast.error('Select a department first.')
      return
    }

    setIsLoading(true)
    isSubmittingRef.current = true
    setError(null)
    let createdReportId: string | null = null

    try {
      buildReportData({
        form,
        reportType,
        reportYear,
        weekNumber,
        isDraft,
        cellAttendance,
        attendanceSummary,
        memberAttendance,
        selectedCellId,
        enabledSections: enabledSections as never,
      })

      const result = await runExclusive(() => saveReportViaApi(buildSavePayload(isDraft, !editMode ? draftReportId : null)))

      if (!result.ok) {
        if (result.duplicate) {
          setError(result.message)
          onDuplicateFound(result.id, result.status)
          toast.warning(result.message)
          return
        }

        setError(result.message)
        toast.error(result.message)
        return
      }

      const { reportId } = result
      createdReportId = result.createdReportId

      await uploadPhotos(supabase, reportId, photoFiles, authorId)

      if (result.warnings?.length) {
        toast.warning(result.warnings.join(' '))
      }

      toast.success(isDraft ? 'Draft saved.' : 'Report submitted.')
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['attendance'] })

      setTimeout(() => {
        if (!editMode && isDraft) {
          router.push(`/reports/${reportId}/edit`)
          return
        }

        router.push(`/reports?type=${reportType}`)
      }, 500)
    } catch (submitError) {
      console.error('useReportSubmit error:', submitError)

      if (createdReportId) {
        const message = submitError instanceof Error ? submitError.message : 'Unknown error'
        await handlePartialSaveFailure(
          createdReportId,
          `The base report was saved, but a later step failed: ${message}`,
        )
        return
      }

      const message = submitError instanceof Error ? submitError.message : 'Unknown error'
      setError(`Report save failed: ${message}`)
      toast.error('Report save failed. Review the form and try again.')
    } finally {
      isSubmittingRef.current = false
      setIsLoading(false)
    }
  }, [
    attendanceSummary,
    authorId,
    buildSavePayload,
    cellAttendance,
    draftReportId,
    editMode,
    enabledSections,
    form,
    handlePartialSaveFailure,
    memberAttendance,
    onDuplicateFound,
    photoFiles,
    queryClient,
    reportType,
    router,
    runExclusive,
    selectedCellId,
    supabase,
    toast,
    weekNumber,
  ])

  return { submit, saveDraftSnapshot, isLoading, error, clearError }
}

export { saveReportViaApi }

