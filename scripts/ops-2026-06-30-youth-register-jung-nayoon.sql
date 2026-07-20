-- Operational data insert for 2026-06-30 youth department registration.
--
-- Target member:
-- - Name: Jung Nayoon
-- - Department: youth
-- - Birth date: 2011-11-29
-- - Address: Seoul Mapo-gu Gusu-dong
-- - Phone: 010-2881-5875
-- - School/affiliation: Sinsu Middle School
--
-- Run in Supabase SQL Editor or through Supabase MCP with an admin/PAT context.
-- This is data-only; it does not change schema, RLS, auth, attendance, report, or accounting logic.

begin;

do $$
declare
  v_department_id uuid;
  v_member_id uuid;
  v_duplicate_count int;
begin
  select id into v_department_id
  from public.departments
  where code = 'youth';

  if v_department_id is null then
    raise exception 'Youth department was not found.';
  end if;

  select count(*)::int into v_duplicate_count
  from public.members
  where is_active = true
    and (
      phone = '010-2881-5875'
      or (name = '정나윤' and birth_date = '2011-11-29')
    );

  if v_duplicate_count > 1 then
    raise exception 'Expected at most one matching active member for 정나윤, found %.', v_duplicate_count;
  end if;

  select id into v_member_id
  from public.members
  where is_active = true
    and (
      phone = '010-2881-5875'
      or (name = '정나윤' and birth_date = '2011-11-29')
    )
  order by created_at asc
  limit 1;

  if v_member_id is null then
    insert into public.members (
      name,
      phone,
      email,
      birth_date,
      address,
      occupation,
      guardian,
      department_id,
      is_active
    )
    values (
      '정나윤',
      '010-2881-5875',
      null,
      '2011-11-29',
      '서울 마포구 구수동',
      '신수중학교',
      null,
      v_department_id,
      true
    )
    returning id into v_member_id;
  else
    update public.members
    set
      name = '정나윤',
      phone = '010-2881-5875',
      birth_date = '2011-11-29',
      address = '서울 마포구 구수동',
      occupation = '신수중학교',
      department_id = v_department_id,
      is_active = true,
      updated_at = now()
    where id = v_member_id;
  end if;

  insert into public.member_departments (
    member_id,
    department_id,
    is_primary,
    cell_id
  )
  values (
    v_member_id,
    v_department_id,
    true,
    null
  )
  on conflict (member_id, department_id)
  do update set
    is_primary = true,
    cell_id = null;
end $$;

select
  m.id,
  m.name,
  m.phone,
  m.birth_date,
  m.address,
  m.occupation,
  d.code as department_code,
  d.name as department_name,
  md.is_primary
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
where d.code = 'youth'
  and m.name = '정나윤'
  and m.birth_date = '2011-11-29';

commit;
