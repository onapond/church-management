create or replace function public.save_report_bundle(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_created_report_id uuid := null;
  v_report_type text := payload->>'report_type';
  v_target_report_id uuid := nullif(payload->>'target_report_id', '')::uuid;
  v_edit_report_id uuid := nullif(payload->>'edit_report_id', '')::uuid;
  v_selected_cell_id uuid := nullif(payload->>'selected_cell_id', '')::uuid;
  v_report_data jsonb := coalesce(payload->'report_data', '{}'::jsonb);
  v_programs jsonb := coalesce(payload->'report_programs', '[]'::jsonb);
  v_newcomers jsonb := coalesce(payload->'newcomers', '[]'::jsonb);
  v_project_content_items jsonb := coalesce(payload->'project_content_items', '[]'::jsonb);
  v_project_schedule_items jsonb := coalesce(payload->'project_schedule_items', '[]'::jsonb);
  v_project_budget_items jsonb := coalesce(payload->'project_budget_items', '[]'::jsonb);
  v_attendance_present_ids uuid[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(payload->'attendance_present_member_ids', '[]'::jsonb))::uuid),
    array[]::uuid[]
  );
  v_attendance_absent_ids uuid[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(payload->'attendance_absent_member_ids', '[]'::jsonb))::uuid),
    array[]::uuid[]
  );
  v_attendance_date date := nullif(payload->>'attendance_date', '')::date;
  v_duplicate record;
  v_program record;
  v_newcomer record;
  v_content_item record;
  v_schedule_item record;
  v_budget_item record;
  v_existing_program_ids uuid[] := array[]::uuid[];
  v_existing_newcomer_ids uuid[] := array[]::uuid[];
  v_existing_content_item_ids uuid[] := array[]::uuid[];
  v_existing_schedule_item_ids uuid[] := array[]::uuid[];
  v_existing_budget_item_ids uuid[] := array[]::uuid[];
  v_warnings text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if v_target_report_id is not null then
    update weekly_reports wr
    set department_id = next_row.department_id,
        report_date = next_row.report_date,
        week_number = next_row.week_number,
        year = next_row.year,
        total_registered = next_row.total_registered,
        worship_attendance = next_row.worship_attendance,
        meeting_attendance = next_row.meeting_attendance,
        notes = next_row.notes,
        status = next_row.status,
        submitted_at = next_row.submitted_at,
        coordinator_id = next_row.coordinator_id,
        coordinator_reviewed_at = next_row.coordinator_reviewed_at,
        coordinator_comment = next_row.coordinator_comment,
        manager_id = next_row.manager_id,
        manager_approved_at = next_row.manager_approved_at,
        manager_comment = next_row.manager_comment,
        final_approver_id = next_row.final_approver_id,
        final_approved_at = next_row.final_approved_at,
        final_comment = next_row.final_comment,
        rejected_by = next_row.rejected_by,
        rejected_at = next_row.rejected_at,
        rejection_reason = next_row.rejection_reason,
        report_type = next_row.report_type,
        meeting_title = next_row.meeting_title,
        meeting_location = next_row.meeting_location,
        attendees = next_row.attendees,
        main_content = next_row.main_content,
        application_notes = next_row.application_notes,
        cell_id = next_row.cell_id,
        updated_at = now()
    from jsonb_populate_record(null::weekly_reports, v_report_data) as next_row
    where wr.id = v_target_report_id
    returning wr.id into v_report_id;

    if v_report_id is null then
      raise exception 'Update target draft report failed';
    end if;
  elsif v_edit_report_id is not null then
    update weekly_reports wr
    set department_id = next_row.department_id,
        report_date = next_row.report_date,
        week_number = next_row.week_number,
        year = next_row.year,
        total_registered = next_row.total_registered,
        worship_attendance = next_row.worship_attendance,
        meeting_attendance = next_row.meeting_attendance,
        notes = next_row.notes,
        status = next_row.status,
        submitted_at = next_row.submitted_at,
        coordinator_id = next_row.coordinator_id,
        coordinator_reviewed_at = next_row.coordinator_reviewed_at,
        coordinator_comment = next_row.coordinator_comment,
        manager_id = next_row.manager_id,
        manager_approved_at = next_row.manager_approved_at,
        manager_comment = next_row.manager_comment,
        final_approver_id = next_row.final_approver_id,
        final_approved_at = next_row.final_approved_at,
        final_comment = next_row.final_comment,
        rejected_by = next_row.rejected_by,
        rejected_at = next_row.rejected_at,
        rejection_reason = next_row.rejection_reason,
        report_type = next_row.report_type,
        meeting_title = next_row.meeting_title,
        meeting_location = next_row.meeting_location,
        attendees = next_row.attendees,
        main_content = next_row.main_content,
        application_notes = next_row.application_notes,
        cell_id = next_row.cell_id,
        updated_at = now()
    from jsonb_populate_record(null::weekly_reports, v_report_data) as next_row
    where wr.id = v_edit_report_id
    returning wr.id into v_report_id;

    if v_report_id is null then
      raise exception 'Update existing report failed';
    end if;
  else
    if v_report_type = 'weekly' then
      select id, status into v_duplicate
      from weekly_reports
      where department_id = (v_report_data->>'department_id')::uuid
        and year = (v_report_data->>'year')::integer
        and week_number = (v_report_data->>'week_number')::integer
      limit 1;
    elsif v_report_type = 'cell_leader' then
      select id, status into v_duplicate
      from weekly_reports
      where department_id = (v_report_data->>'department_id')::uuid
        and report_date = (v_report_data->>'report_date')::date
        and report_type = v_report_type::report_type
        and (
          (v_selected_cell_id is not null and cell_id = v_selected_cell_id)
          or (v_selected_cell_id is null and author_id = v_user_id)
        )
      limit 1;
    else
      select id, status into v_duplicate
      from weekly_reports
      where department_id = (v_report_data->>'department_id')::uuid
        and report_date = (v_report_data->>'report_date')::date
        and report_type = v_report_type::report_type
        and author_id = v_user_id
        and meeting_title is not distinct from (v_report_data->>'meeting_title')
      limit 1;
    end if;

    if v_duplicate.id is not null then
      return jsonb_build_object(
        'duplicate', true,
        'id', v_duplicate.id,
        'status', v_duplicate.status,
        'message',
          case
            when v_report_type = 'weekly' then format('A weekly report for week %s already exists.', v_report_data->>'week_number')
            when v_report_type = 'meeting' then 'A meeting report with the same date/details already exists.'
            when v_report_type = 'education' then 'A education report with the same date/details already exists.'
            when v_report_type = 'cell_leader' then 'A cell leader report with the same date/details already exists.'
            when v_report_type = 'project' then 'A project plan with the same date/details already exists.'
            when v_report_type = 'visitation' then 'A visitation report with the same date/details already exists.'
            else 'A report with the same date/details already exists.'
          end
      );
    end if;

    insert into weekly_reports (
      department_id, report_date, week_number, year, author_id,
      total_registered, worship_attendance, meeting_attendance,
      notes, status, submitted_at,
      coordinator_id, coordinator_reviewed_at, coordinator_comment,
      manager_id, manager_approved_at, manager_comment,
      final_approver_id, final_approved_at, final_comment,
      rejected_by, rejected_at, rejection_reason,
      report_type, meeting_title, meeting_location, attendees,
      main_content, application_notes, cell_id
    )
    select
      next_row.department_id, next_row.report_date, next_row.week_number, next_row.year, v_user_id,
      next_row.total_registered, next_row.worship_attendance, next_row.meeting_attendance,
      next_row.notes, next_row.status, next_row.submitted_at,
      next_row.coordinator_id, next_row.coordinator_reviewed_at, next_row.coordinator_comment,
      next_row.manager_id, next_row.manager_approved_at, next_row.manager_comment,
      next_row.final_approver_id, next_row.final_approved_at, next_row.final_comment,
      next_row.rejected_by, next_row.rejected_at, next_row.rejection_reason,
      next_row.report_type, next_row.meeting_title, next_row.meeting_location, next_row.attendees,
      next_row.main_content, next_row.application_notes, next_row.cell_id
    from jsonb_populate_record(null::weekly_reports, v_report_data) as next_row
    returning id into v_report_id;

    v_created_report_id := v_report_id;
  end if;

  if v_report_type <> 'cell_leader' and v_report_type <> 'project' then
    select coalesce(array_agg(id), array[]::uuid[]) into v_existing_program_ids
    from report_programs
    where report_id = v_report_id;

    for v_program in
      select * from jsonb_to_recordset(v_programs) as program_row(
        id uuid, start_time text, content text, person_in_charge text, order_index integer
      )
    loop
      if v_program.id is null then
        insert into report_programs (report_id, start_time, content, person_in_charge, order_index)
        values (
          v_report_id,
          coalesce(nullif(v_program.start_time, ''), '00:00')::time,
          coalesce(v_program.content, ''),
          nullif(v_program.person_in_charge, ''),
          coalesce(v_program.order_index, 0)
        );
      else
        update report_programs
        set start_time = coalesce(nullif(v_program.start_time, ''), '00:00')::time,
            content = coalesce(v_program.content, ''),
            person_in_charge = nullif(v_program.person_in_charge, ''),
            order_index = coalesce(v_program.order_index, 0)
        where id = v_program.id
          and report_id = v_report_id;
      end if;
    end loop;

    delete from report_programs rp
    where rp.report_id = v_report_id
      and rp.id = any(v_existing_program_ids)
      and not exists (
        select 1 from jsonb_to_recordset(v_programs) as incoming(id uuid)
        where incoming.id = rp.id
      );
  else
    delete from report_programs where report_id = v_report_id;
  end if;

  if v_report_type = 'weekly' then
    select coalesce(array_agg(id), array[]::uuid[]) into v_existing_newcomer_ids
    from newcomers
    where report_id = v_report_id;

    for v_newcomer in
      select * from jsonb_to_recordset(v_newcomers) as newcomer_row(
        id uuid, name text, phone text, birth_date date, introducer text, address text, affiliation text, department_id uuid
      )
    loop
      if v_newcomer.id is null then
        insert into newcomers (report_id, name, phone, birth_date, introducer, address, affiliation, department_id)
        values (
          v_report_id,
          coalesce(v_newcomer.name, ''),
          nullif(v_newcomer.phone, ''),
          v_newcomer.birth_date,
          nullif(v_newcomer.introducer, ''),
          nullif(v_newcomer.address, ''),
          nullif(v_newcomer.affiliation, ''),
          v_newcomer.department_id
        );
      else
        update newcomers
        set name = coalesce(v_newcomer.name, ''),
            phone = nullif(v_newcomer.phone, ''),
            birth_date = v_newcomer.birth_date,
            introducer = nullif(v_newcomer.introducer, ''),
            address = nullif(v_newcomer.address, ''),
            affiliation = nullif(v_newcomer.affiliation, ''),
            department_id = v_newcomer.department_id
        where id = v_newcomer.id
          and report_id = v_report_id;
      end if;
    end loop;

    delete from newcomers n
    where n.report_id = v_report_id
      and n.id = any(v_existing_newcomer_ids)
      and not exists (
        select 1 from jsonb_to_recordset(v_newcomers) as incoming(id uuid)
        where incoming.id = n.id
      );
  else
    delete from newcomers where report_id = v_report_id;
  end if;

  if v_report_type = 'project' then
    select coalesce(array_agg(id), array[]::uuid[]) into v_existing_content_item_ids
    from project_content_items
    where report_id = v_report_id;
    select coalesce(array_agg(id), array[]::uuid[]) into v_existing_schedule_item_ids
    from project_schedule_items
    where report_id = v_report_id;
    select coalesce(array_agg(id), array[]::uuid[]) into v_existing_budget_item_ids
    from project_budget_items
    where report_id = v_report_id;

    for v_content_item in
      select * from jsonb_to_recordset(v_project_content_items) as content_row(
        id uuid, col1 text, col2 text, col3 text, col4 text, order_index integer
      )
    loop
      if v_content_item.id is null then
        insert into project_content_items (report_id, col1, col2, col3, col4, order_index)
        values (
          v_report_id,
          coalesce(v_content_item.col1, ''),
          coalesce(v_content_item.col2, ''),
          coalesce(v_content_item.col3, ''),
          coalesce(v_content_item.col4, ''),
          coalesce(v_content_item.order_index, 0)
        );
      else
        update project_content_items
        set col1 = coalesce(v_content_item.col1, ''),
            col2 = coalesce(v_content_item.col2, ''),
            col3 = coalesce(v_content_item.col3, ''),
            col4 = coalesce(v_content_item.col4, ''),
            order_index = coalesce(v_content_item.order_index, 0)
        where id = v_content_item.id
          and report_id = v_report_id;
      end if;
    end loop;

    delete from project_content_items item
    where item.report_id = v_report_id
      and item.id = any(v_existing_content_item_ids)
      and not exists (
        select 1 from jsonb_to_recordset(v_project_content_items) as incoming(id uuid)
        where incoming.id = item.id
      );

    for v_schedule_item in
      select * from jsonb_to_recordset(v_project_schedule_items) as schedule_row(
        id uuid, schedule text, detail text, note text, order_index integer
      )
    loop
      if v_schedule_item.id is null then
        insert into project_schedule_items (report_id, schedule, detail, note, order_index)
        values (
          v_report_id,
          coalesce(v_schedule_item.schedule, ''),
          coalesce(v_schedule_item.detail, ''),
          coalesce(v_schedule_item.note, ''),
          coalesce(v_schedule_item.order_index, 0)
        );
      else
        update project_schedule_items
        set schedule = coalesce(v_schedule_item.schedule, ''),
            detail = coalesce(v_schedule_item.detail, ''),
            note = coalesce(v_schedule_item.note, ''),
            order_index = coalesce(v_schedule_item.order_index, 0)
        where id = v_schedule_item.id
          and report_id = v_report_id;
      end if;
    end loop;

    delete from project_schedule_items item
    where item.report_id = v_report_id
      and item.id = any(v_existing_schedule_item_ids)
      and not exists (
        select 1 from jsonb_to_recordset(v_project_schedule_items) as incoming(id uuid)
        where incoming.id = item.id
      );

    for v_budget_item in
      select * from jsonb_to_recordset(v_project_budget_items) as budget_row(
        id uuid, category text, subcategory text, item_name text, basis text,
        unit_price numeric, quantity integer, amount numeric, note text, order_index integer
      )
    loop
      if v_budget_item.id is null then
        insert into project_budget_items (
          report_id, category, subcategory, item_name, basis, unit_price, quantity, amount, note, order_index
        )
        values (
          v_report_id,
          coalesce(v_budget_item.category, ''),
          coalesce(v_budget_item.subcategory, ''),
          coalesce(v_budget_item.item_name, ''),
          coalesce(v_budget_item.basis, ''),
          coalesce(v_budget_item.unit_price, 0),
          coalesce(v_budget_item.quantity, 0),
          coalesce(v_budget_item.amount, 0),
          coalesce(v_budget_item.note, ''),
          coalesce(v_budget_item.order_index, 0)
        );
      else
        update project_budget_items
        set category = coalesce(v_budget_item.category, ''),
            subcategory = coalesce(v_budget_item.subcategory, ''),
            item_name = coalesce(v_budget_item.item_name, ''),
            basis = coalesce(v_budget_item.basis, ''),
            unit_price = coalesce(v_budget_item.unit_price, 0),
            quantity = coalesce(v_budget_item.quantity, 0),
            amount = coalesce(v_budget_item.amount, 0),
            note = coalesce(v_budget_item.note, ''),
            order_index = coalesce(v_budget_item.order_index, 0)
        where id = v_budget_item.id
          and report_id = v_report_id;
      end if;
    end loop;

    delete from project_budget_items item
    where item.report_id = v_report_id
      and item.id = any(v_existing_budget_item_ids)
      and not exists (
        select 1 from jsonb_to_recordset(v_project_budget_items) as incoming(id uuid)
        where incoming.id = item.id
      );
  else
    delete from project_content_items where report_id = v_report_id;
    delete from project_schedule_items where report_id = v_report_id;
    delete from project_budget_items where report_id = v_report_id;
  end if;

  begin
    if v_report_type = 'cell_leader'
      and v_selected_cell_id is not null
      and (cardinality(v_attendance_present_ids) > 0 or cardinality(v_attendance_absent_ids) > 0)
      and v_attendance_date is not null
    then
      delete from attendance_records where report_id = v_report_id;

      if cardinality(v_attendance_present_ids) > 0 then
        insert into attendance_records (
          member_id, report_id, attendance_date, attendance_type, is_present, checked_by, checked_via
        )
        select
          member_id,
          v_report_id,
          v_attendance_date,
          'meeting'::attendance_type,
          true,
          v_user_id,
          'cell_report'
        from unnest(v_attendance_present_ids) as member_id
        on conflict (member_id, attendance_date, attendance_type)
        do update set
          report_id = excluded.report_id,
          is_present = excluded.is_present,
          checked_by = excluded.checked_by,
          checked_via = excluded.checked_via,
          updated_at = now();
      end if;

      if cardinality(v_attendance_absent_ids) > 0 then
        delete from attendance_records
        where member_id = any(v_attendance_absent_ids)
          and attendance_date = v_attendance_date
          and attendance_type = 'meeting'
          and checked_via = 'cell_report';
      end if;
    end if;
  exception
    when others then
      v_warnings := array_append(v_warnings, 'Attendance records were not fully saved.');
  end;

  return jsonb_build_object(
    'reportId', v_report_id,
    'createdReportId', v_created_report_id,
    'warnings', to_jsonb(v_warnings)
  );
end;
$$;
