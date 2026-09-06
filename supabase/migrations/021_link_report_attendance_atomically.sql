-- Cell-leader reports are the canonical source for report-entered worship and
-- meeting attendance. Keep the existing bundle writer as an internal core and
-- wrap it so report + attendance changes share one transaction.

create schema if not exists report_internal;
revoke all on schema report_internal from public;

alter function public.save_report_bundle(jsonb)
  rename to save_report_bundle_core_v21;
alter function public.save_report_bundle_core_v21(jsonb)
  set schema report_internal;

revoke all on function report_internal.save_report_bundle_core_v21(jsonb) from public;
grant usage on schema report_internal to authenticated, service_role;
grant execute on function report_internal.save_report_bundle_core_v21(jsonb) to authenticated, service_role;

update public.attendance_records
set checked_via = 'report'
where checked_via = 'cell_report';

alter table public.attendance_records
  add constraint attendance_records_checked_via_check
  check (checked_via is null or checked_via in ('manual', 'bulk', 'report'));

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

create or replace function public.save_report_bundle(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_report_id uuid;
  v_previous_report_id uuid := coalesce(
    nullif(payload->>'target_report_id', '')::uuid,
    nullif(payload->>'edit_report_id', '')::uuid
  );
  v_report_type text := payload->>'report_type';
  v_selected_cell_id uuid := nullif(payload->>'selected_cell_id', '')::uuid;
  v_attendance_date date := nullif(payload->>'attendance_date', '')::date;
  v_report_date date := nullif(payload->'report_data'->>'report_date', '')::date;
  v_department_id uuid := nullif(payload->'report_data'->>'department_id', '')::uuid;
  v_is_draft boolean := coalesce((payload->>'is_draft')::boolean, false);
  v_sync_attendance boolean := coalesce((payload->>'sync_attendance')::boolean, true);
  v_attendance_members jsonb := coalesce(payload->'attendance_members', '[]'::jsonb);
  v_previous_total integer := 0;
  v_previous_worship integer := 0;
  v_previous_meeting integer := 0;
  v_member_count integer := 0;
  v_valid_member_count integer := 0;
begin
  if v_previous_report_id is not null then
    select
      coalesce(total_registered, 0),
      coalesce(worship_attendance, 0),
      coalesce(meeting_attendance, 0)
    into v_previous_total, v_previous_worship, v_previous_meeting
    from public.weekly_reports
    where id = v_previous_report_id;
  end if;

  v_result := report_internal.save_report_bundle_core_v21(payload);

  if coalesce((v_result->>'duplicate')::boolean, false) then
    return v_result;
  end if;

  v_report_id := nullif(v_result->>'reportId', '')::uuid;
  if v_report_id is null then
    raise exception 'save_report_bundle core returned no reportId';
  end if;

  if v_report_type <> 'cell_leader' then
    return v_result;
  end if;

  -- Background draft autosave updates text fields only. It must not erase the
  -- explicit attendance state or its cached report summary.
  if not v_sync_attendance then
    if v_previous_report_id is not null then
      update public.weekly_reports
      set total_registered = v_previous_total,
          worship_attendance = v_previous_worship,
          meeting_attendance = v_previous_meeting
      where id = v_report_id;
    end if;

    return v_result;
  end if;

  if jsonb_typeof(v_attendance_members) <> 'array' then
    raise exception 'attendance_members must be a JSON array';
  end if;

  if v_attendance_date is null or v_report_date is null or v_attendance_date <> v_report_date then
    raise exception 'Attendance date must match report date';
  end if;

  if v_selected_cell_id is null then
    if not v_is_draft then
      raise exception 'A cell is required for submitted cell-leader reports';
    end if;

    if jsonb_array_length(v_attendance_members) > 0 then
      raise exception 'Attendance members require a selected cell';
    end if;
  else
    if not exists (
      select 1
      from public.cells c
      where c.id = v_selected_cell_id
        and c.department_id = v_department_id
        and c.is_active = true
    ) then
      raise exception 'Selected cell is not active in the report department';
    end if;
  end if;

  select count(*)
  into v_member_count
  from jsonb_to_recordset(v_attendance_members) as incoming(
    member_id uuid,
    worship_present boolean,
    meeting_present boolean
  );

  if exists (
    select 1
    from jsonb_to_recordset(v_attendance_members) as incoming(
      member_id uuid,
      worship_present boolean,
      meeting_present boolean
    )
    where incoming.member_id is null
       or incoming.worship_present is null
       or incoming.meeting_present is null
  ) then
    raise exception 'Each attendance member requires an id and both attendance values';
  end if;

  if exists (
    select incoming.member_id
    from jsonb_to_recordset(v_attendance_members) as incoming(
      member_id uuid,
      worship_present boolean,
      meeting_present boolean
    )
    group by incoming.member_id
    having count(*) > 1
  ) then
    raise exception 'attendance_members contains duplicate member ids';
  end if;

  if v_member_count > 0 then
    select count(distinct m.id)
    into v_valid_member_count
    from jsonb_to_recordset(v_attendance_members) as incoming(
      member_id uuid,
      worship_present boolean,
      meeting_present boolean
    )
    join public.members m
      on m.id = incoming.member_id
     and m.is_active = true
    join public.member_departments md
      on md.member_id = incoming.member_id
     and md.department_id = v_department_id
     and md.cell_id = v_selected_cell_id;

    if v_valid_member_count <> v_member_count then
      raise exception 'Attendance members must be active members of the selected cell';
    end if;
  end if;

  delete from public.attendance_records
  where report_id = v_report_id;

  insert into public.attendance_records (
    member_id,
    report_id,
    attendance_date,
    attendance_type,
    is_present,
    checked_by,
    checked_via
  )
  select
    incoming.member_id,
    v_report_id,
    v_attendance_date,
    attendance.attendance_type,
    attendance.is_present,
    auth.uid(),
    'report'
  from jsonb_to_recordset(v_attendance_members) as incoming(
    member_id uuid,
    worship_present boolean,
    meeting_present boolean
  )
  cross join lateral (
    values
      ('worship'::public.attendance_type, incoming.worship_present),
      ('meeting'::public.attendance_type, incoming.meeting_present)
  ) as attendance(attendance_type, is_present)
  on conflict (member_id, attendance_date, attendance_type)
  do update set
    report_id = excluded.report_id,
    is_present = excluded.is_present,
    checked_by = excluded.checked_by,
    checked_via = excluded.checked_via,
    updated_at = now();

  update public.weekly_reports
  set total_registered = v_member_count,
      worship_attendance = (
        select count(*)
        from jsonb_to_recordset(v_attendance_members) as incoming(
          member_id uuid,
          worship_present boolean,
          meeting_present boolean
        )
        where incoming.worship_present
      ),
      meeting_attendance = (
        select count(*)
        from jsonb_to_recordset(v_attendance_members) as incoming(
          member_id uuid,
          worship_present boolean,
          meeting_present boolean
        )
        where incoming.meeting_present
      )
  where id = v_report_id;

  return v_result || jsonb_build_object('warnings', '[]'::jsonb);
end;
$$;

revoke all on function public.save_report_bundle(jsonb) from public, anon;
grant execute on function public.save_report_bundle(jsonb) to authenticated, service_role;

-- Deleting a report removes only attendance that still has report provenance.
-- A manual correction keeps its unique attendance row and the FK detaches it.
create or replace function public.cleanup_report_attendance()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.attendance_records
  set report_id = null
  where report_id = old.id
    and checked_via is distinct from 'report';

  delete from public.attendance_records
  where report_id = old.id
    and checked_via = 'report';

  return old;
end;
$$;

drop trigger if exists trg_cleanup_report_attendance on public.weekly_reports;
create trigger trg_cleanup_report_attendance
before delete on public.weekly_reports
for each row
execute function public.cleanup_report_attendance();

comment on function public.save_report_bundle(jsonb) is
  'Atomically saves a report bundle and explicit worship/meeting attendance for cell-leader reports.';
