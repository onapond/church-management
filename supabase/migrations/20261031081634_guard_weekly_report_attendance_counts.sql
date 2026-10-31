-- Remember which department/date pairs have individual attendance as their
-- source of truth. A period stays linked even if every attendance row is later
-- deleted, so an older report form cannot restore stale counts.
create table report_internal.weekly_report_attendance_sync_periods (
  department_id uuid not null,
  attendance_date date not null,
  primary key (department_id, attendance_date)
);

alter table report_internal.weekly_report_attendance_sync_periods
  enable row level security;
revoke all on report_internal.weekly_report_attendance_sync_periods
  from public, anon, authenticated;

insert into report_internal.weekly_report_attendance_sync_periods (
  department_id, attendance_date
)
select distinct md.department_id, attendance.attendance_date
from public.attendance_records as attendance
join public.member_departments as md on md.member_id = attendance.member_id
where attendance.attendance_date >= date '2026-09-01'
on conflict do nothing;

create function report_internal.track_weekly_report_attendance_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_member_id uuid;
  old_attendance_date date;
  new_member_id uuid;
  new_attendance_date date;
begin
  if tg_op <> 'INSERT' then
    old_member_id := old.member_id;
    old_attendance_date := old.attendance_date;
  end if;
  if tg_op <> 'DELETE' then
    new_member_id := new.member_id;
    new_attendance_date := new.attendance_date;
  end if;

  insert into report_internal.weekly_report_attendance_sync_periods (
    department_id, attendance_date
  )
  select distinct md.department_id, changed.attendance_date
  from (
    values (old_member_id, old_attendance_date),
           (new_member_id, new_attendance_date)
  ) as changed(member_id, attendance_date)
  join public.member_departments as md on md.member_id = changed.member_id
  where changed.attendance_date is not null
  on conflict do nothing;

  return null;
end;
$$;

revoke all on function report_internal.track_weekly_report_attendance_period()
  from public, anon, authenticated;

create trigger trg_weekly_report_attendance_00_track
after insert or update of member_id, attendance_date, attendance_type, is_present
  or delete on public.attendance_records
for each row
execute function report_internal.track_weekly_report_attendance_period();

-- A report save can contain counts loaded before another user changed
-- attendance. Recompute the derived fields whenever this period is linked.
create function report_internal.guard_weekly_report_attendance_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.report_type <> 'weekly'::public.report_type then
    return new;
  end if;

  if exists (
    select 1
    from report_internal.weekly_report_attendance_sync_periods as period
    where period.department_id = new.department_id
      and period.attendance_date = new.report_date
  ) then
    select
      count(distinct attendance.member_id) filter (
        where attendance.attendance_type = 'worship'::public.attendance_type
          and attendance.is_present = true
      )::integer,
      count(distinct attendance.member_id) filter (
        where attendance.attendance_type = 'meeting'::public.attendance_type
          and attendance.is_present = true
      )::integer
    into new.worship_attendance, new.meeting_attendance
    from public.member_departments as md
    join public.members as member
      on member.id = md.member_id and member.is_active = true
    left join public.attendance_records as attendance
      on attendance.member_id = member.id
        and attendance.attendance_date = new.report_date
    where md.department_id = new.department_id;
  end if;

  return new;
end;
$$;

revoke all on function report_internal.guard_weekly_report_attendance_counts()
  from public, anon, authenticated;

create trigger trg_weekly_report_attendance_guard
before insert or update of worship_attendance, meeting_attendance,
  department_id, report_date, report_type, status
on public.weekly_reports
for each row
execute function report_internal.guard_weekly_report_attendance_counts();
