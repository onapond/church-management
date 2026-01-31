import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/users/UserManagement'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  // 관리자만 접근 가능
  if (!userData || !['super_admin', 'president'].includes(userData.role)) {
    redirect('/dashboard')
  }

  // 모든 사용자 목록 (미승인 우선)
  const { data: users } = await supabase
    .from('users')
    .select('*, departments(name)')
    .order('is_active', { ascending: true })
    .order('created_at', { ascending: false })

  // 부서 목록
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, code')
    .order('name')

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">회원 승인 및 권한 관리</p>
      </div>

      <UserManagement
        users={users || []}
        departments={departments || []}
      />
    </div>
  )
}
