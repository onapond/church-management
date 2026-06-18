'use client'

import { useMemo, useState } from 'react'
import { canAccessAllDepartments, canEditMeetingContent, canParticipateInMeetingAgenda } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import { useDepartments } from '@/queries/departments'
import {
  useCreateMeetingAgendaComment,
  useCreateMeetingAgendaItem,
  useDeleteMeetingAgendaComment,
  useDeleteMeetingAgendaItem,
  useMeetingAgendaPdfUrl,
  useMeetingAgendaItems,
  useUpdateMeetingAgendaStatus,
} from '@/queries/meetings/useMeetings'
import { useAuth } from '@/providers/AuthProvider'
import { useToastContext } from '@/providers/ToastProvider'
import type { Department, MeetingAgendaItemType, MeetingAgendaItemWithDetails } from '@/types/database'

interface MeetingAgendaBoardProps {
  meetingId: string
  meetingDepartmentId: string
  meetingDate: string
}

interface AgendaFormState {
  department_id: string
  item_type: MeetingAgendaItemType
  title: string
  content: string
}

const AGENDA_TYPE_OPTIONS: Array<{ value: MeetingAgendaItemType; label: string; className: string }> = [
  { value: 'agenda', label: '안건', className: 'bg-blue-50 text-blue-700' },
  { value: 'question', label: '질문', className: 'bg-amber-50 text-amber-700' },
  { value: 'notice', label: '공지', className: 'bg-emerald-50 text-emerald-700' },
]

const INITIAL_FORM: AgendaFormState = {
  department_id: '',
  item_type: 'agenda',
  title: '',
  content: '',
}

const MAX_AGENDA_PDF_SIZE_BYTES = 20 * 1024 * 1024
const supabase = createClient()

const SECTION_LABEL_BY_CODE: Partial<Record<string, string>> = {
  cu: '공통 회의 안건',
  youth: '청소년부 회의 안건',
  cu1: '1청년 회의 안건',
  cu2: '2청년 회의 안건',
  cu_worship: 'CU워십팀',
  leader: '리더십 회의 안건',
}

