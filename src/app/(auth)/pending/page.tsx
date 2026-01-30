'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRefresh = () => {
    router.refresh()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 max-w-md w-full text-center">
        {/* 아이콘 */}
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* 제목 */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          승인 대기 중
        </h1>

        {/* 설명 */}
        <p className="text-gray-600 text-sm mb-6">
          회원가입이 완료되었습니다.<br />
          관리자의 승인 후 서비스를 이용하실 수 있습니다.
        </p>

        {/* 안내 박스 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-medium text-gray-900 text-sm mb-2">승인 절차 안내</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 관리자가 회원 정보를 확인합니다</li>
            <li>• 승인 완료 시 자동으로 접속됩니다</li>
            <li>• 문의: 교육위원회 담당자</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm"
          >
            승인 상태 확인
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors text-sm"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
