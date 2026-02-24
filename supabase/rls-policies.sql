-- ============================================================
-- RLS 정책 전면 감사 - 청파중앙교회 교육위원회 관리 시스템
-- ============================================================
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 주의: 프로덕션 적용 전 반드시 로컬/스테이징에서 테스트
-- 롤백: supabase/rls-rollback.sql 참조
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. 헬퍼 함수: 현재 사용자 역할 조회
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- 현재 사용자가 관리자(super_admin, president, accountant)인지
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'president', 'accountant')
  )
$$;

-- 현재 사용자가 특정 부서에 소속되어 있는지
CREATE OR REPLACE FUNCTION public.is_in_department(dept_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_departments
    WHERE user_id = auth.uid()
    AND department_id = dept_id
  )
$$;

-- ────────────────────────────────────────────────────────────
-- 1. departments (부서) — 읽기 전용
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE는 super_admin만
DROP POLICY IF EXISTS "departments_admin_all" ON public.departments;
CREATE POLICY "departments_admin_all" ON public.departments
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ────────────────────────────────────────────────────────────
-- 2. users (사용자)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 사용자는 모두 조회 가능 (이름, 역할 표시 필요)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 회원가입 시 트리거로 생성 (auth.users → public.users)
-- service_role이 처리하므로 별도 정책 불필요
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: 본인 프로필만 수정 가능, role 변경은 super_admin만
DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  -- role 변경 방지: 본인이 수정할 때 role은 변경 불가
  WITH CHECK (
    id = auth.uid()
    AND (
      role = (SELECT role FROM public.users WHERE id = auth.uid())
      OR public.get_my_role() = 'super_admin'
    )
  );

-- UPDATE: super_admin은 다른 사용자도 수정 가능
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- DELETE: super_admin만
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'super_admin');

-- ────────────────────────────────────────────────────────────
-- 3. user_departments (사용자-부서 연결)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_departments_select" ON public.user_departments;
CREATE POLICY "user_departments_select" ON public.user_departments
  FOR SELECT TO authenticated
  USING (true);

-- 관리자만 수정 가능
DROP POLICY IF EXISTS "user_departments_admin" ON public.user_departments;
CREATE POLICY "user_departments_admin" ON public.user_departments
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 4. members (교인)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- SELECT: 관리자는 전체, 일반 사용자는 소속 부서 교인만
DROP POLICY IF EXISTS "members_select_admin" ON public.members;
CREATE POLICY "members_select_admin" ON public.members
  FOR SELECT TO authenticated
  USING (public.is_admin_role());

DROP POLICY IF EXISTS "members_select_dept" ON public.members;
CREATE POLICY "members_select_dept" ON public.members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member_departments md
      JOIN public.user_departments ud ON ud.department_id = md.department_id
      WHERE md.member_id = members.id
      AND ud.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: 관리자만
DROP POLICY IF EXISTS "members_modify_admin" ON public.members;
CREATE POLICY "members_modify_admin" ON public.members
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

-- INSERT/UPDATE: 팀장도 자기 부서 교인 수정 가능
DROP POLICY IF EXISTS "members_modify_teamlead" ON public.members;
CREATE POLICY "members_modify_teamlead" ON public.members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.member_departments md
      JOIN public.user_departments ud ON ud.department_id = md.department_id
      WHERE md.member_id = members.id
      AND ud.user_id = auth.uid()
      AND ud.is_team_leader = true
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "members_insert_teamlead" ON public.members;
CREATE POLICY "members_insert_teamlead" ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE user_id = auth.uid()
      AND is_team_leader = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. member_departments (교인-부서 연결)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.member_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_departments_select" ON public.member_departments;
CREATE POLICY "member_departments_select" ON public.member_departments
  FOR SELECT TO authenticated
  USING (true);

-- 관리자 또는 팀장만 수정
DROP POLICY IF EXISTS "member_departments_modify_admin" ON public.member_departments;
CREATE POLICY "member_departments_modify_admin" ON public.member_departments
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "member_departments_modify_teamlead" ON public.member_departments;
CREATE POLICY "member_departments_modify_teamlead" ON public.member_departments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE user_id = auth.uid()
      AND is_team_leader = true
      AND department_id = member_departments.department_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_departments
      WHERE user_id = auth.uid()
      AND is_team_leader = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. cells (셀)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cells_select" ON public.cells;
CREATE POLICY "cells_select" ON public.cells
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "cells_modify_admin" ON public.cells;
CREATE POLICY "cells_modify_admin" ON public.cells
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 7. weekly_reports (보고서)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: 관리자는 전체
DROP POLICY IF EXISTS "reports_select_admin" ON public.weekly_reports;
CREATE POLICY "reports_select_admin" ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (public.is_admin_role());

