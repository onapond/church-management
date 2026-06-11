-- Operational data fix for 2026-06-11 1cheongnyeon team leader request.
--
-- Scope:
-- 1. Assign Do Jisu to Dahui cell and Park Cheolho to Mina cell in CU1.
-- 2. Mark existing pending CU1 cell-leader reports as final_approved.
--
-- Run in Supabase SQL Editor or through Supabase MCP with an admin/PAT context.
-- This is data-only; it does not change schema, RLS, auth, attendance, or accounting logic.

begin;

-- Before snapshot.
select
  'before_pending_cu1_cell_leader_reports' as check_name,
  count(*)::int as count
from public.weekly_reports wr
join public.departments d on d.id = wr.department_id
where d.code = 'cu1'
  and wr.report_type = 'cell_leader'
  and wr.status = 'submitted';

-- Assign requested members to cells. The block fails loudly if a name/cell is ambiguous.
do $$
declare
  item record;
  v_department_id uuid;
  v_member_ids uuid[];
  v_cell_ids uuid[];
begin
  select id into v_department_id
  from public.departments
  where code = 'cu1';

  if v_department_id is null then
    raise exception 'CU1 department was not found.';
  end if;

  for item in
    select *
    from (values
      ('도지수', '다희셀'),
      ('박철호', '민아셀')
    ) as requested(member_name, cell_name)
  loop
    select array_agg(id order by id) into v_member_ids
    from public.members
    where name = item.member_name
      and is_active = true;

    if coalesce(array_length(v_member_ids, 1), 0) <> 1 then
      raise exception 'Expected exactly one active member named %, found %.',
        item.member_name,
        coalesce(array_length(v_member_ids, 1), 0);
    end if;

    select array_agg(id order by id) into v_cell_ids
    from public.cells
    where department_id = v_department_id
      and name = item.cell_name
      and is_active = true;

    if coalesce(array_length(v_cell_ids, 1), 0) <> 1 then
      raise exception 'Expected exactly one active CU1 cell named %, found %.',
        item.cell_name,
        coalesce(array_length(v_cell_ids, 1), 0);
    end if;

    insert into public.member_departments (member_id, department_id, is_primary, cell_id)
    values (v_member_ids[1], v_department_id, false, v_cell_ids[1])
    on conflict (member_id, department_id)
    do update set cell_id = excluded.cell_id;
  end loop;
end $$;

do $$
declare
  v_approver_count int;
begin
  select count(*)::int into v_approver_count
  from public.users u
  join public.user_departments ud on ud.user_id = u.id
  join public.departments d on d.id = ud.department_id
  where d.code = 'cu1'
    and ud.is_team_leader = true
    and u.is_active = true
    and u.name = '김선용';

  if v_approver_count <> 1 then
    raise exception 'Expected exactly one active CU1 team leader named 김선용, found %.', v_approver_count;
  end if;
end $$;

-- Approve only CU1 cell-leader reports that are currently pending with the team leader.
-- Existing final_approved approval_history rows are reused when present.
with approver as (
  select u.id
  from public.users u
  join public.user_departments ud on ud.user_id = u.id
  join public.departments d on d.id = ud.department_id
  where d.code = 'cu1'
    and ud.is_team_leader = true
    and u.is_active = true
    and u.name = '김선용'
  limit 1
),
pending as (
  select wr.id
  from public.weekly_reports wr
  join public.departments d on d.id = wr.department_id
  where d.code = 'cu1'
    and wr.report_type = 'cell_leader'
    and wr.status = 'submitted'
),
latest_history as (
  select distinct on (ah.report_id)
    ah.report_id,
    ah.approver_id,
    ah.created_at,
    ah.comment
  from public.approval_history ah
  join pending p on p.id = ah.report_id
  where ah.to_status = 'final_approved'
  order by ah.report_id, ah.created_at desc
),
updated as (
  update public.weekly_reports wr
  set
    status = 'final_approved',
    final_approver_id = coalesce(lh.approver_id, (select id from approver)),
    final_approved_at = coalesce(lh.created_at, now()),
    final_comment = coalesce(lh.comment, '1청년 팀장 요청에 따른 기존 대기 보고서 일괄 승인'),
    updated_at = now()
  from pending p
  left join latest_history lh on lh.report_id = p.id
  where wr.id = p.id
    and (select id from approver) is not null
  returning wr.id
),
inserted_history as (
  insert into public.approval_history (report_id, approver_id, from_status, to_status, comment)
  select
    u.id,
    (select id from approver),
    'submitted',
    'final_approved',
    '1청년 팀장 요청에 따른 기존 대기 보고서 일괄 승인'
  from updated u
  where not exists (
    select 1
    from latest_history lh
    where lh.report_id = u.id
  )
  returning report_id
)
select
  (select count(*)::int from updated) as approved_reports,
  (select count(*)::int from inserted_history) as inserted_approval_history_rows;

-- After snapshots.
select
  m.name as member_name,
  c.name as cell_name
from public.members m
join public.member_departments md on md.member_id = m.id
join public.departments d on d.id = md.department_id
left join public.cells c on c.id = md.cell_id
where d.code = 'cu1'
  and m.name in ('도지수', '박철호')
order by m.name;

select
  'after_pending_cu1_cell_leader_reports' as check_name,
  count(*)::int as count
from public.weekly_reports wr
join public.departments d on d.id = wr.department_id
where d.code = 'cu1'
  and wr.report_type = 'cell_leader'
  and wr.status = 'submitted';

commit;
