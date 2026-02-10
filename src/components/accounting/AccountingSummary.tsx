'use client'

import { AccountingRecordWithDetails } from '@/types/database'
import { usePreviousBalance } from '@/queries/accounting'

interface AccountingSummaryProps {
  records: AccountingRecordWithDetails[]
  year: number
  month: number
  departmentId: string
}

export default function AccountingSummary({ records, year, month, departmentId }: AccountingSummaryProps) {
  const { data: previousBalance = 0, isLoading } = usePreviousBalance(departmentId, year, month)

  const totalIncome = records.reduce((sum, r) => sum + (r.income_amount || 0), 0)
  const totalExpense = records.reduce((sum, r) => sum + (r.expense_amount || 0), 0)
  const currentBalance = previousBalance + totalIncome - totalExpense

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">전월 이월금</p>
        <p className="text-xl font-bold text-gray-900">{formatAmount(previousBalance)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">{month}월 수입</p>
        <p className="text-xl font-bold text-blue-600">+{formatAmount(totalIncome)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">{month}월 지출</p>
        <p className="text-xl font-bold text-red-600">-{formatAmount(totalExpense)}원</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-500 mb-1">현재 잔액</p>
        <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatAmount(currentBalance)}원
        </p>
      </div>
    </div>
  )
}