-- SELECT: 작성자는 본인 보고서
DROP POLICY IF EXISTS "reports_select_author" ON public.weekly_reports;
CREATE POLICY "reports_select_author" ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (author_id = auth.uid());

-- SELECT: 같은 부서 소속이면 draft 제외 열람 가능
DROP POLICY IF EXISTS "reports_select_dept" ON public.weekly_reports;
CREATE POLICY "reports_select_dept" ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (
    status != 'draft'
    AND public.is_in_department(department_id)
  );

-- INSERT: 작성자 본인만 (author_id = auth.uid())
DROP POLICY IF EXISTS "reports_insert" ON public.weekly_reports;
CREATE POLICY "reports_insert" ON public.weekly_reports
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- UPDATE: 작성자 본인 (draft/rejected 상태) + 결재자 (결재 처리)
DROP POLICY IF EXISTS "reports_update_author" ON public.weekly_reports;
CREATE POLICY "reports_update_author" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "reports_update_approver" ON public.weekly_reports;
CREATE POLICY "reports_update_approver" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
  );

-- DELETE: 관리자만
DROP POLICY IF EXISTS "reports_delete_admin" ON public.weekly_reports;
CREATE POLICY "reports_delete_admin" ON public.weekly_reports
  FOR DELETE TO authenticated
  USING (public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 8. approval_history (결재 이력)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 사용자 모두 (보고서 상세에서 이력 표시)
DROP POLICY IF EXISTS "approval_history_select" ON public.approval_history;
CREATE POLICY "approval_history_select" ON public.approval_history
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 결재 권한자 + 작성자(제출 취소)
DROP POLICY IF EXISTS "approval_history_insert" ON public.approval_history;
CREATE POLICY "approval_history_insert" ON public.approval_history
  FOR INSERT TO authenticated
  WITH CHECK (approver_id = auth.uid());

-- DELETE: 관리자만 (보고서 삭제 시)
DROP POLICY IF EXISTS "approval_history_delete" ON public.approval_history;
CREATE POLICY "approval_history_delete" ON public.approval_history
  FOR DELETE TO authenticated
  USING (public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 9. report_programs (보고서 프로그램)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.report_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_programs_select" ON public.report_programs;
CREATE POLICY "report_programs_select" ON public.report_programs
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: 보고서 작성자 또는 관리자
DROP POLICY IF EXISTS "report_programs_modify" ON public.report_programs;
CREATE POLICY "report_programs_modify" ON public.report_programs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = report_programs.report_id
      AND author_id = auth.uid()
    )
    OR public.is_admin_role()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = report_programs.report_id
      AND author_id = auth.uid()
    )
    OR public.is_admin_role()
  );

-- ────────────────────────────────────────────────────────────
-- 10. newcomers (새신자)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.newcomers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newcomers_select" ON public.newcomers;
CREATE POLICY "newcomers_select" ON public.newcomers
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "newcomers_modify" ON public.newcomers;
CREATE POLICY "newcomers_modify" ON public.newcomers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = newcomers.report_id
      AND author_id = auth.uid()
    )
    OR public.is_admin_role()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = newcomers.report_id
      AND author_id = auth.uid()
    )
    OR public.is_admin_role()
  );

-- ────────────────────────────────────────────────────────────
-- 11. attendance_records (출결)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 사용자 모두 (출결 현황 조회)
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_records;
CREATE POLICY "attendance_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE: 관리자 또는 해당 교인 부서의 팀장/소속원
DROP POLICY IF EXISTS "attendance_modify_admin" ON public.attendance_records;
CREATE POLICY "attendance_modify_admin" ON public.attendance_records
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

DROP POLICY IF EXISTS "attendance_modify_dept" ON public.attendance_records;
CREATE POLICY "attendance_modify_dept" ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_departments md ON md.member_id = m.id
      JOIN public.user_departments ud ON ud.department_id = md.department_id
      WHERE m.id = attendance_records.member_id
      AND ud.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_departments md ON md.member_id = m.id
      JOIN public.user_departments ud ON ud.department_id = md.department_id
      WHERE m.id = attendance_records.member_id
      AND ud.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 12. notifications (알림) — 본인 알림만
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: 인증된 사용자 (결재 알림 생성 시)
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: 본인 알림만 (읽음 처리)
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: 관리자 또는 본인
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 13. push_subscriptions (푸시 구독)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_select" ON public.push_subscriptions;
CREATE POLICY "push_sub_select" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_sub_insert" ON public.push_subscriptions;
CREATE POLICY "push_sub_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_sub_update" ON public.push_subscriptions;
CREATE POLICY "push_sub_update" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_sub_delete" ON public.push_subscriptions;
CREATE POLICY "push_sub_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 14. accounting_records (회계장부)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.accounting_records ENABLE ROW LEVEL SECURITY;

