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
      toast.success(`"${newCellName.trim()}" ???異붽??섏뿀?듬땲??`)
    } catch {
      toast.error('? 異붽????ㅽ뙣?덉뒿?덈떎.')
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
      toast.success('? ?대쫫???섏젙?섏뿀?듬땲??')
    } catch {
      toast.error('?섏젙???ㅽ뙣?덉뒿?덈떎.')
    }
  }

  const toggleActive = async (cell: Cell) => {
    try {
      await updateCell.mutateAsync({ id: cell.id, is_active: !cell.is_active })
      toast.success(cell.is_active ? '???鍮꾪솢?깊솕?섏뿀?듬땲??' : '????쒖꽦?붾릺?덉뒿?덈떎.')
    } catch {
      toast.error('?곹깭 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎.')
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
      toast.error('?쒖꽌 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎.')
    }
  }

  const selectedDept = departments.find((department) => department.id === selectedDeptId)

  if (!user || !isAdmin(user.role)) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-yellow-800">?묎렐 沅뚰븳 ?놁쓬</h3>
          <p className="text-sm text-yellow-600">愿由ъ옄留??묎렐?????덉뒿?덈떎.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">? 愿由?</h1>
        <p className="mt-1 text-sm text-gray-500">遺?쒕퀎 ???異붽?, ?섏젙, 愿由ы빀?덈떎.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">遺???좏깮</label>
        <select
          value={selectedDeptId}
          onChange={(event) => setSelectedDeptId(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 md:w-72"
        >
          <option value="">遺?쒕? ?좏깮?섏꽭??</option>
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
                {selectedDept?.name} ? 紐⑸줉
                <span className="ml-2 text-sm font-normal text-gray-500">({activeCells.length}媛??쒖꽦)</span>
              </h2>
            </div>
          </div>

          {cellsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
              <span className="ml-2 text-sm text-gray-500">濡쒕뵫 以?..</span>
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
                            ???
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            痍⑥냼
                          </button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 cursor-pointer text-sm text-gray-900 hover:text-blue-600"
                          onClick={() => startEdit(cell)}
                          title="?대┃?섏뿬 ?대쫫 ?섏젙"
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
                            title="?꾨줈"
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
                            title="?꾨옒濡?"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(cell)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="鍮꾪솢?깊솕"
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
                  ?깅줉??????놁뒿?덈떎. ?꾨옒?먯꽌 異붽??댁＜?몄슂.
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
                    placeholder="??? ?대쫫 (?? 7?)"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 md:max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddCell()}
                    disabled={!newCellName.trim() || createCell.isPending}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createCell.isPending ? '異붽? 以?..' : '異붽?'}
                  </button>
                </div>
              </div>

              {inactiveCells.length > 0 ? (
                <div className="border-t border-gray-100">
                  <div className="bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500">鍮꾪솢??? ({inactiveCells.length}媛?)</p>
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
                          ?쒖꽦??
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
            <p className="mb-0.5 font-medium md:mb-1">? 愿由??덈궡</p>
            <ul className="space-y-0.5 text-blue-600">
              <li>? ?대쫫???대┃?섎㈃ ?섏젙?????덉뒿?덈떎.</li>
              <li>鍮꾪솢?깊솕???? ?꾪꽣???쒖떆?섏? ?딆?留??곗씠?곕뒗 ?좎??⑸땲??</li>
              <li>?쒖꽌瑜?蹂寃쏀븯硫??꾪꽣 紐⑸줉 ?쒖꽌??諛섏쁺?⑸땲??</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
