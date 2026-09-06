'use client'

import { memo, useCallback } from 'react'

export interface MemberAttendanceItem {
  memberId: string
  name: string
  photoUrl: string | null
  worshipPresent: boolean
  meetingPresent: boolean
}

export type CellAttendanceType = 'worship' | 'meeting'

interface Props {
  memberAttendance: MemberAttendanceItem[]
  onToggle: (memberId: string, type: CellAttendanceType) => void
  onBulkAction: (type: CellAttendanceType, allPresent: boolean) => void
  sectionRef: (el: HTMLDivElement | null) => void
}

// 개별 셀원 행 (memo로 성능 최적화)
const MemberRow = memo(function MemberRow({
  member,
  onToggle,
}: {
  member: MemberAttendanceItem
  onToggle: (memberId: string, type: CellAttendanceType) => void
}) {
  const handleWorshipClick = useCallback(() => {
    onToggle(member.memberId, 'worship')
  }, [member.memberId, onToggle])

  const handleMeetingClick = useCallback(() => {
    onToggle(member.memberId, 'meeting')
  }, [member.memberId, onToggle])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-2 py-3 px-3 rounded-lg">
      <div className="flex items-center gap-3">
        {/* 프로필 사진 */}
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium">
            {member.name.charAt(0)}
          </div>
        )}
        <span className="text-sm font-medium text-gray-900">{member.name}</span>
      </div>
      <button
        type="button"
        onClick={handleWorshipClick}
        aria-label={`${member.name} 예배 ${member.worshipPresent ? '결석으로 변경' : '출석으로 변경'}`}
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
          member.worshipPresent
            ? 'bg-blue-100 border-blue-500 text-blue-600'
            : 'bg-gray-50 border-gray-300 text-gray-400'
        }`}
      >
        {member.worshipPresent ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={handleMeetingClick}
        aria-label={`${member.name} 모임 ${member.meetingPresent ? '결석으로 변경' : '출석으로 변경'}`}
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
          member.meetingPresent
            ? 'bg-green-100 border-green-500 text-green-600'
            : 'bg-gray-50 border-gray-300 text-gray-400'
        }`}
      >
        {member.meetingPresent ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  )
})

export default function CellMemberAttendance({
  memberAttendance,
  onToggle,
  onBulkAction,
  sectionRef,
}: Props) {
  const worshipCount = memberAttendance.filter(m => m.worshipPresent).length
  const meetingCount = memberAttendance.filter(m => m.meetingPresent).length
  const totalCount = memberAttendance.length

  return (
    <div
      ref={sectionRef}
      data-section="cell-attendance"
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 scroll-mt-24"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-base md:text-lg">셀원 출석</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            예배 {worshipCount}/{totalCount}명 · 모임 {meetingCount}/{totalCount}명
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onBulkAction('worship', true)}
            className="px-2.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg active:bg-blue-200 transition-colors"
          >
            예배 전체
          </button>
          <button
            type="button"
            onClick={() => onBulkAction('meeting', true)}
            className="px-2.5 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg active:bg-green-200 transition-colors"
          >
            모임 전체
          </button>
          <button
            type="button"
            onClick={() => {
              onBulkAction('worship', false)
              onBulkAction('meeting', false)
            }}
            className="px-2.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg active:bg-gray-200 transition-colors"
          >초기화</button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] gap-2 px-3 pb-1 text-center text-xs font-medium text-gray-500">
          <span className="text-left">이름</span>
          <span>예배</span>
          <span>모임</span>
        </div>
      )}

      {/* 셀원 목록 */}
      {totalCount > 0 ? (
        <div className="divide-y divide-gray-100">
          {memberAttendance.map((member) => (
            <MemberRow
              key={member.memberId}
              member={member}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          셀원이 없습니다. 셀을 먼저 선택해주세요.
        </div>
      )}
    </div>
  )
}
