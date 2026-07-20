-- Operational data update for 2026-07-01 Sungmo cell rename.
--
-- Scope:
-- 1. Rename the active CU1 cell named '성모셀' to '선웅셀'.
-- 2. Keep Kim Sunwoong as the active CU1 team leader and assign his member row to the renamed cell.
-- 3. Verify Jung Sungmo is no longer assigned to the renamed cell.
--
-- This is data-only; it does not change schema, RLS, auth, attendance, report, or accounting logic.
-- Run in Supabase SQL Editor or through Supabase MCP/Management API with an admin context.

begin;

do $$
declare
  v_cu1_department_id uuid;
  v_kim_user_ids uuid[];
  v_kim_member_ids uuid[];
  v_sungmo_cell_ids uuid[];
  v_renamed_cell_ids uuid[];
  v_sungmo_members_in_old_cell int;
begin
  select id into v_cu1_department_id
  from public.departments
  where code = 'cu1';

  if v_cu1_department_id is null then
    raise exception 'CU1 department was not found.';
  end if;

  select array_agg(id order by id) into v_kim_user_ids
  from public.users
  where name = '김선웅'
    and is_active = true
    and role = 'team_leader';

  if coalesce(array_length(v_kim_user_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active team_leader user named 김선웅, found %.',
      coalesce(array_length(v_kim_user_ids, 1), 0);
  end if;

  if not exists (
    select 1
    from public.user_departments
    where user_id = v_kim_user_ids[1]
      and department_id = v_cu1_department_id
      and is_team_leader = true
  ) then
    raise exception '김선웅 is not marked as CU1 team leader.';
  end if;

  select array_agg(id order by id) into v_kim_member_ids
  from public.members
  where name = '김선웅'
    and is_active = true;

  if coalesce(array_length(v_kim_member_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active member named 김선웅, found %.',
      coalesce(array_length(v_kim_member_ids, 1), 0);
  end if;

  select array_agg(c.id order by c.id) into v_sungmo_cell_ids
  from public.cells c
  where c.department_id = v_cu1_department_id
    and c.name = '성모셀'
    and c.is_active = true;

  if coalesce(array_length(v_sungmo_cell_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active CU1 cell named 성모셀, found %.',
      coalesce(array_length(v_sungmo_cell_ids, 1), 0);
  end if;

  select array_agg(c.id order by c.id) into v_renamed_cell_ids
  from public.cells c
  where c.department_id = v_cu1_department_id
    and c.name = '선웅셀'
    and c.is_active = true;

  if coalesce(array_length(v_renamed_cell_ids, 1), 0) > 0 then
    raise exception 'An active CU1 cell named 선웅셀 already exists.';
  end if;

  select count(*)::int into v_sungmo_members_in_old_cell
  from public.members m
  join public.member_departments md on md.member_id = m.id
  where m.name = '정성모'
    and md.department_id = v_cu1_department_id
    and md.cell_id = v_sungmo_cell_ids[1];

  if v_sungmo_members_in_old_cell <> 0 then
    raise exception '정성모 is still assigned to 성모셀; move him before renaming.';
  end if;

  update public.cells
  set
    name = '선웅셀',
    updated_at = now()
  where id = v_sungmo_cell_ids[1];

  update public.members
  set
    department_id = v_cu1_department_id,
    updated_at = now()
  where id = v_kim_member_ids[1];

  insert into public.member_departments (
    member_id,
    department_id,
    is_primary,
    cell_id
  )
  values (
    v_kim_member_ids[1],
    v_cu1_department_id,
    true,
    v_sungmo_cell_ids[1]
  )
  on conflict (member_id, department_id)
  do update set
    is_primary = true,
    cell_id = excluded.cell_id;
end $$;

select
  c.id as cell_id,
  c.name as cell_name,
  d.code as department_code,
  c.display_order,
  c.is_active,
  c.updated_at
from public.cells c
join public.departments d on d.id = c.department_id
where d.code = 'cu1'
  and c.name in ('성모셀', '선웅셀')
order by c.display_order, c.name;

select
  u.id as user_id,
  u.name as user_name,
  u.role,
  u.is_active,
  d.code as department_code,
  ud.is_team_leader
from public.users u
join public.user_departments ud on ud.user_id = u.id
join public.departments d on d.id = ud.department_id
where u.name = '김선웅'
  and d.code = 'cu1';

select
  m.id as member_id,
  m.name as member_name,
  d.code as department_code,
  c.name as cell_name,
  md.is_primary
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
left join public.cells c on c.id = md.cell_id
where m.name = '김선웅'
order by d.code;

select
  m.id as member_id,
  m.name as member_name,
  d.code as department_code,
  c.name as cell_name,
  md.is_primary
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
left join public.cells c on c.id = md.cell_id
where m.name = '정성모'
order by d.code;

commit;
