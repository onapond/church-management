'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateString } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useAccountingRecordsByMonth } from '@/queries/accounting'
import { canAccessAllDepartments } from '@/lib/permissions'
import { useToastContext } from '@/providers/ToastProvider'
import AccountingImport from '@/components/accounting/AccountingImport'
import AccountingLedger from '@/components/accounting/AccountingLedger'
import AccountingSummary from '@/components/accounting/AccountingSummary'
import { exportAccountingToExcel, type AccountingImportRow } from '@/lib/excel'

type BalanceRecord = {
  income_amount: number | null
  expense_amount: number | null
}

function getYearOptions() {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, index) => currentYear - index)
}

function getMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => index + 1)
}

export default function AccountingClient() {
  const { user } = useAuth()
  const toast = useToastContext()
  const queryClient = useQueryClient()
  const { data: allDepartments = [], isLoading: departmentsLoading } = useDepartments()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const departments = useMemo(() => {
    if (!user) return []
    if (canAccessAllDepartments(user.role)) return allDepartments

    const accessibleDepartmentIds = user.user_departments?.map((department) => department.department_id) || []
    return allDepartments.filter((department) => accessibleDepartmentIds.includes(department.id))
  }, [allDepartments, user])

  const effectiveDepartmentId = selectedDepartmentId || departments[0]?.id || ''
  const canEdit = canAccessAllDepartments(user?.role || '')

  const { data: records = [], isLoading: recordsLoading } = useAccountingRecordsByMonth(
    effectiveDepartmentId,
    selectedYear,
    selectedMonth,
  )

  const yearOptions = getYearOptions()
  const monthOptions = getMonthOptions()

  function invalidateCurrentMonth() {
    queryClient.invalidateQueries({
      queryKey: ['accounting', effectiveDepartmentId, selectedYear, selectedMonth],
    })
  }

  async function handleExport() {
    const selectedDepartment = departments.find((department) => department.id === effectiveDepartmentId)
    const exportRows = records.map((record) => ({
      day: new Date(record.record_date).getDate(),
      description: record.description,
      incomeAmount: record.income_amount > 0 ? record.income_amount.toLocaleString('ko-KR') : '',
      expenseAmount: record.expense_amount > 0 ? record.expense_amount.toLocaleString('ko-KR') : '',
      balance: record.balance.toLocaleString('ko-KR'),
      category: record.category,
      notes: record.notes || '',
    }))

    await exportAccountingToExcel(
      exportRows,
      selectedDepartment?.name || '회계',
      selectedYear,
      selectedMonth,
    )
  }

  async function handleImport(rows: AccountingImportRow[]) {
    if (!effectiveDepartmentId || !user?.id) return

    setIsImporting(true)
    const supabase = createClient()

    try {
      const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
      const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
      const previousMonthEndDate = toLocalDateString(new Date(previousYear, previousMonth, 0))

      const { data: previousRecords, error: previousRecordsError } = await supabase
        .from('accounting_records')
        .select('income_amount, expense_amount')
        .eq('department_id', effectiveDepartmentId)
        .lte('record_date', previousMonthEndDate)
        .order('record_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (previousRecordsError) {
        throw previousRecordsError
      }

      let runningBalance = ((previousRecords || []) as BalanceRecord[]).reduce(
        (sum, record) => sum + (record.income_amount || 0) - (record.expense_amount || 0),
        0,
      )

      const sortedRows = [...rows].sort((left, right) => left.day - right.day)

      for (const row of sortedRows) {
        const recordDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
        runningBalance += row.incomeAmount - row.expenseAmount

        const { error } = await supabase.from('accounting_records').insert({
          department_id: effectiveDepartmentId,
          record_date: recordDate,
          description: row.description,
          income_amount: row.incomeAmount,
          expense_amount: row.expenseAmount,
          balance: runningBalance,
          category: row.category,
          notes: row.notes || null,
          created_by: user.id,
        })

        if (error) {
          throw error
        }
      }

      invalidateCurrentMonth()
      setShowImportModal(false)
      toast.success(`${rows.length}건의 데이터를 가져왔습니다.`)
    } catch (error) {
      console.error('Failed to import accounting rows:', error)
      toast.error('회계 데이터 가져오기 중 오류가 발생했습니다.')
    } finally {
      setIsImporting(false)
    }
  }

  if (!user || departmentsLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 rounded bg-gray-200" />
          <div className="h-12 rounded-xl bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회계 관리</h1>
          <p className="mt-1 text-sm text-gray-500">회계 장부와 지출결의서를 관리합니다.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              disabled={isImporting}
              className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              엑셀 가져오기
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            내보내기
          </button>

          <Link
            href="/accounting/expense"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            지출결의서 목록
          </Link>
          <Link
            href="/accounting/expense/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            지출결의서 작성
          </Link>
          <Link
            href="/accounting/ledger/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            장부 입력
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">부서</label>
            <select
              value={effectiveDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">연도</label>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">월</label>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </div>

          {recordsLoading ? (
            <div className="flex items-end pb-2">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : null}
        </div>
      </div>

      <AccountingSummary
        records={records}
        year={selectedYear}
        month={selectedMonth}
        departmentId={effectiveDepartmentId}
      />

      <div className="mt-6">
        <AccountingLedger
          records={records}
          onRecordDeleted={invalidateCurrentMonth}
          canEdit={canEdit}
        />
      </div>

      {showImportModal ? (
        <AccountingImport
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      ) : null}
    </div>
  )
}
