-- Migration: Allow team_leader (셀장 부서 팀장) to approve cell_leader reports via RLS
-- Background:
--   Existing reports_update_approver policy only allowed super_admin/president/accountant
--   to UPDATE weekly_reports rows. This blocked 1청년 팀장(team_leader) from finalizing
--   cell_leader reports for their own department. RLS silently filtered the row,
--   so the update affected 0 rows without raising an error and the status stayed
--   in 'submitted' (결재대기) on the UI.
--
-- Fix:
--   Extend reports_update_approver to also allow a user whose role is team_leader
--   (any role actually) to update a cell_leader report when they are the team
--   leader (user_departments.is_team_leader = true) of that report's department.

DROP POLICY IF EXISTS "reports_update_approver" ON public.weekly_reports;

CREATE POLICY "reports_update_approver" ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
    OR (
      report_type = 'cell_leader'
      AND EXISTS (
        SELECT 1
        FROM public.user_departments ud
        WHERE ud.user_id = auth.uid()
          AND ud.department_id = weekly_reports.department_id
          AND ud.is_team_leader = true
      )
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'president', 'accountant')
    OR (
      report_type = 'cell_leader'
      AND EXISTS (
        SELECT 1
        FROM public.user_departments ud
        WHERE ud.user_id = auth.uid()
          AND ud.department_id = weekly_reports.department_id
          AND ud.is_team_leader = true
      )
    )
  );
