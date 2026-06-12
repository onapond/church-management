'use client'

import { useState } from 'react'
import type { AccountingRecordWithDetails } from '@/types/database'
import { useDeleteAccountingRecords } from '@/queries/accounting'
import { useToastContext } from '@/providers/ToastProvider'

interface AccountingLedgerProps {
  records: AccountingRecordWithDetails[]
  onRecordDeleted: () => void
  canEdit: boolean
}

type LedgerRecord = AccountingRecordWithDetails & {
  calculatedBalance: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).getDate()
}

function formatAmount(amount: number) {
  return amount.toLocaleString('ko-KR')
}

export default function AccountingLedger({ records, onRecordDeleted, canEdit }: AccountingLedgerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const deleteRecordsMutation = useDeleteAccountingRecords()
  const toast = useToastContext()

  const recordsWithBalance = records.reduce<LedgerRecord[]>((acc, record) => {
    const previousBalance = acc.length > 0 ? acc[acc.length - 1].calculatedBalance : 0
    const calculatedBalance = previousBalance + record.income_amount - record.expense_amount
    acc.push({ ...record, calculatedBalance })
    return acc
  }, [])

  const totalIncome = records.reduce((sum, record) => sum + (record.income_amount || 0), 0)
  const totalExpense = records.reduce((sum, record) => sum + (record.expense_amount || 0), 0)
  const isAllSelected = records.length > 0 && selectedIds.size === records.length
  const isSomeSelected = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(records.map((record) => record.id)))
  }

  function removeSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleMutationError(error: unknown) {
    console.error('Failed to delete accounting records:', error)
    toast.error('삭제 중 오류가 발생했습니다.')
  }

  function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setDeletingId(id)
    deleteRecordsMutation.mutate([id], {
      onSuccess: () => {
        removeSelection(id)
        setDeletingId(null)
        onRecordDeleted()
      },
      onError: (error) => {
        setDeletingId(null)
        handleMutationError(error)
      },
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) return

    deleteRecordsMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set())
        onRecordDeleted()
      },
      onError: handleMutationError,
    })
  }

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-gray-500">해당 기간에 회계 내역이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {canEdit && isSomeSelected ? (
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-3">
          <span className="text-sm text-red-700">{selectedIds.size}개 항목 선택됨</span>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={deleteRecordsMutation.isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteRecordsMutation.isPending ? '삭제 중...' : '선택 삭제'}
          </button>
        </div>
      ) : null}

      <div className="divide-y divide-gray-100 md:hidden">
        {canEdit ? (
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">전체 선택</span>
          </div>
        ) : null}

        {recordsWithBalance.map((record) => (
          <div key={record.id} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              {canEdit ? (
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => toggleSelect(record.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-gray-500">{formatDate(record.record_date)}일</span>
                  <span className="truncate text-sm font-medium text-gray-900">{record.description}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{record.category}</span>
                  {record.notes ? (
                    <span className="truncate text-xs text-gray-400">{record.notes}</span>
                  ) : null}
                </div>
              </div>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => handleDelete(record.id)}
                  disabled={deletingId === record.id}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === record.id ? '...' : '삭제'}
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <span className="text-gray-500">수입</span>
                <p className={`font-medium ${record.income_amount > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                  {record.income_amount > 0 ? formatAmount(record.income_amount) : '-'}
                </p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">지출</span>
                <p className={`font-medium ${record.expense_amount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                  {record.expense_amount > 0 ? formatAmount(record.expense_amount) : '-'}
                </p>
              </div>
              <div className="text-center">
                <span className="text-gray-500">잔액</span>
                <p className="font-medium text-gray-900">{formatAmount(record.calculatedBalance)}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-gray-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <span className="text-xs text-gray-500">총 수입</span>
              <p className="font-semibold text-blue-600">{formatAmount(totalIncome)}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500">총 지출</span>
              <p className="font-semibold text-red-600">{formatAmount(totalExpense)}</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500">최종 잔액</span>
              <p className="font-semibold text-gray-900">{formatAmount(totalIncome - totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {canEdit ? (
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              ) : null}
              <th className="w-16 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">일</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">적요</th>
              <th className="w-28 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">수입금액</th>
              <th className="w-28 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">지출금액</th>
              <th className="w-32 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">잔액</th>
              <th className="w-24 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">구분</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">비고</th>
              {canEdit ? (
                <th className="w-20 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">작업</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {recordsWithBalance.map((record) => (
              <tr key={record.id} className={selectedIds.has(record.id) ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'}>
                {canEdit ? (
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                ) : null}
                <td className="px-4 py-3 text-center text-sm text-gray-900">{formatDate(record.record_date)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{record.description}</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-blue-600">
                  {record.income_amount > 0 ? formatAmount(record.income_amount) : ''}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                  {record.expense_amount > 0 ? formatAmount(record.expense_amount) : ''}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                  {formatAmount(record.calculatedBalance)}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">{record.category}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{record.notes || ''}</td>
                {canEdit ? (
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      disabled={deletingId === record.id}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deletingId === record.id ? '...' : '삭제'}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-4 py-3 text-center text-sm text-gray-900" colSpan={canEdit ? 3 : 2}>
                합계
              </td>
              <td className="px-4 py-3 text-right text-sm text-blue-600">{formatAmount(totalIncome)}</td>
              <td className="px-4 py-3 text-right text-sm text-red-600">{formatAmount(totalExpense)}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">{formatAmount(totalIncome - totalExpense)}</td>
              <td colSpan={canEdit ? 3 : 2} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
