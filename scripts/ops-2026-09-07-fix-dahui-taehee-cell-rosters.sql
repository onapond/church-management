-- Data-only correction for the CU1 Dahui/Taehee attendance rosters.
-- Evidence: repeated cell-leader report attendee lists from 2026-02-22 through
-- 2026-07-26 identify these five members as Dahui cell.

begin;

do $$
declare
  v_department_id uuid;
  v_dahui_cell_id uuid;
  v_taehee_cell_id uuid;
  v_requested_count integer;
  v_requested_distinct_count integer;
  v_current_taehee_count integer;
  v_updated_count integer;
begin
  select id into strict v_department_id
  from public.departments
  where code = 'cu1';

  select id into strict v_dahui_cell_id
  from public.cells
  where department_id = v_department_id
    and name = '다희셀'
    and is_active = true;

  select id into strict v_taehee_cell_id
  from public.cells
  where department_id = v_department_id
    and name = '태희셀'
    and is_active = true;

  select count(*), count(distinct m.name)
  into v_requested_count, v_requested_distinct_count
  from public.members m
  join public.member_departments md
    on md.member_id = m.id
   and md.department_id = v_department_id
  where m.is_active = true
    and m.name in ('김동혁', '김은수', '도지수', '이다희', '장미화');

  if v_requested_count <> 5 or v_requested_distinct_count <> 5 then
    raise exception 'Expected five unique active CU1 Dahui members, found % rows / % names.',
      v_requested_count,
      v_requested_distinct_count;
  end if;

  select count(*) into v_current_taehee_count
  from public.members m
  join public.member_departments md
    on md.member_id = m.id
   and md.department_id = v_department_id
  where m.is_active = true
    and m.name in ('김동혁', '김은수', '도지수', '이다희', '장미화')
    and md.cell_id = v_taehee_cell_id;

  if v_current_taehee_count <> 5 then
    raise exception 'Expected all five Dahui members to be currently assigned to Taehee cell, found %.', v_current_taehee_count;
  end if;

  update public.member_departments md
  set cell_id = v_dahui_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and m.is_active = true
    and m.name in ('김동혁', '김은수', '도지수', '이다희', '장미화')
    and md.cell_id = v_taehee_cell_id;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 5 then
    raise exception 'Expected five CU1 member assignments to update, updated %.', v_updated_count;
  end if;
end;
$$;

do $$
declare
  v_dahui_count integer;
  v_taehee_misassigned_count integer;
begin
  select count(*) into v_dahui_count
  from public.members m
  join public.member_departments md on md.member_id = m.id
  join public.departments d on d.id = md.department_id
  join public.cells c on c.id = md.cell_id
  where d.code = 'cu1'
    and c.name = '다희셀'
    and m.is_active = true
    and m.name in ('김동혁', '김은수', '도지수', '이다희', '장미화');

  select count(*) into v_taehee_misassigned_count
  from public.members m
  join public.member_departments md on md.member_id = m.id
  join public.departments d on d.id = md.department_id
  join public.cells c on c.id = md.cell_id
  where d.code = 'cu1'
    and c.name = '태희셀'
    and m.is_active = true
    and m.name in ('김동혁', '김은수', '도지수', '이다희', '장미화');

  if v_dahui_count <> 5 or v_taehee_misassigned_count <> 0 then
    raise exception 'Roster verification failed: Dahui %, still in Taehee %.',
      v_dahui_count,
      v_taehee_misassigned_count;
  end if;
end;
$$;

commit;
