'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
import { canAccessAllDepartments, EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/database'
import { useToastContext } from '@/providers/ToastProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'

type BalanceRecord = {
  income_amount: number | null
  expense_amount: number | null
}

interface ExpenseItemInput {
  id: string
  item_date: string
  description: string
  category: ExpenseCategory | ''
  amount: number
  notes: string
}

interface RequestFormState {
  department_id: string
  request_date: string
  recipient_name: string
  notes: string
}

const INITIAL_REQUEST_FORM: RequestFormState = {
  department_id: '',
  request_date: toLocalDateString(new Date()),
  recipient_name: '',
  notes: '',
}

function createExpenseItem(): ExpenseItemInput {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    item_date: toLocalDateString(new Date()),
    description: '',
    category: '',
    amount: 0,
    notes: '',
  }
}

export default function ExpenseRequestForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToastContext()
  const { user } = useAuth()
  const { data: allDepartments = [] } = useDepartments()
  const [loading, setLoading] = useState(false)
  const [addToLedger, setAddToLedger] = useState(true)
  const [formData, setFormData] = useState<RequestFormState>(INITIAL_REQUEST_FORM)
  const [items, setItems] = useState<ExpenseItemInput[]>([createExpenseItem()])

  const isAllAccess = canAccessAllDepartments(user?.role || '')
  const departments = useMemo(() => {
    if (isAllAccess) return allDepartments
    return allDepartments.filter((department) =>
      user?.user_departments?.some((userDepartment) => userDepartment.departments?.id === department.id),
    )
  }, [allDepartments, isAllAccess, user])

  const selectedDepartmentId = formData.department_id || departments[0]?.id || ''
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  function updateForm<K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function addItem() {
    setItems((prev) => [...prev, createExpenseItem()])
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      toast.warning('최소 1개의 항목이 필요합니다.')
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function updateItem<K extends keyof ExpenseItemInput>(id: string, field: K, value: ExpenseItemInput[K]) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedDepartmentId) {
      toast.warning('부서를 선택해 주세요.')
      return
    }

    const validItems = items.filter((item) => item.description && item.category && item.amount > 0)
    if (validItems.length === 0) {
      toast.warning('최소 1개의 유효한 항목을 입력해 주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { data: expenseRequest, error: requestError } = await supabase
        .from('expense_requests')
        .insert({
          department_id: selectedDepartmentId,
          requester_id: user?.id,
          request_date: formData.request_date,
          total_amount: totalAmount,
          recipient_name: formData.recipient_name,
          notes: formData.notes,
        })
        .select()
        .single()

      if (requestError) {
        throw requestError
      }

      const expenseItems = validItems.map((item, index) => ({
        expense_request_id: expenseRequest.id,
        item_date: item.item_date,
        description: item.description,
        category: item.category,
        amount: item.amount,
        notes: item.notes,
        order_index: index,
      }))

      const { error: itemsError } = await supabase
        .from('expense_items')
        .insert(expenseItems)

      if (itemsError) {
        throw itemsError
      }

      if (addToLedger) {
        const { data: previousRecords, error: previousRecordsError } = await supabase
          .from('accounting_records')
          .select('income_amount, expense_amount')
          .eq('department_id', selectedDepartmentId)
          .lte('record_date', formData.request_date)
          .order('record_date', { ascending: true })
          .order('created_at', { ascending: true })

        if (previousRecordsError) {
          throw previousRecordsError
        }

        let runningBalance = ((previousRecords || []) as BalanceRecord[]).reduce(
          (sum, record) => sum + (record.income_amount || 0) - (record.expense_amount || 0),
          0,
        )

        for (const item of validItems) {
          runningBalance -= item.amount

          const { error: ledgerError } = await supabase
            .from('accounting_records')
            .insert({
              department_id: selectedDepartmentId,
              record_date: item.item_date,
              description: item.description,
              income_amount: 0,
              expense_amount: item.amount,
              balance: runningBalance,
              category: item.category,
              notes: item.notes,
              expense_request_id: expenseRequest.id,
              created_by: user?.id,
            })

          if (ledgerError) {
            throw ledgerError
          }
        }
      }

      toast.success('지출결의서가 저장되었습니다.')
      await queryClient.invalidateQueries({ queryKey: ['expense-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['accounting'] })
      router.push('/accounting/expense')
    } catch (error) {
      console.error('Failed to save expense request:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">기본 정보</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">청구부서 *</label>
            <select
              value={selectedDepartmentId}
              onChange={(event) => updateForm('department_id', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">청구일자 *</label>
            <input
              type="date"
              value={formData.request_date}
              onChange={(event) => updateForm('request_date', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">수령인</label>
            <input
              type="text"
              value={formData.recipient_name}
              onChange={(event) => updateForm('recipient_name', event.target.value)}
              placeholder="수령인 이름"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">지출 항목</h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            + 항목 추가
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">항목 {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">날짜</label>
                  <input
                    type="date"
                    value={item.item_date}
                    onChange={(event) => updateItem(item.id, 'item_date', event.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">내용 *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                    placeholder="지출 내용"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">구분 *</label>
                  <select
                    value={item.category}
                    onChange={(event) => updateItem(item.id, 'category', event.target.value as ExpenseCategory)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택</option>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">금액 *</label>
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(event) => updateItem(item.id, 'amount', parseInt(event.target.value, 10) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs text-gray-500">비고</label>
                <input
                  type="text"
                  value={item.notes}
                  onChange={(event) => updateItem(item.id, 'notes', event.target.value)}
                  placeholder="메모"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-lg font-semibold text-gray-900">총 합계</span>
          <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString('ko-KR')}원</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">추가 정보</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">비고</label>
          <textarea
            value={formData.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            placeholder="추가 메모 사항"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={addToLedger}
              onChange={(event) => setAddToLedger(event.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">회계장부에 자동 반영</span>
          </label>
          <p className="ml-6 mt-1 text-xs text-gray-500">
            체크하면 저장된 각 항목이 회계장부 지출 내역으로 함께 등록됩니다.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '지출결의서 저장'}
        </button>
      </div>
    </form>
  )
}
