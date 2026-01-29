import { createClient } from '@/lib/supabase/server'
import AttendanceGrid from '@/components/attendance/AttendanceGrid'

interface Department {
  id: string
  name: string
  code: string
}

export default async function AttendancePage() {
  const supabase = await createClient()

  // 현재 사용자 정보
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('*, departments(id, name, code)')
    .eq('id', user!.id)
    .single()

  // super_admin은 모든 부서 접근 가능, 아니면 자신의 부서만
  let departments: Department[] = []

  if (userData?.role === 'super_admin' || userData?.role === 'president' || userData?.role === 'manager' || userData?.role === 'pastor') {
    // 관리자는 모든 부서 조회 가능
    const { data: allDepts } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name')
    departments = (allDepts || []) as Department[]
  } else if (userData?.departments) {
    // 일반 사용자는 자신의 부서만
    departments = [userData.departments as Department]
  }

  // 이번 주 일요일 날짜
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  const sundayStr = sunday.toISOString().split('T')[0]

  // 기본 부서 (첫 번째 부서)
  const defaultDeptId = departments[0]?.id

  // 해당 부서 교인 목록
  let members: Array<{ id: string; name: string; phone: string | null; photo_url: string | null; department_id: string; is_active: boolean }> = []
  if (defaultDeptId) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('department_id', defaultDeptId)
      .eq('is_active', true)
      .order('name')
    members = (data || []) as typeof members
  }

  // 오늘 출결 기록
  let attendanceRecords: Array<{ id: string; member_id: string; attendance_type: string; is_present: boolean; attendance_date: string }> = []
  if (defaultDeptId && members.length > 0) {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('attendance_date', sundayStr)
      .in('member_id', members.map(m => m.id))
    attendanceRecords = (data || []) as typeof attendanceRecords
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">출결 관리</h1>
        <p className="text-gray-500 mt-1">
          {new Date(sundayStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </div>

      {departments.length > 0 ? (
        <AttendanceGrid
          departments={departments}
          defaultDepartmentId={defaultDeptId}
          members={members}
          attendanceRecords={attendanceRecords}
          attendanceDate={sundayStr}
        />
      ) : (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">접근 가능한 부서가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
