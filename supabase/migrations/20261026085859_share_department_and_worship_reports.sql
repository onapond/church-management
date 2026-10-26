-- Share only non-draft weekly reports and worship meeting reports.
-- Do not promote user roles/head flags: those also grant unrelated write powers.
-- CU1 ordinary cell leaders use role=team_leader, so CU1 requires the head flag.
-- Department codes are case-sensitive: CU=worship, cu=umbrella organization.
drop policy if exists reports_select_weekly_department_leaders on public.weekly_reports;
drop policy if exists reports_select_shared_leader_reports on public.weekly_reports;

create policy reports_select_shared_leader_reports
on public.weekly_reports
for select
to authenticated
using (
  status <> 'draft'
  and (
    report_type = 'weekly'
    or (
      report_type = 'meeting'
      and department_id in (
        select d.id from public.departments d
        where d.code::text in ('CU', 'cu_worship')
      )
    )
  )
  and exists (
    select 1
    from public.users u
    join public.user_departments ud on ud.user_id = u.id
    join public.departments d on d.id = ud.department_id
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        ud.is_team_leader = true
        or (
          u.role = 'team_leader'
          and d.code::text in ('youth', 'ck', 'cu2', 'CU', 'cu_worship')
        )
      )
  )
);

-- Existing admin/author/department-head SELECT policies are preserved.
-- No INSERT/UPDATE/DELETE policies, table columns or RPC signatures change.
