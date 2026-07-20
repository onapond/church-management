-- Operational data update for 2026-07-02 CU1 cell assignment.
--
-- Scope:
-- 1. Assign active CU1 member "Han Suyeon B" to Taehee cell.
-- 2. Resolve "Taehee cell" either by an active CU1 cell named Taehee/Taehee cell,
--    or by the active CU1 member Lee Taehee's current CU1 cell.
--
-- This is data-only; it does not change schema, RLS, auth, attendance, report,
-- or accounting logic.
-- Run in Supabase SQL Editor or through Supabase Management API with an admin context.

begin;

do $$
declare
  v_cu1_department_id uuid;
  v_target_member_ids uuid[];
  v_named_cell_ids uuid[];
  v_lee_taehee_cell_ids uuid[];
  v_target_cell_id uuid;
begin
  select id into v_cu1_department_id
  from public.departments
  where code = 'cu1';

  if v_cu1_department_id is null then
    raise exception 'CU1 department was not found.';
  end if;

  select array_agg(m.id order by m.id) into v_target_member_ids
  from public.members m
  where replace(lower(m.name), ' ', '') in (
      lower(U&'\D55C\C218\C5F0b'),
      lower(U&'\D55C\C218\C5F0B')
    )
    and m.is_active = true;

  if coalesce(array_length(v_target_member_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one active member named Han Suyeon B, found %.',
      coalesce(array_length(v_target_member_ids, 1), 0);
  end if;

  select array_agg(c.id order by c.id) into v_named_cell_ids
  from public.cells c
  where c.department_id = v_cu1_department_id
    and c.is_active = true
    and replace(c.name, ' ', '') in (
      U&'\D0DC\D76C',
      U&'\D0DC\D76C\C140'
    );

  select array_agg(distinct md.cell_id order by md.cell_id) into v_lee_taehee_cell_ids
  from public.members m
  join public.member_departments md on md.member_id = m.id
  where m.name = U&'\C774\D0DC\D76C'
    and m.is_active = true
    and md.department_id = v_cu1_department_id
    and md.cell_id is not null;

  if coalesce(array_length(v_named_cell_ids, 1), 0) > 1 then
    raise exception 'Expected zero or one active CU1 cell named Taehee/Taehee cell, found %.',
      coalesce(array_length(v_named_cell_ids, 1), 0);
  end if;

  if coalesce(array_length(v_lee_taehee_cell_ids, 1), 0) <> 1 then
    raise exception 'Expected exactly one CU1 cell assigned to Lee Taehee, found %.',
      coalesce(array_length(v_lee_taehee_cell_ids, 1), 0);
  end if;

  if coalesce(array_length(v_named_cell_ids, 1), 0) = 1
     and v_named_cell_ids[1] <> v_lee_taehee_cell_ids[1] then
    raise exception 'Named Taehee cell and Lee Taehee current cell do not match.';
  end if;

  v_target_cell_id := v_lee_taehee_cell_ids[1];

  insert into public.member_departments (
    member_id,
    department_id,
    is_primary,
    cell_id
  )
  values (
    v_target_member_ids[1],
    v_cu1_department_id,
    true,
    v_target_cell_id
  )
  on conflict (member_id, department_id)
  do update set
    is_primary = true,
    cell_id = excluded.cell_id;

  update public.members
  set
    department_id = v_cu1_department_id,
    updated_at = now()
  where id = v_target_member_ids[1];
end $$;

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
where replace(lower(m.name), ' ', '') in (
    lower(U&'\D55C\C218\C5F0b'),
    lower(U&'\D55C\C218\C5F0B'),
    lower(U&'\C774\D0DC\D76C')
  )
  and d.code = 'cu1'
order by m.name;

commit;
