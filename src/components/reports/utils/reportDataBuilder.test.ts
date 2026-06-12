import { describe, it, expect } from 'vitest'
import { buildReportData, buildCellLeaderAttendees } from './reportDataBuilder'
import type { ReportDataInput } from './reportDataBuilder'

const baseForm = {
  department_id: 'dept-001',
  report_date: '2026-03-15',
  sermon_title: '테스트 말씀',
  sermon_scripture: '요한복음 3:16',
  discussion_notes: '논의 내용',
  other_notes: '기타 사항',
  meeting_title: '3월 모임',
  meeting_location: '교육관',
  attendees: '홍길동, 김철수',
  main_content: '주요 내용',
  application_notes: '적용 사항',
  organization: '조직도 내용',
}

const baseInput: ReportDataInput = {
  form: baseForm,
  reportType: 'weekly',
  reportYear: 2026,
  weekNumber: 11,
  isDraft: true,
  cellAttendance: [],
  attendanceSummary: { total: 30, worship: 20, meeting: 15 },
  memberAttendance: [],
  selectedCellId: '',
  enabledSections: ['overview', 'budget'],
}

// ── buildReportData ──────────────────────────────────

describe('buildReportData', () => {
  it('주차 보고서: week_number 설정, meeting_title null', () => {
    const result = buildReportData(baseInput)
    expect(result.week_number).toBe(11)
    expect(result.year).toBe(2026)
    expect(result.report_type).toBe('weekly')
    expect(result.meeting_title).toBeNull()
    expect(result.cell_id).toBeNull()
  })

  it('주차 보고서: attendanceSummary fallback (cellAttendance 비어있을 때)', () => {
    const result = buildReportData(baseInput)
    expect(result.total_registered).toBe(30)
    expect(result.worship_attendance).toBe(20)
    expect(result.meeting_attendance).toBe(15)
  })

  it('주차 보고서: cellAttendance 합계 우선 사용', () => {
    const input: ReportDataInput = {
      ...baseInput,
      cellAttendance: [
        { _key: 'k1', cell_name: '1셀', registered: 10, worship: 8, meeting: 6, note: '' },
        { _key: 'k2', cell_name: '2셀', registered: 5, worship: 4, meeting: 3, note: '' },
      ],
    }
    const result = buildReportData(input)
    expect(result.total_registered).toBe(15)
    expect(result.worship_attendance).toBe(12)
    expect(result.meeting_attendance).toBe(9)
  })

  it('임시저장: status=draft, submitted_at=null', () => {
    const result = buildReportData({ ...baseInput, isDraft: true })
    expect(result.status).toBe('draft')
    expect(result.submitted_at).toBeNull()
  })

  it('제출: status=submitted, submitted_at 설정', () => {
    const result = buildReportData({ ...baseInput, isDraft: false })
    expect(result.status).toBe('submitted')
    expect(result.submitted_at).not.toBeNull()
  })

  it('모임 보고서: week_number null, meeting_title/location 포함', () => {
    const input: ReportDataInput = { ...baseInput, reportType: 'meeting' }
    const result = buildReportData(input)
    expect(result.week_number).toBeNull()
    expect(result.meeting_title).toBe('3월 모임')
    expect(result.meeting_location).toBe('교육관')
    expect(result.total_registered).toBe(0)
  })

  it('셀장 보고서: cell_id 설정, meeting_location null', () => {
    const input: ReportDataInput = {
      ...baseInput,
      reportType: 'cell_leader',
      selectedCellId: 'cell-001',
    }
    const result = buildReportData(input)
    expect(result.cell_id).toBe('cell-001')
    expect(result.meeting_location).toBeNull()
    expect(result.week_number).toBeNull()
  })

  it('프로젝트 보고서: attendees null, notes에 project_sections 포함', () => {
    const input: ReportDataInput = {
      ...baseInput,
      reportType: 'project',
      enabledSections: ['overview', 'budget'],
    }
    const result = buildReportData(input)
    expect(result.attendees).toBeNull()
    const notes = JSON.parse(result.notes)
    expect(notes.project_sections).toEqual(['overview', 'budget'])
  })

  it('notes JSON: sermon_title/scripture/cell_attendance 포함 (weekly)', () => {
    const input: ReportDataInput = {
      ...baseInput,
      cellAttendance: [{ _key: 'k1', cell_name: '1셀', registered: 5, worship: 4, meeting: 3, note: '' }],
    }
    const result = buildReportData(input)
    const notes = JSON.parse(result.notes)
    expect(notes.sermon_title).toBe('테스트 말씀')
    expect(notes.sermon_scripture).toBe('요한복음 3:16')
    expect(notes.cell_attendance).toHaveLength(1)
    expect(notes.cell_attendance[0]._key).toBeUndefined() // _key 제외
  })
})

// ── buildCellLeaderAttendees ─────────────────────────

describe('buildCellLeaderAttendees', () => {
  it('출석자 이름 목록 반환', () => {
    const attendance = [
      { memberId: '1', name: '홍길동', isPresent: true, photoUrl: null },
      { memberId: '2', name: '김철수', isPresent: false, photoUrl: null },
      { memberId: '3', name: '이영희', isPresent: true, photoUrl: null },
    ]
    const result = buildCellLeaderAttendees(attendance, '')
    expect(result).toBe('홍길동, 이영희 (총 2명)')
  })

  it('출석자 없으면 fallback 반환', () => {
    const attendance = [
      { memberId: '1', name: '홍길동', isPresent: false, photoUrl: null },
    ]
    const result = buildCellLeaderAttendees(attendance, '기존 참석자')
    expect(result).toBe('기존 참석자')
  })

  it('빈 배열이면 fallback 반환', () => {
    expect(buildCellLeaderAttendees([], '없음')).toBe('없음')
  })
})
