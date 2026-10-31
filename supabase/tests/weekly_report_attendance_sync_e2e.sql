-- Run after the weekly attendance sync migration with a rollback-capable client.
-- Exercises an already-approved report; every test row is rolled back.
begin;

select
  set_config('request.jwt.claim.sub', context.user_id::text, true),
  set_config('test.operator_id', context.operator_id::text, true),
  set_config('test.department_id', context.department_id::text, true),
  set_config('test.member_id', context.member_id::text, true)
from (
  select u.id as user_id, candidate.operator_id,
    candidate.department_id, candidate.member_id
  from public.users u
  cross join lateral (
    select operator.id as operator_id,
      member_department.department_id, member_department.member_id
    from public.users operator
    join public.user_departments ud
      on ud.user_id = operator.id and ud.is_team_leader = false
    join public.member_departments member_department
      on member_department.department_id = ud.department_id
    join public.members member
      on member.id = member_department.member_id and member.is_active = true
    where operator.role = 'team_leader' and operator.is_active = true
    limit 1
  ) candidate
  where u.role = 'super_admin' and u.is_active = true
  limit 1
) context;

set local role authenticated;

do $$
declare
  v_user_id uuid := auth.uid();
  v_operator_id uuid := current_setting('test.operator_id')::uuid;
  v_department_id uuid := current_setting('test.department_id')::uuid;
  v_member_id uuid := current_setting('test.member_id')::uuid;
  v_report_date date := (current_date + interval '60 years')::date;
  v_report_id uuid;
  v_other_report_id uuid;
  v_attendance_id uuid;
begin
  if v_user_id is null or v_operator_id is null then
    raise exception 'E2E setup did not establish user ids';
  end if;

  insert into public.weekly_reports (
    department_id, report_date, week_number, year, author_id,
    report_type, status, notes, total_registered,
    worship_attendance, meeting_attendance
  ) values (
    v_department_id, v_report_date, 1, extract(year from v_report_date)::integer,
    v_user_id, 'weekly', 'final_approved', '{}', 1, 0, 0
  ) returning id into v_report_id;

  insert into public.weekly_reports (
    department_id, report_date, week_number, year, author_id,
    report_type, status, notes, total_registered,
    worship_attendance, meeting_attendance
  ) values (
    v_department_id, v_report_date + 7, 2, extract(year from v_report_date)::integer,
    v_user_id, 'weekly', 'final_approved', '{}', 1, 37, 29
  ) returning id into v_other_report_id;

  -- A cell leader who cannot edit this admin-authored approved report may
  -- still change permitted attendance; the private trigger updates counts.
  perform set_config('request.jwt.claim.sub', v_operator_id::text, true);

  insert into public.attendance_records (
    member_id, attendance_date, attendance_type, is_present,
    checked_by, checked_via
  ) values (
    v_member_id, v_report_date, 'worship', true, v_operator_id, 'manual'
  ) returning id into v_attendance_id;

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  if not exists (
    select 1 from public.weekly_reports
    where id = v_report_id and status = 'final_approved'
      and worship_attendance = 1 and meeting_attendance = 0
  ) then
    raise exception 'Approved report did not reflect a manual worship check';
  end if;

  perform set_config('request.jwt.claim.sub', v_operator_id::text, true);
  update public.attendance_records
  set is_present = false
  where id = v_attendance_id;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  if not exists (
    select 1 from public.weekly_reports
    where id = v_report_id and worship_attendance = 0
  ) then
    raise exception 'Approved report did not reflect a manual worship uncheck';
  end if;

  perform set_config('request.jwt.claim.sub', v_operator_id::text, true);
  insert into public.attendance_records (
    member_id, attendance_date, attendance_type, is_present,
    checked_by, checked_via
  ) values (
    v_member_id, v_report_date, 'meeting', true, v_operator_id, 'manual'
  ) returning id into v_attendance_id;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  if not exists (
    select 1 from public.weekly_reports
    where id = v_report_id and meeting_attendance = 1
  ) then
    raise exception 'Approved report did not reflect a manual meeting check';
  end if;

  perform set_config('request.jwt.claim.sub', v_operator_id::text, true);
  delete from public.attendance_records where id = v_attendance_id;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  if not exists (
    select 1 from public.weekly_reports
    where id = v_report_id and meeting_attendance = 0
  ) then
    raise exception 'Approved report did not reflect a deleted meeting check';
  end if;

  if not exists (
    select 1 from public.weekly_reports
    where id = v_other_report_id and worship_attendance = 37
      and meeting_attendance = 29 and status = 'final_approved'
  ) then
    raise exception 'Attendance changed an unrelated report';
  end if;
end;
$$;

-- Simulate a report save from a page opened before the attendance changes.
-- This direct update isolates the database guard from report-editing RLS.
reset role;
update public.weekly_reports
set worship_attendance = 91, meeting_attendance = 92
where report_type = 'weekly'
  and report_date = (current_date + interval '60 years')::date;

do $$
begin
  if not exists (
    select 1 from public.weekly_reports
    where report_type = 'weekly'
      and report_date = (current_date + interval '60 years')::date
      and status = 'final_approved'
      and worship_attendance = 0 and meeting_attendance = 0
  ) then
    raise exception 'A stale report save overwrote linked attendance counts';
  end if;

  if not exists (
    select 1 from public.weekly_reports
    where report_type = 'weekly'
      and report_date = (current_date + interval '60 years' + interval '7 days')::date
      and worship_attendance = 37 and meeting_attendance = 29
  ) then
    raise exception 'An unrelated manual report lost its counts';
  end if;
end;
$$;

rollback;
