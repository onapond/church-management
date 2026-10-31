-- A permitted attendance change updates only the two derived counts of a
-- weekly report for the same department and worship date, at any approval state.
-- The trigger is private and cannot be called through the Data API. Attendance
-- INSERT/UPDATE/DELETE still passes the existing attendance_records RLS policy.
create or replace function report_internal.sync_weekly_report_attendance_counts()
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
  affected record;
begin
  if tg_op <> 'INSERT' then
    old_member_id := old.member_id;
    old_attendance_date := old.attendance_date;
  end if;
  if tg_op <> 'DELETE' then
    new_member_id := new.member_id;
    new_attendance_date := new.attendance_date;
  end if;

  for affected in
    select distinct md.department_id, changed.attendance_date
    from (
      values (old_member_id, old_attendance_date),
             (new_member_id, new_attendance_date)
    ) as changed(member_id, attendance_date)
    join public.member_departments md on md.member_id = changed.member_id
    where changed.attendance_date is not null
  loop
    update public.weekly_reports as report
    set worship_attendance = totals.worship,
        meeting_attendance = totals.meeting
    from (
      select
        wr.id,
        count(distinct a.member_id) filter (
          where a.attendance_type = 'worship'::public.attendance_type
            and a.is_present = true
        )::integer as worship,
        count(distinct a.member_id) filter (
          where a.attendance_type = 'meeting'::public.attendance_type
            and a.is_present = true
        )::integer as meeting
      from public.weekly_reports wr
      left join public.member_departments md
        on md.department_id = wr.department_id
      left join public.members m
        on m.id = md.member_id and m.is_active = true
      left join public.attendance_records a
        on a.member_id = m.id and a.attendance_date = wr.report_date
      where wr.report_type = 'weekly'::public.report_type
        and wr.department_id = affected.department_id
        and wr.report_date = affected.attendance_date
      group by wr.id
    ) as totals
    where report.id = totals.id
      and (
        report.worship_attendance is distinct from totals.worship
        or report.meeting_attendance is distinct from totals.meeting
      );
  end loop;

  return null;
end;
$$;

revoke all on function report_internal.sync_weekly_report_attendance_counts()
  from public, anon, authenticated;

drop trigger if exists trg_weekly_report_attendance_sync on public.attendance_records;
create trigger trg_weekly_report_attendance_sync
after insert or update of member_id, attendance_date, attendance_type, is_present
  or delete on public.attendance_records
for each row
execute function report_internal.sync_weekly_report_attendance_counts();

-- Reconcile reports since the individual attendance linkage went live.
-- Older reports may contain manual historical totals without complete personal
-- records, so they are left as recorded. Reports with no personal records are
-- also left unchanged.
with current_counts as (
  select
    wr.id,
    count(distinct a.member_id) filter (
      where a.attendance_type = 'worship'::public.attendance_type
        and a.is_present = true
    )::integer as worship,
    count(distinct a.member_id) filter (
      where a.attendance_type = 'meeting'::public.attendance_type
        and a.is_present = true
    )::integer as meeting
  from public.weekly_reports wr
  join public.member_departments md on md.department_id = wr.department_id
  join public.members m on m.id = md.member_id and m.is_active = true
  join public.attendance_records a
    on a.member_id = m.id and a.attendance_date = wr.report_date
  where wr.report_type = 'weekly'::public.report_type
    and wr.report_date >= date '2026-09-01'
  group by wr.id
)
update public.weekly_reports as report
set worship_attendance = current_counts.worship,
    meeting_attendance = current_counts.meeting
from current_counts
where report.id = current_counts.id
  and (
    report.worship_attendance is distinct from current_counts.worship
    or report.meeting_attendance is distinct from current_counts.meeting
  );
