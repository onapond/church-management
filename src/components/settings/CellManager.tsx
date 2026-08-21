'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments, useAllCells, useCreateCell, useUpdateCell, useReorderCells } from '@/queries/departments'
import { isAdmin } from '@/lib/permissions'
import { useToastContext } from '@/providers/ToastProvider'
import type { Cell } from '@/types/database'

export default function CellManager() {
  const { user } = useAuth()
  const toast = useToastContext()
  const { data: departments = [] } = useDepartments()

  const [selectedDeptId, setSelectedDeptId] = useState('')
  const { data: cells = [], isLoading: cellsLoading } = useAllCells(selectedDeptId || undefined)

  const createCell = useCreateCell()
  const updateCell = useUpdateCell()
  const reorderCells = useReorderCells()

  const [newCellName, setNewCellName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const activeCells = cells.filter((cell) => cell.is_active)
  const inactiveCells = cells.filter((cell) => !cell.is_active)

  const handleAddCell = async () => {
    if (!newCellName.trim() || !selectedDeptId) return

    try {
      const maxOrder = cells.length > 0 ? Math.max(...cells.map((cell) => cell.display_order)) : 0
      await createCell.mutateAsync({
        department_id: selectedDeptId,
        name: newCellName.trim(),
        display_order: maxOrder + 1,
      })
      setNewCellName('')
      toast.success(`"${newCellName.trim()}" 셀이 추가되었습니다.`)
    } catch {
      toast.error('셀 추가에 실패했습니다.')
    }
  }

  const startEdit = useCallback((cell: Cell) => {
    setEditingId(cell.id)
    setEditingName(cell.name)
  }, [])

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return

    try {
      await updateCell.mutateAsync({ id: editingId, name: editingName.trim() })
      setEditingId(null)
      toast.success('셀 이름이 수정되었습니다.')
    } catch {
      toast.error('수정에 실패했습니다.')
    }
  }

  const toggleActive = async (cell: Cell) => {
    try {
      await updateCell.mutateAsync({ id: cell.id, is_active: !cell.is_active })
      toast.success(cell.is_active ? '셀이 비활성화되었습니다.' : '셀이 활성화되었습니다.')
    } catch {
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  const moveCell = async (cell: Cell, direction: 'up' | 'down') => {
    const sorted = [...activeCells].sort((a, b) => a.display_order - b.display_order)
    const currentIndex = sorted.findIndex((currentCell) => currentCell.id === cell.id)

    if (direction === 'up' && currentIndex <= 0) return
    if (direction === 'down' && currentIndex >= sorted.length - 1) return

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const updates = [
      { id: sorted[currentIndex].id, display_order: sorted[swapIndex].display_order },
      { id: sorted[swapIndex].id, display_order: sorted[currentIndex].display_order },
    ]

    try {
      await reorderCells.mutateAsync(updates)
    } catch {
      toast.error('순서 변경에 실패했습니다.')
    }
  }

  const selectedDept = departments.find((department) => department.id === selectedDeptId)

  if (!user || !isAdmin(user.role)) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-yellow-800">접근 권한 없음</h3>
          <p className="text-sm text-yellow-600">관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">셀 관리</h1>
        <p className="mt-1 text-sm text-gray-500">부서별 셀을 추가, 수정, 관리합니다.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">부서 선택</label>
        <select
          value={selectedDeptId}
          onChange={(event) => setSelectedDeptId(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 md:w-72"
        >
          <option value="">부서를 선택하세요</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name} ({department.code})
            </option>
          ))}
        </select>
      </div>

      {selectedDeptId ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {selectedDept?.name} 셀 목록
                <span className="ml-2 text-sm font-normal text-gray-500">({activeCells.length}개 활성)</span>
              </h2>
            </div>
          </div>

          {cellsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
              <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {activeCells
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((cell, index) => (
                    <div key={cell.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                        {index + 1}
                      </span>

                      {editingId === cell.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') void saveEdit()
                              if (event.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 rounded-lg border border-blue-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 cursor-pointer text-sm text-gray-900 hover:text-blue-600"
                          onClick={() => startEdit(cell)}
                          title="클릭하여 이름 수정"
                        >
                          {cell.name}
                        </span>
                      )}

                      {editingId !== cell.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void moveCell(cell, 'up')}
                            disabled={index === 0}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                            title="위로"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveCell(cell, 'down')}
                            disabled={index === activeCells.length - 1}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                            title="아래로"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(cell)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="비활성화"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>

              {activeCells.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  등록된 셀이 없습니다. 아래에서 추가해주세요.
                </div>
              ) : null}

              <div className="border-t border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={newCellName}
                    onChange={(event) => setNewCellName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleAddCell()
                    }}
                    placeholder="새 셀 이름 (예: 7셀)"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 md:max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddCell()}
                    disabled={!newCellName.trim() || createCell.isPending}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createCell.isPending ? '추가 중...' : '추가'}
                  </button>
                </div>
              </div>

              {inactiveCells.length > 0 ? (
                <div className="border-t border-gray-100">
                  <div className="bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500">비활성 셀 ({inactiveCells.length}개)</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {inactiveCells.map((cell) => (
                      <div key={cell.id} className="flex items-center gap-3 bg-gray-50/50 px-4 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-xs font-bold text-gray-400">
                          -
                        </span>
                        <span className="flex-1 text-sm text-gray-400 line-through">{cell.name}</span>
                        <button
                          type="button"
                          onClick={() => void toggleActive(cell)}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          활성화
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 md:p-4">
        <div className="flex gap-2 md:gap-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800 md:text-sm">
            <p className="mb-0.5 font-medium md:mb-1">셀 관리 안내</p>
            <ul className="space-y-0.5 text-blue-600">
              <li>셀 이름을 클릭하면 수정할 수 있습니다.</li>
              <li>비활성화된 셀은 필터에 표시되지 않지만 데이터는 유지됩니다.</li>
              <li>순서를 변경하면 필터 목록 순서에 반영됩니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
