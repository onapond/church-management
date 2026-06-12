'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
import { canAccessAllDepartments, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type ExpenseCategory } from '@/types/database'
import { useToastContext } from '@/providers/ToastProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'

type RecordType = 'income' | 'expense'

type BalanceRecord = {
  income_amount: number | null
  expense_amount: number | null
}

interface FormState {
  department_id: string
  record_date: string
  description: string
  income_amount: number
  expense_amount: number
  category: ExpenseCategory | ''
  notes: string
}

const INITIAL_FORM: FormState = {
  department_id: '',
  record_date: toLocalDateString(new Date()),
  description: '',
  income_amount: 0,
  expense_amount: 0,
  category: '',
  notes: '',
}

export default function AccountingRecordForm() {
  const toast = useToastContext()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: allDepartments = [] } = useDepartments()
  const [loading, setLoading] = useState(false)
  const [recordType, setRecordType] = useState<RecordType>('income')
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)

  const isAllAccess = canAccessAllDepartments(user?.role || '')
  const departments = useMemo(() => {
    if (isAllAccess) return allDepartments
    return allDepartments.filter((department) =>
      user?.user_departments?.some((userDepartment) => userDepartment.departments?.id === department.id),
    )
  }, [allDepartments, isAllAccess, user])

  const selectedDepartmentId = formData.department_id || departments[0]?.id || ''
  const categoryOptions = recordType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function switchRecordType(nextType: RecordType) {
    setRecordType(nextType)
    setFormData((prev) => ({
      ...prev,
      category: '',
      income_amount: 0,
      expense_amount: 0,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedDepartmentId || !formData.description || !formData.category) {
      toast.warning('필수 항목을 모두 입력해 주세요.')
      return
    }

    const amount = recordType === 'income' ? formData.income_amount : formData.expense_amount
    if (amount <= 0) {
      toast.warning('금액을 입력해 주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { data: previousRecords, error: balanceError } = await supabase
        .from('accounting_records')
        .select('income_amount, expense_amount')
        .eq('department_id', selectedDepartmentId)
        .lte('record_date', formData.record_date)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (balanceError) {
        throw balanceError
      }

      const currentBalance = ((previousRecords || []) as BalanceRecord[]).reduce(
        (sum, record) => sum + (record.income_amount || 0) - (record.expense_amount || 0),
        0,
      )

      const nextBalance = recordType === 'income'
        ? currentBalance + formData.income_amount
        : currentBalance - formData.expense_amount

      const { error } = await supabase
        .from('accounting_records')
        .insert({
          department_id: selectedDepartmentId,
          record_date: formData.record_date,
          description: formData.description,
          income_amount: recordType === 'income' ? formData.income_amount : 0,
          expense_amount: recordType === 'expense' ? formData.expense_amount : 0,
          balance: nextBalance,
          category: formData.category,
          notes: formData.notes,
          created_by: user?.id,
        })

      if (error) {
        throw error
      }

      toast.success('회계 기록이 저장되었습니다.')
      await queryClient.invalidateQueries({ queryKey: ['accounting'] })
      router.push('/accounting')
    } catch (error) {
      console.error('Failed to save accounting record:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">유형</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={recordType === 'income'}
                onChange={() => switchRecordType('income')}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-blue-600">수입</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={recordType === 'expense'}
                onChange={() => switchRecordType('expense')}
                className="text-red-600"
              />
              <span className="text-sm font-medium text-red-600">지출</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">부서 *</label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">날짜 *</label>
            <input
              type="date"
              value={formData.record_date}
              onChange={(event) => updateForm('record_date', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">적요 *</label>
          <input
            type="text"
            value={formData.description}
            onChange={(event) => updateForm('description', event.target.value)}
            placeholder="예: 1분기 운영비"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {recordType === 'income' ? '수입 금액' : '지출 금액'} *
            </label>
            <div className="relative">
              <input
                type="number"
                value={recordType === 'income' ? formData.income_amount : formData.expense_amount}
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10) || 0
                  if (recordType === 'income') updateForm('income_amount', value)
                  else updateForm('expense_amount', value)
                }}
                min="0"
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">구분 *</label>
            <select
              value={formData.category}
              onChange={(event) => updateForm('category', event.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">비고</label>
          <textarea
            value={formData.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            placeholder="추가 메모"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
