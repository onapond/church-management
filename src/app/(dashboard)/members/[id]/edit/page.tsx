import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberForm from '@/components/members/MemberForm'

interface Department {
  id: string
  name: string
  code?: string
}

interface MemberDepartmentData {
  department_id: string
  is_primary: boolean
  cell_id?: string | null
  departments: {
    id: string
    name: string
  }
}

interface Member {
  id: string
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  address: string | null
  occupation: string | null
  guardian: string | null
  photo_url: string | null
  photo_updated_at: string | null
  department_id: string | null
  is_active: boolean
  joined_at: string
  created_at: string
  updated_at: string
  member_departments: MemberDepartmentData[]
}

const ADMIN_ROLES = ['super_admin', 'president', 'accountant', 'team_leader']

export default async function MemberEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: memberId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !ADMIN_ROLES.includes(userData.role)) {
    redirect('/members')
  }

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, member_departments(department_id, is_primary, cell_id, departments(id, name))')
    .eq('id', memberId)
    .single()

  if (memberError || !memberData) {
    console.error('Error loading member:', memberError)
    redirect('/members')
  }

  const { data: deptData } = await supabase
    .from('departments')
    .select('id, name, code')
    .order('name')

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href={`/members/${memberId}`} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ?뚯븘媛湲?
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">援먯씤 ?뺣낫 ?섏젙</h1>

      <MemberForm departments={(deptData || []) as Department[]} member={memberData as Member} />
    </div>
  )
}
