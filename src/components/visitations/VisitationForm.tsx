'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useMembers } from '@/queries/members'
import { useCreateVisitation, useUpdateVisitation, type VisitationWithDetails } from '@/queries/visitations'
import { useToast } from '@/hooks/useToast'
import { VISITATION_REASON_LABELS } from '@/lib/constants'
import type { VisitationReason } from '@/types/database'

interface VisitationFormProps {
  visitation?: VisitationWithDetails | null
  defaultDate?: string
  onClose: () => void
}

function VisitationFormInner({ visitation, defaultDate, onClose }: VisitationFormProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { data: departments = [] } = useDepartments()
  const createVisitation = useCreateVisitation()
  const updateVisitation = useUpdateVisitation()

  const isEdit = !!visitation

  const primaryDeptId = user?.user_departments?.find(ud => ud)?.department_id || ''
  const [departmentId, setDepartmentId] = useState(visitation?.department_id || primaryDeptId)
  const [memberName, setMemberName] = useState(visitation?.member_name || '')
  const [memberId, setMemberId] = useState(visitation?.member_id || '')
  const [visitDate, setVisitDate] = useState(visitation?.visit_date || defaultDate || '')
  const [visitTime, setVisitTime] = useState(visitation?.visit_time?.slice(0, 5) || '')
  const [visitor, setVisitor] = useState(visitation?.visitor || user?.name || '')
  const [reason, setReason] = useState<VisitationReason>(visitation?.reason || 'regular')
  const [notes, setNotes] = useState(visitation?.notes || '')
  const [showMemberSearch, setShowMemberSearch] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  // 교인 목록 (부서 필터링)
  const { data: members = [] } = useMembers(departmentId ? [departmentId] : undefined)

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 20)
    return members.filter(m => m.name.includes(memberSearch)).slice(0, 20)
  }, [members, memberSearch])

  const handleMemberSelect = useCallback((m: { id: string; name: string }) => {
    setMemberId(m.id)
    setMemberName(m.name)
    setShowMemberSearch(false)
    setMemberSearch('')
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberName.trim() || !visitDate || !visitor.trim()) {
      addToast('필수 항목을 입력해주세요.', 'error')
      return
    }
    if (!user) return

    try {
      if (isEdit && visitation) {
        await updateVisitation.mutateAsync({
          id: visitation.id,
          member_id: memberId || null,
          member_name: memberName.trim(),
          department_id: departmentId || null,
          visit_date: visitDate,
          visit_time: visitTime || null,
          visitor: visitor.trim(),
          reason,
          notes: notes.trim() || null,
        })
        addToast('심방 일정이 수정되었습니다.', 'success')
      } else {
        await createVisitation.mutateAsync({
          member_id: memberId || null,
          member_name: memberName.trim(),
          department_id: departmentId || null,
          visit_date: visitDate,
          visit_time: visitTime || null,
          visitor: visitor.trim(),
          reason,
          notes: notes.trim() || null,
          created_by: user.id,
        })
        addToast('심방 일정이 등록되었습니다.', 'success')
      }
      onClose()
    } catch {
      addToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }, [memberName, visitDate, visitor, user, isEdit, visitation, memberId, departmentId, visitTime, reason, notes, onClose, createVisitation, updateVisitation, addToast])

  const isPending = createVisitation.isPending || updateVisitation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? '심방 일정 수정' : '심방 일정 등록'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 부서 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={departmentId}
              onChange={e => { 
                const newDeptId = e.target.value
                setDepartmentId(newDeptId)
                // 만약 선택된 교인이 있고, 새로운 부서가 '전체'가 아니며, 
                // 교인의 부서와 일치하지 않는다면 선택 해제 (간단하게 구현하기 위해 id가 있을 때만 체크)
                if (memberId && newDeptId && members.find(m => m.id === memberId)?.member_departments?.[0]?.department_id !== newDeptId) {
                  setMemberId('')
                  setMemberName('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 심방 대상자 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              심방 대상자 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={memberName}
                onChange={e => { setMemberName(e.target.value); setMemberId('') }}
                placeholder="이름 입력 또는 교인 검색"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowMemberSearch(!showMemberSearch)}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
              >
                교인 검색
              </button>
            </div>
            {showMemberSearch && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="이름으로 검색..."
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                    autoFocus
                  />
                </div>
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMemberSelect(m)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                  >
                    {m.name}
                    {m.member_departments?.[0]?.departments?.name && (
                      <span className="text-gray-400 ml-2">{m.member_departments[0].departments.name}</span>
                    )}
                  </button>
                ))}
                {filteredMembers.length === 0 && (
                  <p className="px-4 py-2 text-sm text-gray-400">검색 결과 없음</p>
                )}
              </div>
            )}
          </div>

          {/* 날짜 + 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
              <input
                type="time"
                value={visitTime}
                onChange={e => setVisitTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 심방자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              심방자 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={visitor}
              onChange={e => setVisitor(e.target.value)}
              placeholder="방문하는 분의 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 사유 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(VISITATION_REASON_LABELS) as [VisitationReason, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReason(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    reason === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="심방 관련 메모..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const VisitationForm = memo(VisitationFormInner)
export default VisitationForm
