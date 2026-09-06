-- Run against a migrated database with a rollback-capable SQL client.
-- Any failed assertion raises and the outer transaction leaves no test data.

begin;

select
  set_config('request.jwt.claim.sub', context.user_id::text, true),
  set_config('test.department_id', context.department_id::text, true),
  set_config('test.cell_id', context.cell_id::text, true),
  set_config('test.member_id', context.member_id::text, true)
from (
  select
    u.id as user_id,
    md.department_id,
    md.cell_id,
    md.member_id
  from public.users u
  cross join lateral (
    select member_department.department_id, member_department.cell_id, member_department.member_id
    from public.member_departments member_department
    join public.members member
      on member.id = member_department.member_id
     and member.is_active = true
    join public.cells cell
      on cell.id = member_department.cell_id
     and cell.is_active = true
    limit 1
  ) md
  where u.role = 'super_admin'
    and u.is_active = true
  limit 1
) context;

set local role authenticated;

do $$
declare
  v_user_id uuid := auth.uid();
  v_department_id uuid := current_setting('test.department_id')::uuid;
  v_cell_id uuid := current_setting('test.cell_id')::uuid;
  v_member_id uuid := current_setting('test.member_id')::uuid;
  v_report_date date := (current_date + interval '50 years')::date;
  v_payload jsonb;
  v_result jsonb;
  v_report_id uuid;
  v_atomic_failure_raised boolean := false;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'E2E setup did not establish auth.uid()';
  end if;

  v_payload := jsonb_build_object(
    'report_type', 'cell_leader',
    'is_draft', true,
    'target_report_id', null,
    'edit_report_id', null,
    'selected_cell_id', v_cell_id,
    'sync_attendance', true,
    'attendance_date', v_report_date,
    'attendance_members', jsonb_build_array(jsonb_build_object(
      'member_id', v_member_id,
      'worship_present', true,
      'meeting_present', false
    )),
    'report_data', jsonb_build_object(
      'department_id', v_department_id,
      'report_date', v_report_date,
      'year', extract(year from v_report_date)::integer,
      'total_registered', 999,
      'worship_attendance', 999,
      'meeting_attendance', 999,
      'notes', '{}',
      'status', 'draft',
      'report_type', 'cell_leader',
      'meeting_title', 'Attendance linkage rollback E2E',
      'cell_id', v_cell_id,
      'main_content', 'atomic-before'
    ),
    'report_programs', '[]'::jsonb,
    'newcomers', '[]'::jsonb,
    'project_content_items', '[]'::jsonb,
    'project_schedule_items', '[]'::jsonb,
    'project_budget_items', '[]'::jsonb
  );

  v_result := public.save_report_bundle(v_payload);
  v_report_id := nullif(v_result->>'reportId', '')::uuid;

  if v_report_id is null then
    raise exception 'E2E report save returned no report id';
  end if;

  select count(*) into v_count
  from public.attendance_records
  where report_id = v_report_id
    and checked_via = 'report';
  if v_count <> 2 then
    raise exception 'Expected two linked attendance rows, got %', v_count;
  end if;

  if not exists (
    select 1
    from public.weekly_reports
    where id = v_report_id
      and total_registered = 1
      and worship_attendance = 1
      and meeting_attendance = 0
  ) then
    raise exception 'Report summary does not match linked personal attendance';
  end if;

  begin
    perform public.save_report_bundle(
      jsonb_set(
        jsonb_set(
          jsonb_set(v_payload, '{target_report_id}', to_jsonb(v_report_id::text)),
          '{attendance_members,0,member_id}',
          to_jsonb(gen_random_uuid()::text)
        ),
        '{report_data,main_content}',
        to_jsonb('atomic-after'::text)
      )
    );
  exception when others then
    v_atomic_failure_raised := true;
  end;

  if not v_atomic_failure_raised then
    raise exception 'Invalid attendance member did not reject the bundle';
  end if;

  if not exists (
    select 1 from public.weekly_reports
    where id = v_report_id and main_content = 'atomic-before'
  ) then
    raise exception 'Failed attendance validation did not roll back the report update';
  end if;

  update public.attendance_records
  set checked_via = 'manual'
  where report_id = v_report_id
    and attendance_type = 'worship';

  delete from public.weekly_reports where id = v_report_id;

  select count(*) into v_count
  from public.attendance_records
  where attendance_date = v_report_date
    and member_id = v_member_id
    and checked_via = 'manual'
    and report_id is null;
  if v_count <> 1 then
    raise exception 'Manual correction did not survive report deletion';
  end if;

  select count(*) into v_count
  from public.attendance_records
  where attendance_date = v_report_date
    and member_id = v_member_id
    and checked_via = 'report';
  if v_count <> 0 then
    raise exception 'Report-origin attendance survived report deletion';
  end if;
end;
$$;

rollback;
