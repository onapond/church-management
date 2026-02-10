'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { useDepartments } from '@/queries/departments'
import { useExpenseRequests, useDeleteExpenseRequest } from '@/queries/accounting'
import { canAccessAllDepartments } from '@/types/database'
import { useToastContext } from '@/providers/ToastProvider'

export default function ExpenseRequestList() {
  const toast = useToastContext()
  const { user } = useAuth()
  const { data: allDepts = [], isLoading: deptsLoading } = useDepartments()

  const canAccessAll = canAccessAllDepartments(user?.role || '')

  const departments = useMemo(() => {
    if (canAccessAll) return allDepts
    const userDeptIds = user?.user_departments?.map(ud => ud.departments?.id) || []
    return allDepts.filter(d => userDeptIds.includes(d.id))
  }, [canAccessAll, allDepts, user])

  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)

  // 부서 기본값 설정
  const deptId = selectedDeptId || departments[0]?.id || ''

  // TanStack Query로 지출결의서 조회
  const { data: requests = [], isLoading: requestsLoading } = useExpenseRequests(deptId, selectedYear, selectedMonth)
  const deleteMutation = useDeleteExpenseRequest()

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까? 연결된 회계장부 내역도 함께 삭제됩니다.')) return

    try {
      await deleteMutation.mutateAsync(id)
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  if (!user || deptsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select
              value={deptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 목록 */}
      {requestsLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">해당 기간에 지출결의서가 없습니다.</p>
          <Link
            href="/accounting/expense/new"
            className="inline-block mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            지출결의서 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatDate(request.request_date)}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-sm">
                    {(request.departments as { name: string } | undefined)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-600">
                    {formatAmount(request.total_amount)}원
                  </span>
                  {canAccessAll && (
                    <button
                      onClick={() => handleDelete(request.id)}
                      disabled={deleteMutation.isPending}
                      className="ml-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? '...' : '삭제'}
                    </button>
                  )}
                </div>
              </div>

              {/* 항목 요약 */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {(request.expense_items || []).slice(0, 4).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate">{item.description}</span>
                      <span className="text-gray-900 font-medium ml-2">{formatAmount(item.amount)}원</span>
                    </div>
                  ))}
                  {(request.expense_items || []).length > 4 && (
                    <div className="text-sm text-gray-500">
                      외 {request.expense_items.length - 4}건
                    </div>
                  )}
                </div>
              </div>

              {/* 수령인 및 비고 */}
              {(request.recipient_name || request.notes) && (
                <div className="border-t border-gray-100 pt-3 mt-3 text-sm text-gray-500">
                  {request.recipient_name && (
                    <span>수령인: {request.recipient_name}</span>
                  )}
                  {request.recipient_name && request.notes && (
                    <span className="mx-2">·</span>
                  )}
                  {request.notes && (
                    <span>{request.notes}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
