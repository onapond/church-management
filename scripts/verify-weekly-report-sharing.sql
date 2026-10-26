-- Weekly + worship sharing regression; no report content is returned.
-- Read real rows as each existing account's authenticated role; never return report content.
-- Update/delete probes target only foreign weekly rows and must affect zero rows.
-- Always roll back; assertions abort on any unexpected access.
begin;
do $$
declare
  person record;
  expected uuid[];
  actual uuid[];
  expected_children uuid[];
  actual_children uuid[];
  child_table text;
  foreign_weekly uuid;
  affected integer;
  total_users integer := 0;
  department_leaders integer := 0;
  cell_leaders integer := 0;
  inactive_users integer := 0;
  write_probes integer := 0;
  shared_weekly integer := 0;
  result jsonb;
begin
  for person in select u.id,u.role,u.is_active,
    exists(select 1 from public.user_departments ud where ud.user_id=u.id and ud.is_team_leader) as is_department_leader,
    exists(select 1 from public.user_departments ud join public.departments d on d.id=ud.department_id where ud.user_id=u.id and (ud.is_team_leader or (u.role::text='team_leader' and d.code::text in ('youth','ck','cu2','CU','cu_worship')))) as is_sharing_reader
    from public.users u order by u.id
  loop
    select coalesce(array_agg(r.id order by r.id),'{}'::uuid[]) into expected
    from public.weekly_reports r
    where r.author_id=person.id
       or (person.is_active and person.role::text in ('super_admin','president','accountant'))
       or (person.is_active and r.status<>'draft' and exists(
           select 1 from public.user_departments ud where ud.user_id=person.id and ud.department_id=r.department_id and ud.is_team_leader))
       or (person.is_active and person.is_sharing_reader and r.status<>'draft' and (r.report_type='weekly' or (r.report_type='meeting' and r.department_id in (select id from public.departments where code::text in ('CU','cu_worship')))));

    perform set_config('request.jwt.claim.sub',person.id::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',person.id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    execute 'select coalesce(array_agg(id order by id),''{}''::uuid[]) from public.weekly_reports' into actual;
    execute 'reset role';
    if actual is distinct from expected then
      raise exception 'RLS report mismatch for role %, leader %, active % (expected %, actual %)',person.role,person.is_department_leader,person.is_active,cardinality(expected),cardinality(actual);
    end if;

    foreach child_table in array array['report_programs','newcomers','report_photos'] loop
      execute format('select coalesce(array_agg(id order by id),''{}''::uuid[]) from public.%I where report_id=any($1)',child_table) into expected_children using expected;
      execute 'set local role authenticated';
      execute format('select coalesce(array_agg(id order by id),''{}''::uuid[]) from public.%I',child_table) into actual_children;
      execute 'reset role';
      if actual_children is distinct from expected_children then
        raise exception 'RLS child mismatch: % role %',child_table,person.role;
      end if;
    end loop;

    if person.is_active and person.is_sharing_reader and person.role::text not in ('super_admin','president','accountant') then
      department_leaders := department_leaders+1;
      select r.id into foreign_weekly from public.weekly_reports r
      where r.report_type='weekly' and r.status<>'draft' and r.author_id<>person.id
        and not exists(select 1 from public.user_departments ud where ud.user_id=person.id and ud.department_id=r.department_id and ud.is_team_leader)
      limit 1;
      if foreign_weekly is not null then
        if not foreign_weekly=any(actual) then raise exception 'Shared weekly is missing'; end if;
        shared_weekly := shared_weekly+1;
        execute 'set local role authenticated';
        execute 'update public.weekly_reports set report_date=report_date where id=$1' using foreign_weekly;
        get diagnostics affected = row_count;
        if affected<>0 then raise exception 'Unexpected UPDATE permission'; end if;
        execute 'delete from public.weekly_reports where id=$1' using foreign_weekly;
        get diagnostics affected = row_count;
        if affected<>0 then raise exception 'Unexpected DELETE permission'; end if;
        execute 'reset role';
        write_probes := write_probes+2;
      end if;
    elsif person.role::text='team_leader' and not person.is_sharing_reader then
      cell_leaders := cell_leaders+1;
    end if;
    if not person.is_active then inactive_users := inactive_users+1; end if;
    total_users := total_users+1;
  end loop;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon';
  execute 'select coalesce(array_agg(id order by id),''{}''::uuid[]) from public.weekly_reports' into actual;
  execute 'reset role';
  if cardinality(actual)<>0 then raise exception 'Unexpected anonymous access'; end if;
  result=jsonb_build_object('users_checked',total_users,'sharing_readers',department_leaders,'ordinary_cell_leaders',cell_leaders,'inactive_users',inactive_users,'cross_department_weekly_checks',shared_weekly,'denied_write_probes',write_probes,'child_tables_per_user',3,'anonymous_reports',cardinality(actual),'result','PASS');
  perform set_config('church.rls_verification',result::text,true);
end $$;
select current_setting('church.rls_verification')::jsonb as verification;
rollback;
