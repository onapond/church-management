import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEditMembers } from '@/lib/permissions'
import BulkPhotoUpload from '@/components/members/BulkPhotoUpload'
import type { UserData } from '@/types/shared'

export default async function BulkPhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userInfo } = await supabase
    .from('users')
    .select('*, user_departments(department_id, is_team_leader, departments(id, name, code))')
    .eq('id', user.id)
    .single()

  const canEdit = canEditMembers(userInfo as UserData | null)
  if (!canEdit) redirect('/members')

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-xl">援먯씤 ?ъ쭊 ?쇨큵 ?낅줈??</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            遺?쒕? ?좏깮?섍퀬 ?щ윭 援먯씤???ъ쭊???쒕쾲???낅줈?쒗빀?덈떎
          </p>
        </div>
        <Link
          href="/members"
          className="shrink-0 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>紐⑸줉</span>
          </span>
        </Link>
      </div>

      <BulkPhotoUpload />
    </div>
  )
}
