-- The legacy trigger relied on the caller's search_path. Supabase authenticated
-- requests use a restricted path, so qualify every relation and recalculate both
-- sides when an attendance row moves between reports.

create or replace function public.update_report_attendance_counts()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_old_report_id uuid := case when tg_op <> 'INSERT' then old.report_id else null end;
  v_new_report_id uuid := case when tg_op <> 'DELETE' then new.report_id else null end;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if v_old_report_id is not null and v_old_report_id is distinct from v_new_report_id then
    update public.weekly_reports
    set total_registered = (
          select count(distinct member_id)
          from public.attendance_records
          where report_id = v_old_report_id
        ),
        worship_attendance = (
          select count(*)
          from public.attendance_records
          where report_id = v_old_report_id
            and attendance_type = 'worship'
            and is_present = true
        ),
        meeting_attendance = (
          select count(*)
          from public.attendance_records
          where report_id = v_old_report_id
            and attendance_type = 'meeting'
            and is_present = true
        )
    where id = v_old_report_id;
  end if;

  if v_new_report_id is not null then
    update public.weekly_reports
    set total_registered = (
          select count(distinct member_id)
          from public.attendance_records
          where report_id = v_new_report_id
        ),
        worship_attendance = (
          select count(*)
          from public.attendance_records
          where report_id = v_new_report_id
            and attendance_type = 'worship'
            and is_present = true
        ),
        meeting_attendance = (
          select count(*)
          from public.attendance_records
          where report_id = v_new_report_id
            and attendance_type = 'meeting'
            and is_present = true
        )
    where id = v_new_report_id;
  end if;

  return coalesce(new, old);
end;
$$;
