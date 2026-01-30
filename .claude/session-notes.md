# 청파중앙교회 교육위원회 관리 시스템 - 세션 노트

## 프로젝트 개요
- **목적**: 청파중앙교회 교육위원회 출결/보고서/교인 관리 시스템
- **기술 스택**: Next.js 16.1.6 (Turbopack), Supabase, TypeScript, Tailwind CSS
- **배포**: Netlify (https://church-management-cpcc.netlify.app)
- **GitHub**: https://github.com/onapond/church-management

## 부서 구조
| code | name |
|------|------|
| ck | 유치부 솔트 |
| cu_worship | CU워십 |
| youth | 청소년부 |
| cu1 | CU1부 |
| cu2 | CU2부 |
| leader | 리더 |

## 사용자 역할
- `super_admin`: 최고 관리자
- `president`: 회장 (결재 권한)
- `accountant`: 회계
- `team_leader`: 팀장 (보고서 작성 권한)
- `member`: 일반 회원

## 주요 기능

### 1. 출결 관리 (/attendance)
- 예배 출석 체크
- 부서별 출결 현황
- 일괄 출석 체크 기능

### 2. 보고서 시스템 (/reports)
3가지 보고서 유형 지원:
- **주차 보고서 (weekly)**: 출결 현황, 새신자 명단, 말씀 정보, 순서지
- **모임 보고서 (meeting)**: 모임 개요, 참석자, 주요내용
- **교육 보고서 (education)**: 교육 개요, 교육내용, 적용점

결재 흐름: draft → submitted → coordinator_reviewed → manager_approved → final_approved

### 3. 교인 명단 (/members)
- 부서별 필터링 (URL params로 상태 유지)
- 사진 업로드 (member-photos 버킷)
- 그리드/리스트 뷰 전환
- Excel 내보내기

### 4. 통계 (/stats)
- Recharts 기반 시각화
- 부서별 출석률 추이

## 최근 작업 내역 (2026-01-30)

### 완료된 작업
1. **리더 부서 생성** - 11명의 리더 멤버 추가
2. **부서 필터 UX 개선** - 목록으로 돌아갈 때 필터 상태 유지 (URL params)
3. **보고서 시스템 확장**
   - 단일 주차보고서 → 3가지 유형 (주차/모임/교육) 지원
   - DB에 report_type enum, 새 컬럼들 추가
   - 유형별 폼 필드 분기 처리
   - 유형별 상세 페이지 렌더링
4. **모임 보고서 표시 버그 수정** - 내용이 제대로 표시되지 않던 문제 해결
5. **반응형 콘텐츠 영역** - 긴 텍스트 시 자동 확장

### DB 마이그레이션 (실행 완료)
```sql
-- report_type enum 추가
ALTER TYPE approval_status RENAME TO _approval_status;
CREATE TYPE report_type AS ENUM ('weekly', 'meeting', 'education');

-- weekly_reports 테이블에 새 컬럼 추가
ALTER TABLE weekly_reports
ADD COLUMN report_type report_type DEFAULT 'weekly',
ADD COLUMN meeting_title TEXT,
ADD COLUMN meeting_location TEXT,
ADD COLUMN attendees TEXT,
ADD COLUMN main_content TEXT,
ADD COLUMN application_notes TEXT;
```

## 다음 작업 후보

### 우선순위 높음
1. **알림 시스템 구현**
   - 보고서 제출/결재 시 푸시 알림
   - notifications 테이블 활용
   - Web Push API 연동

2. **보고서 통계 대시보드**
   - 부서별/유형별 보고서 현황
   - 결재 대기 건수 표시

3. **새신자 → 정식 교인 전환 기능**
   - newcomers 테이블의 converted_to_member_id 활용
   - 전환 워크플로우 UI

### 우선순위 중간
4. **보고서 인쇄 기능 개선**
   - 모임/교육 보고서 인쇄 템플릿 최적화
   - PDF 다운로드 옵션

5. **출석 통계 상세화**
   - 월별/분기별 추이
   - 개인별 출석 이력

6. **모바일 UX 개선**
   - 터치 제스처 지원
   - 오프라인 모드 (PWA)

### 우선순위 낮음
7. **일정 관리 기능**
   - 부서별 일정 등록
   - 캘린더 뷰

8. **데이터 백업/복원**
   - 정기 백업 설정
   - 복원 기능

## Supabase 관리
- **대시보드**: https://supabase.com/dashboard/project/[project-id]
- **SQL Editor**: 대시보드 → SQL Editor
- **Storage**: member-photos 버킷 (사진 저장)

## 참고 파일
- `/2026 안내자료.pdf` - 보고서 양식 참고 자료
- `/2026 교육부 생일 정렬.xlsx` - 교인 명단 원본 데이터
