-- Read-only sharing of submitted weekly reports between active department leaders.
-- role=team_leader alone includes cell leaders and MUST NOT grant this access.
-- Keep existing author/admin/own-department SELECT and every write policy unchanged.
create policy "reports_select_weekly_department_leaders"
on public.weekly_reports
for select
to authenticated
using (
  report_type = 'weekly'
  and status <> 'draft'
  and exists (
    select 1
    from public.users u
    join public.user_departments ud on ud.user_id = u.id
    where u.id = (select auth.uid())
      and u.is_active = true
      and ud.is_team_leader = true
  )
);