export default function MeetingAgendaBoard({ meetingId, meetingDepartmentId, meetingDate }: MeetingAgendaBoardProps) {
  const { user } = useAuth()
  const toast = useToastContext()
  const { data: departments = [] } = useDepartments()
  const { data: agendaItems = [], isLoading } = useMeetingAgendaItems(meetingId)
  const createItem = useCreateMeetingAgendaItem(meetingId)
  const createComment = useCreateMeetingAgendaComment(meetingId)
  const updateStatus = useUpdateMeetingAgendaStatus(meetingId)
  const deleteItem = useDeleteMeetingAgendaItem(meetingId)
  const deleteComment = useDeleteMeetingAgendaComment(meetingId)

  const [form, setForm] = useState<AgendaFormState>(INITIAL_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const canParticipate = canParticipateInMeetingAgenda(user)
  const canModerate = canEditMeetingContent(user, meetingDepartmentId)

  const availableDepartments = useMemo(() => {
    if (!user) return []
    if (canAccessAllDepartments(user.role)) return departments

    const leaderDepartmentIds = new Set(
      user.user_departments
        .filter((department) => department.is_team_leader)
        .map((department) => department.department_id)
    )

    return departments.filter((department) => leaderDepartmentIds.has(department.id))
  }, [departments, user])

  const selectedDepartmentId = form.department_id || availableDepartments[0]?.id || ''
  const openCount = agendaItems.filter((item) => item.status === 'open').length
  const agendaSections = useMemo(
    () => buildAgendaSections(departments, agendaItems, meetingDepartmentId),
    [agendaItems, departments, meetingDepartmentId]
  )
  const suggestedDeadline = useMemo(() => formatSuggestedDeadline(meetingDate), [meetingDate])

  async function handleCreateItem() {
    if (!user || !canParticipate) {
      toast.error('사전 안건을 작성할 권한이 없습니다.')
      return
    }

    const title = form.title.trim()
    if (!selectedDepartmentId || !title) {
      toast.warning('부서와 제목을 입력해 주세요.')
      return
    }

    if (pdfFile && !isValidPdfFile(pdfFile)) {
      toast.warning('PDF 파일만 20MB 이하로 업로드할 수 있습니다.')
      return
    }

    try {
      let uploadedPdf: Awaited<ReturnType<typeof uploadAgendaPdf>> | null = null
      if (pdfFile) {
        uploadedPdf = await uploadAgendaPdf({
          meetingId,
          departmentId: selectedDepartmentId,
          file: pdfFile,
        })
      }

      await createItem.mutateAsync({
        meeting_id: meetingId,
        department_id: selectedDepartmentId,
        author_id: user.id,
        item_type: form.item_type,
        title,
        content: normalizeText(form.content),
        pdf_file_path: uploadedPdf?.path ?? null,
        pdf_file_name: uploadedPdf?.name ?? null,
        pdf_file_size: uploadedPdf?.size ?? null,
        pdf_uploaded_at: uploadedPdf ? new Date().toISOString() : null,
      })
      setForm({ ...INITIAL_FORM, department_id: selectedDepartmentId })
      setPdfFile(null)
      toast.success('사전 안건이 등록되었습니다.')
    } catch (error) {
      console.error('Failed to create meeting agenda item:', error)
      toast.error('사전 안건 등록 중 오류가 발생했습니다.')
    }
  }

  async function handleCreateComment(itemId: string) {
    if (!user || !canParticipate) {
      toast.error('댓글을 작성할 권한이 없습니다.')
      return
    }

    const comment = commentDrafts[itemId]?.trim() ?? ''
    if (!comment) return

    try {
      await createComment.mutateAsync({
        agenda_item_id: itemId,
        commenter_id: user.id,
        comment,
      })
      setCommentDrafts((current) => ({ ...current, [itemId]: '' }))
      toast.success('댓글이 등록되었습니다.')
    } catch (error) {
      console.error('Failed to create meeting agenda comment:', error)
      toast.error('댓글 등록 중 오류가 발생했습니다.')
    }
  }

  async function handleToggleStatus(itemId: string, currentStatus: 'open' | 'resolved') {
    try {
      await updateStatus.mutateAsync({
        itemId,
        status: currentStatus === 'open' ? 'resolved' : 'open',
      })
    } catch (error) {
      console.error('Failed to update meeting agenda status:', error)
      toast.error('상태 변경 중 오류가 발생했습니다.')
    }
  }

  async function handleDeleteItem(item: MeetingAgendaItemWithDetails) {
    if (!window.confirm(`"${item.title}" 안건을 삭제하시겠습니까?`)) return

    try {
      if (item.pdf_file_path) {
        const { error: removeError } = await supabase.storage.from('meeting-pdfs').remove([item.pdf_file_path])
        if (removeError) throw removeError
      }
      await deleteItem.mutateAsync(item.id)
      toast.success('안건이 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete meeting agenda item:', error)
      toast.error('안건 삭제 중 오류가 발생했습니다.')
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment.mutateAsync(commentId)
    } catch (error) {
      console.error('Failed to delete meeting agenda comment:', error)
      toast.error('댓글 삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">회의 안건 사전 확인</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            부서별 안건을 미리 올리고, 필요한 질문과 피드백을 댓글로 남겨 주세요.
            {suggestedDeadline ? ` ${suggestedDeadline}까지 올리면 대면회의 준비에 반영하기 좋습니다.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2.5 py-1">전체 {agendaItems.length}</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">열림 {openCount}</span>
        </div>
      </div>

      {canParticipate ? (
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <div>
              <label htmlFor="agenda-title" className="mb-1 block text-sm font-medium text-gray-700">
                제목
              </label>
              <input
                id="agenda-title"
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="예: 수련회 준비 역할 분담"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="agenda-type" className="mb-1 block text-sm font-medium text-gray-700">
                유형
              </label>
              <select
                id="agenda-type"
                value={form.item_type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, item_type: event.target.value as MeetingAgendaItemType }))
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {AGENDA_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <label htmlFor="agenda-department" className="mb-1 block text-sm font-medium text-gray-700">
                부서
              </label>
              <select
                id="agenda-department"
                value={selectedDepartmentId}
                onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="agenda-content" className="mb-1 block text-sm font-medium text-gray-700">
                내용
              </label>
              <textarea
                id="agenda-content"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="배경, 확인할 질문, 필요한 결정사항을 적어 주세요."
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gray-100 bg-white px-3 py-3">
            <label htmlFor="agenda-pdf" className="block text-sm font-medium text-gray-700">
              부서 안건 PDF
            </label>
            <input
              id="agenda-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
            {pdfFile ? (
              <p className="mt-2 text-xs text-gray-500">
                선택한 파일: {pdfFile.name} ({formatFileSize(pdfFile.size)})
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateItem()}
              disabled={createItem.isPending || !form.title.trim() || !selectedDepartmentId}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createItem.isPending ? '등록 중...' : '안건 등록'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
          부서장과 관리자만 사전 안건과 질문을 작성할 수 있습니다.
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">안건을 불러오는 중입니다.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {agendaSections.map((section) => (
              <div key={section.department.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">[{section.label}]</h3>
                  {canParticipate && availableDepartments.some((department) => department.id === section.department.id) ? (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, department_id: section.department.id }))}
                      className="self-start rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:self-auto"
                    >
                      이 부서로 작성
                    </button>
                  ) : null}
                </div>

                {section.items.length === 0 ? (
                  <div className="mt-4 min-h-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-4 text-sm text-gray-400">
                    아직 올라온 안건이 없습니다.
                  </div>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {section.items.map((item) => {
                      const typeOption = AGENDA_TYPE_OPTIONS.find((option) => option.value === item.item_type) ?? AGENDA_TYPE_OPTIONS[0]
                      const canManageItem = user?.id === item.author_id || canModerate
                      const comments = item.meeting_agenda_comments || []

                      return (
                        <li key={item.id} className="pl-1">
                          <div className="flex gap-3">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium leading-6 text-gray-900">{item.title}</p>
                                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeOption.className}`}>
                                      {typeOption.label}
                                    </span>
                                    <span
                                      className={
                                        item.status === 'open'
                                          ? 'rounded px-2 py-0.5 text-xs font-medium text-blue-700'
                                          : 'rounded px-2 py-0.5 text-xs font-medium text-gray-500'
                                      }
                                    >
                                      {item.status === 'open' ? '열림' : '정리됨'}
                                    </span>
                                  </div>
                                  {item.content ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{item.content}</p>
                                  ) : null}
                                  {item.pdf_file_path ? (
                                    <AgendaPdfAttachment
                                      filePath={item.pdf_file_path}
                                      fileName={item.pdf_file_name}
                                      fileSize={item.pdf_file_size}
                                    />
                                  ) : null}
                                  <p className="mt-1 text-xs text-gray-400">
                                    {item.users?.name || '작성자'} · {formatDate(item.created_at)}
                                  </p>
                                </div>

                                {canManageItem ? (
                                  <div className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleStatus(item.id, item.status)}
                                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                      {item.status === 'open' ? '정리' : '다시 열기'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteItem(item)}
                                      className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-3 space-y-2">
                                {comments.map((comment) => {
                                  const canDeleteComment = user?.id === comment.commenter_id || user?.id === item.author_id || canModerate

                                  return (
                                    <div key={comment.id} className="rounded-lg bg-gray-50 px-3 py-2">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium text-gray-600">
                                          {comment.users?.name || '사용자'} · {formatDate(comment.created_at)}
                                        </p>
                                        {canDeleteComment ? (
                                          <button
                                            type="button"
                                            onClick={() => void handleDeleteComment(comment.id)}
                                            className="text-xs font-medium text-red-500 hover:text-red-600"
                                          >
                                            삭제
                                          </button>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.comment}</p>
                                    </div>
                                  )
                                })}
                              </div>

                              {canParticipate ? (
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                  <input
                                    type="text"
                                    value={commentDrafts[item.id] ?? ''}
                                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                                    placeholder="질문이나 피드백을 입력하세요"
                                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleCreateComment(item.id)}
                                    disabled={createComment.isPending || !(commentDrafts[item.id] ?? '').trim()}
                                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    등록
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function normalizeText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function AgendaPdfAttachment({
  filePath,
  fileName,
  fileSize,
}: {
  filePath: string
  fileName: string | null
  fileSize: number | null
}) {
  const { data: pdfUrl, isLoading } = useMeetingAgendaPdfUrl(filePath)

  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-gray-700">{fileName || 'PDF 안건'}</span>
      {fileSize ? <span className="shrink-0 text-xs text-gray-400">{formatFileSize(fileSize)}</span> : null}
      {isLoading ? (
        <span className="shrink-0 text-xs text-gray-400">불러오는 중</span>
      ) : pdfUrl ? (
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-blue-600 hover:text-blue-700">
          열기
        </a>
      ) : (
        <span className="shrink-0 text-xs text-red-500">오류</span>
      )}
    </div>
  )
}

async function uploadAgendaPdf({
  meetingId,
  departmentId,
  file,
}: {
  meetingId: string
  departmentId: string
  file: File
}) {
  const filePath = `agenda/${meetingId}/${departmentId}/${Date.now()}-${sanitizeFileName(file.name)}`
  const { data, error } = await supabase.storage
    .from('meeting-pdfs')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) throw error

  return {
    path: data.path,
    name: file.name,
    size: file.size,
  }
}

function isValidPdfFile(file: File) {
  return file.size <= MAX_AGENDA_PDF_SIZE_BYTES && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildAgendaSections(
  departments: Department[],
  agendaItems: MeetingAgendaItemWithDetails[],
  meetingDepartmentId: string
) {
  const itemsByDepartment = new Map<string, MeetingAgendaItemWithDetails[]>()
  for (const item of agendaItems) {
    const current = itemsByDepartment.get(item.department_id) || []
    current.push(item)
    itemsByDepartment.set(item.department_id, current)
  }

  const visibleDepartmentIds = new Set<string>([
    meetingDepartmentId,
    ...agendaItems.map((item) => item.department_id),
    ...departments.map((department) => department.id),
  ])

  return departments
    .filter((department) => visibleDepartmentIds.has(department.id))
    .sort((first, second) => getDepartmentOrder(first, meetingDepartmentId) - getDepartmentOrder(second, meetingDepartmentId))
    .map((department) => ({
      department,
      label: getSectionLabel(department),
      items: itemsByDepartment.get(department.id) || [],
    }))
}

function getDepartmentOrder(department: Department, meetingDepartmentId: string) {
  if (department.id === meetingDepartmentId) return 0
  const codeOrder: Record<string, number> = {
    youth: 10,
    cu1: 20,
    cu2: 30,
    cu_worship: 40,
    leader: 50,
  }

  return codeOrder[department.code] ?? 100
}

function getSectionLabel(department: Department) {
  return SECTION_LABEL_BY_CODE[department.code] ?? `${department.name} 회의 안건`
}

function formatSuggestedDeadline(meetingDate: string) {
  const date = new Date(meetingDate)
  if (Number.isNaN(date.getTime())) return ''

  const previousDay = new Date(date)
  previousDay.setDate(previousDay.getDate() - 1)

  return `${previousDay.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })} 저녁 12시`
}