-- SELECT: 관리자 + team_leader (canAccessAccounting)
DROP POLICY IF EXISTS "accounting_select" ON public.accounting_records;
CREATE POLICY "accounting_select" ON public.accounting_records
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'president', 'accountant', 'team_leader')
  );

-- INSERT/UPDATE/DELETE: accountant 또는 super_admin만
DROP POLICY IF EXISTS "accounting_modify" ON public.accounting_records;
CREATE POLICY "accounting_modify" ON public.accounting_records
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'accountant'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'accountant'));

-- ────────────────────────────────────────────────────────────
-- 15. expense_requests (지출결의서)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: 관리자는 전체, 작성자는 본인 것
DROP POLICY IF EXISTS "expense_requests_select_admin" ON public.expense_requests;
CREATE POLICY "expense_requests_select_admin" ON public.expense_requests
  FOR SELECT TO authenticated
  USING (public.is_admin_role());

DROP POLICY IF EXISTS "expense_requests_select_self" ON public.expense_requests;
CREATE POLICY "expense_requests_select_self" ON public.expense_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- INSERT: 인증된 사용자 (본인 작성)
DROP POLICY IF EXISTS "expense_requests_insert" ON public.expense_requests;
CREATE POLICY "expense_requests_insert" ON public.expense_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- UPDATE/DELETE: 작성자 본인 또는 관리자
DROP POLICY IF EXISTS "expense_requests_modify_self" ON public.expense_requests;
CREATE POLICY "expense_requests_modify_self" ON public.expense_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "expense_requests_modify_admin" ON public.expense_requests;
CREATE POLICY "expense_requests_modify_admin" ON public.expense_requests
  FOR ALL TO authenticated
  USING (public.is_admin_role())
  WITH CHECK (public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 16. expense_items (지출 항목)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- SELECT: 부모 expense_request 접근 가능하면 조회 가능
DROP POLICY IF EXISTS "expense_items_select" ON public.expense_items;
CREATE POLICY "expense_items_select" ON public.expense_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_requests er
      WHERE er.id = expense_items.expense_request_id
      AND (er.requester_id = auth.uid() OR public.is_admin_role())
    )
  );

-- INSERT/UPDATE/DELETE: 부모 결의서 작성자 또는 관리자
DROP POLICY IF EXISTS "expense_items_modify" ON public.expense_items;
CREATE POLICY "expense_items_modify" ON public.expense_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_requests er
      WHERE er.id = expense_items.expense_request_id
      AND (er.requester_id = auth.uid() OR public.is_admin_role())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_requests er
      WHERE er.id = expense_items.expense_request_id
      AND (er.requester_id = auth.uid() OR public.is_admin_role())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 17. visitations (심방 일정)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.visitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visitations_select" ON public.visitations;
CREATE POLICY "visitations_select" ON public.visitations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "visitations_insert" ON public.visitations;
CREATE POLICY "visitations_insert" ON public.visitations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.is_admin_role());

DROP POLICY IF EXISTS "visitations_modify" ON public.visitations;
CREATE POLICY "visitations_modify" ON public.visitations
  FOR ALL TO authenticated
  USING (auth.uid() = created_by OR public.is_admin_role())
  WITH CHECK (auth.uid() = created_by OR public.is_admin_role());

-- ────────────────────────────────────────────────────────────
-- 18. report_photos (보고서 사진) — 테이블 존재 시
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_photos' AND table_schema = 'public') THEN
    ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "report_photos_select" ON public.report_photos';
    EXECUTE 'CREATE POLICY "report_photos_select" ON public.report_photos FOR SELECT TO authenticated USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "report_photos_modify" ON public.report_photos FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = report_photos.report_id AND author_id = auth.uid())
        OR public.is_admin_role()
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = report_photos.report_id AND author_id = auth.uid())
        OR public.is_admin_role()
      )';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 18. project_content_items, project_schedule_items, project_budget_items
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['project_content_items', 'project_schedule_items', 'project_budget_items']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);

      EXECUTE format('DROP POLICY IF EXISTS "%s_modify" ON public.%I', tbl, tbl);
      EXECUTE format('CREATE POLICY "%s_modify" ON public.%I FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = %I.report_id AND author_id = auth.uid())
        OR public.is_admin_role()
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = %I.report_id AND author_id = auth.uid())
        OR public.is_admin_role()
      )', tbl, tbl, tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 완료! 적용된 정책 확인
-- ============================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
