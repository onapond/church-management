-- Operational data update for 2026-06-30 Jung Sungmo cell/access change.
--
-- Scope:
-- 1. Change Jung Sungmo from cell-leader position to regular member permissions.
-- 2. Block Jung Sungmo login access by setting public.users.is_active = false.
-- 3. Move Jung Sungmo's CU1 member record under Kang Mina's cell.
-- 4. Confirm Kim Sunwoong remains the CU1 department/team leader who can manage CU1 cells.
--
-- This is data-only; it does not change schema, RLS, auth, attendance, report, or accounting logic.

begin;

do $$
declare
  v_cu1_department_id uuid;
  v_jung_user_ids uuid[];
  v_jung_member_ids uuid[];
  v_kim_user_ids uuid[];
  v_mina_cell_ids uuid[];
  v_sungmo_cell_ids uuid[];
begin
  select id into v_cu1_department_id
  from public.departments
  where code = 'cu1';

  if v_cu1_department_id is null then
    raise exception 'CU1 department was not found.';
  end if;

  select array_agg(id order by id) into v_jung_user_ids
  from public.users
  where name = '정성모';

  if coalesce(array_length(v_jung_user_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one user named 정성모, found %.',
      coalesce(array_length(v_jung_user_ids, 1), 0);
  end if;

  select array_agg(id order by id) into v_jung_member_ids
  from public.members
  where name = '정성모'
    and is_active = true;

  if coalesce(array_length(v_jung_member_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active member named 정성모, found %.',
      coalesce(array_length(v_jung_member_ids, 1), 0);
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

  select array_agg(c.id order by c.id) into v_mina_cell_ids
  from public.cells c
  where c.department_id = v_cu1_department_id
    and c.name = '민아셀'
    and c.is_active = true;

  if coalesce(array_length(v_mina_cell_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active CU1 cell named 민아셀, found %.',
      coalesce(array_length(v_mina_cell_ids, 1), 0);
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

  update public.users
  set
    role = 'member',
    is_active = false,
    updated_at = now()
  where id = v_jung_user_ids[1];

  update public.user_departments
  set is_team_leader = false
  where user_id = v_jung_user_ids[1]
    and department_id = v_cu1_department_id;

  update public.members
  set
    department_id = v_cu1_department_id,
    updated_at = now()
  where id = v_jung_member_ids[1];

  insert into public.member_departments (
    member_id,
    department_id,
    is_primary,
    cell_id
  )
  values (
    v_jung_member_ids[1],
    v_cu1_department_id,
    true,
    v_mina_cell_ids[1]
  )
  on conflict (member_id, department_id)
  do update set
    is_primary = true,
    cell_id = excluded.cell_id;
end $$;

select
  u.id as user_id,
  u.name as user_name,
  u.email,
  u.role,
  u.is_active as user_is_active,
  ud.is_team_leader as user_department_is_team_leader,
  du.code as user_department_code
from public.users u
left join public.user_departments ud on ud.user_id = u.id
left join public.departments du on du.id = ud.department_id
where u.name = '정성모'
order by du.code;

select
  m.id as member_id,
  m.name as member_name,
  m.phone,
  d.code as department_code,
  d.name as department_name,
  c.name as cell_name,
  md.is_primary
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
left join public.cells c on c.id = md.cell_id
where m.name = '정성모'
order by d.code;

select
  u.id as user_id,
  u.name as user_name,
  u.role,
  u.is_active,
  d.code as department_code,
  d.name as department_name,
  ud.is_team_leader
from public.users u
join public.user_departments ud on ud.user_id = u.id
join public.departments d on d.id = ud.department_id
where u.name = '김선웅'
  and d.code = 'cu1';

commit;
