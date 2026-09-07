-- One-shot, guarded CU1 roster assignment requested on 2026-09-07.
--
-- Assignments:
--   김선웅 -> existing 선웅셀
--   이현진 -> existing 현진셀
--   김효정 -> remain unassigned (active CU1 team leader)
--   Remaining ten members -> newly created 태신자셀
--
-- This script intentionally fails after a successful run instead of creating a
-- duplicate cell or moving already-assigned members on a second invocation.

begin;

do $$
declare
  v_department_id uuid;
  v_sunwoong_cell_id uuid;
  v_hyunjin_cell_id uuid;
  v_newcomer_cell_id uuid;
  v_unassigned_names text[];
  v_newcomer_names text[];
  v_team_leader_count integer;
  v_existing_newcomer_cell_count integer;
  v_updated_count integer;
begin
  select id into strict v_department_id
  from public.departments
  where code = 'cu1';

  select id into strict v_sunwoong_cell_id
  from public.cells
  where department_id = v_department_id
    and name = '선웅셀'
    and is_active = true;

  select id into strict v_hyunjin_cell_id
  from public.cells
  where department_id = v_department_id
    and name = '현진셀'
    and is_active = true;

  select count(*) into v_existing_newcomer_cell_count
  from public.cells
  where department_id = v_department_id
    and name = '태신자셀';

  if v_existing_newcomer_cell_count <> 0 then
    raise exception 'Expected no existing CU1 Tae-sinja cell, found % rows.',
      v_existing_newcomer_cell_count;
  end if;

  select array_agg(m.name order by m.name) into v_unassigned_names
  from public.member_departments md
  join public.members m on m.id = md.member_id
  where md.department_id = v_department_id
    and md.cell_id is null
    and m.is_active = true;

  if v_unassigned_names is distinct from array[
    '구현서',
    '김민호',
    '김선웅',
    '김영효',
    '김지솔',
    '김효정',
    '박수빈',
    '송준선',
    '신원주',
    '우현승',
    '이현진',
    '장성재',
    '현수빈'
  ]::text[] then
    raise exception 'CU1 active unassigned roster changed; refusing update. Current roster: %',
      v_unassigned_names;
  end if;

  select count(*) into v_team_leader_count
  from public.users u
  join public.user_departments ud
    on ud.user_id = u.id
   and ud.department_id = v_department_id
  where u.name = '김효정'
    and u.is_active = true
    and u.role = 'team_leader'
    and ud.is_team_leader = true;

  if v_team_leader_count <> 1 then
    raise exception 'Expected one active CU1 team leader user named Kim Hyo-jeong, found %.',
      v_team_leader_count;
  end if;

  insert into public.cells (department_id, name, display_order, is_active)
  values (
    v_department_id,
    '태신자셀',
    (select coalesce(max(display_order), 0) + 1 from public.cells where department_id = v_department_id),
    true
  )
  returning id into v_newcomer_cell_id;

  update public.member_departments md
  set cell_id = v_sunwoong_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id is null
    and m.is_active = true
    and m.name = '김선웅';

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one unassigned active CU1 Kim Sun-woong row, updated %.',
      v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_hyunjin_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id is null
    and m.is_active = true
    and m.name = '이현진';

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one unassigned active CU1 Lee Hyun-jin row, updated %.',
      v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_newcomer_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id is null
    and m.is_active = true
    and m.name in (
      '구현서',
      '김민호',
      '김영효',
      '김지솔',
      '박수빈',
      '송준선',
      '신원주',
      '우현승',
      '장성재',
      '현수빈'
    );

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 10 then
    raise exception 'Expected ten active CU1 Tae-sinja assignments, updated %.',
      v_updated_count;
  end if;

  select array_agg(m.name order by m.name) into v_newcomer_names
  from public.member_departments md
  join public.members m on m.id = md.member_id
  where md.department_id = v_department_id
    and md.cell_id = v_newcomer_cell_id
    and m.is_active = true;

  if v_newcomer_names is distinct from array[
    '구현서',
    '김민호',
    '김영효',
    '김지솔',
    '박수빈',
    '송준선',
    '신원주',
    '우현승',
    '장성재',
    '현수빈'
  ]::text[] then
    raise exception 'Tae-sinja roster verification failed: %', v_newcomer_names;
  end if;

  select array_agg(m.name order by m.name) into v_unassigned_names
  from public.member_departments md
  join public.members m on m.id = md.member_id
  where md.department_id = v_department_id
    and md.cell_id is null
    and m.is_active = true;

  if v_unassigned_names is distinct from array['김효정']::text[] then
    raise exception 'Expected only Kim Hyo-jeong to remain unassigned, found %.',
      v_unassigned_names;
  end if;
end;
$$;

commit;
