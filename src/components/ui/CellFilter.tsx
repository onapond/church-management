'use client'

import { memo } from 'react'
import { useCells } from '@/queries/departments'
import { CU1_DEPARTMENT_CODE } from '@/lib/constants'

interface DeptWithCode {
  id: string
  name: string
  code?: string
}

interface CellFilterProps {
  departments: DeptWithCode[]
  selectedDeptId: string
  selectedCellId: string
  onCellChange: (cellId: string) => void
}

const CellFilter = memo(function CellFilter({
  departments,
  selectedDeptId,
  selectedCellId,
  onCellChange,
}: CellFilterProps) {
  // cu1 부서인지 확인
  const selectedDept = departments.find(d => d.id === selectedDeptId)
  const isCu1 = selectedDept?.code === CU1_DEPARTMENT_CODE

  const { data: cells = [] } = useCells(isCu1 ? selectedDeptId : undefined)

  if (!isCu1 || cells.length === 0) return null

  return (
    <select
      value={selectedCellId}
      onChange={(e) => onCellChange(e.target.value)}
      className="flex-1 lg:flex-none px-3 lg:px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
    >
      <option value="all">전체 셀</option>
      {cells.map(cell => (
        <option key={cell.id} value={cell.id}>{cell.name}</option>
      ))}
    </select>
  )
})

export default CellFilter
