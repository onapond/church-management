-- Restrict peer cell-leader report visibility.
--
-- Background:
-- Migration 003 relaxed report SELECT so any authenticated user could read any
-- non-draft report. That lets ordinary cell leaders read other cell leaders'
-- reports. Cell-leader reports can contain private sharing/prayer content, so
-- ordinary cell leaders must only read their own reports.
--
-- Rules:
-- - Admin roles (`super_admin`, `president`, `accountant`) can read reports.
-- - Authors can read their own reports, including drafts.
-- - Department leaders (`user_departments.is_team_leader = true`) can read
--   non-draft reports for departments they lead.
-- - Ordinary cell leaders (`role = 'team_leader'` but no department-leader flag)
--   cannot read peer reports.

drop policy if exists "reports_select_all" on public.weekly_reports;
drop policy if exists "reports_select_admin" on public.weekly_reports;
drop policy if exists "reports_select_author" on public.weekly_reports;
drop policy if exists "reports_select_dept" on public.weekly_reports;
drop policy if exists "reports_select_department_leader" on public.weekly_reports;
drop policy if exists "View reports based on role" on public.weekly_reports;

create policy "reports_select_admin"
on public.weekly_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant')
  )
);

create policy "reports_select_author"
on public.weekly_reports
for select
to authenticated
using (author_id = auth.uid());

create policy "reports_select_department_leader"
on public.weekly_reports
for select
to authenticated
using (
  status <> 'draft'
  and exists (
    select 1
    from public.users u
    join public.user_departments ud on ud.user_id = u.id
    where u.id = auth.uid()
      and u.is_active = true
      and ud.department_id = weekly_reports.department_id
      and ud.is_team_leader = true
  )
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'report_feedback'
  ) then
    execute 'drop policy if exists "report_feedback_select_viewers" on public.report_feedback';
    execute 'create policy "report_feedback_select_viewers" on public.report_feedback for select to authenticated using (
      exists (
        select 1
        from public.weekly_reports r
        where r.id = report_feedback.report_id
      )
    )';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'report_photos'
  ) then
    execute 'drop policy if exists "report_photos_select" on public.report_photos';
    execute 'create policy "report_photos_select" on public.report_photos for select to authenticated using (
      exists (
        select 1
        from public.weekly_reports r
        where r.id = report_photos.report_id
      )
    )';
  end if;
end $$;

drop policy if exists "report_programs_select" on public.report_programs;
create policy "report_programs_select"
on public.report_programs
for select
to authenticated
using (
  exists (
    select 1
    from public.weekly_reports r
    where r.id = report_programs.report_id
  )
);

drop policy if exists "newcomers_select" on public.newcomers;
create policy "newcomers_select"
on public.newcomers
for select
to authenticated
using (
  exists (
    select 1
    from public.weekly_reports r
    where r.id = newcomers.report_id
  )
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array['project_content_items', 'project_schedule_items', 'project_budget_items']
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = tbl
    ) then
      execute format('drop policy if exists "%s_select" on public.%I', tbl, tbl);
      execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
      execute format('create policy "%s_select" on public.%I for select to authenticated using (
        exists (
          select 1
          from public.weekly_reports r
          where r.id = %I.report_id
        )
      )', tbl, tbl, tbl);
    end if;
  end loop;
end $$;
