# 세션 노트

## 작업 내역 (2026-02-09)

### 완료된 작업
1. [보고서 삭제 버그 수정] - DELETE RLS 정책 누락 + 자식 테이블 누락 수정
   - 관련 파일: `src/components/reports/ReportDetail.tsx`
   - 커밋: `902026a`

2. [Supabase 보안 강화] - Security Advisor ERROR 7→0, WARN 대부분 해결
   - 마이그레이션 3개: add_delete_rls_policies, fix_security_errors_enable_rls, fix_security_warns_functions_and_policies
   - RLS 활성화 5개 테이블, 뷰 SECURITY INVOKER, 함수 search_path, public→authenticated

3. [Supabase 성능 최적화] - Performance Advisor WARN/INFO 모두 해결
   - 마이그레이션 4개: fix_performance_indexes, fix_performance_policies_part1/part2, fix_remaining_unindexed_fkeys
   - initplan 22개, 중복 정책 9개, FK 인덱스 20개 추가/8개 삭제

4. [문서 업데이트] - 04-database.md에 RLS/인덱스/마이그레이션 섹션 추가

### 참고사항
- Supabase DELETE 정책 없으면 에러 없이 무시됨 (silent failure)
- `auth.uid()` → `(select auth.uid())` initplan 최적화 적용
- members SELECT에서 accountant 역할 접근 권한 추가됨
- Leaked Password Protection은 Supabase 대시보드에서 수동 활성화 필요

---

## 작업 내역 (2026-02-08)

### 완료된 작업
1. [교인 사진 일괄 업로드] - 부서별 사진 한번에 업로드 기능
   - 관련 파일: `src/components/members/BulkPhotoUpload.tsx`, `src/app/(dashboard)/members/bulk-photos/page.tsx`
   - 커밋: `41ddc20`

2. [보고서 삭제 기능] - 관리자 전용 보고서 삭제
   - 관련 파일: `src/components/reports/ReportDetail.tsx`, `src/app/(dashboard)/reports/[id]/page.tsx`
   - 커밋: `41ddc20`

---

## 다음 작업

### 우선순위 높음
- [ ] Leaked Password Protection 대시보드에서 활성화
- [ ] 팀장 계정으로 교인 목록 접근 테스트
- [ ] Lighthouse 재측정 및 성능 확인
- [ ] 웹 푸시 알림 (Phase 2) - Service Worker, 백그라운드 알림

### 우선순위 중간
- [ ] iPhone Safari PWA 테스트
- [ ] 보고서 통계 대시보드 - 부서별/유형별 보고서 현황
- [ ] 새신자 → 정식 교인 전환 기능
- [ ] 보고서 인쇄 기능 개선

---

## 참고사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함 (Rate limit 해결)
- **사용자 승인 필드**: `is_active` (is_approved 아님)
- **Supabase Storage**: member-photos 버킷
- **Supabase Realtime**: notifications 테이블 구독 활성화 필요
- **보고서 삭제 순서**: report_programs → newcomers → approval_history → attendance_records → notifications → report_photos → weekly_reports
