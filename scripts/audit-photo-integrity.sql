-- Photo upload integrity audit.
-- Read-only. Run in Supabase SQL Editor with a privileged role.
-- Returns one result grid so Supabase SQL Editor screenshots include every check.

with report_storage as (
  select name
  from storage.objects
  where bucket_id = 'report-photos'
),
department_storage as (
  select
    name,
    to_timestamp((split_part(split_part(name, '/', 2), '_', 1)::numeric / 1000)) as inferred_created_at
  from storage.objects
  where bucket_id = 'department-photos'
),
report_photo_rows as (
  select
    id,
    report_id,
    photo_url,
    split_part(photo_url, '/report-photos/', 2) as object_name,
    created_at
  from public.report_photos
),
department_photo_rows as (
  select
    id,
    department_id,
    photo_url,
    split_part(photo_url, '/department-photos/', 2) as object_name,
    created_at
  from public.department_photos
),
report_recent as (
  select *
  from report_photo_rows
  order by created_at desc
  limit 20
),
department_recent as (
  select *
  from department_photo_rows
  order by created_at desc
  limit 20
),
department_storage_orphans as (
  select
    s.name as object_name,
    split_part(s.name, '/', 1)::uuid as department_id,
    s.inferred_created_at as created_at
  from department_storage s
  left join department_photo_rows d on d.object_name = s.name
  where d.id is null
)
select
  'summary' as section,
  'report_photos table rows' as check_name,
  count(*)::text as value,
  null::uuid as id,
  null::uuid as owner_id,
  null::text as object_name,
  null::timestamptz as created_at
from report_photo_rows
union all
select
  'summary',
  'report-photos storage objects',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from report_storage
union all
select
  'summary',
  'report table rows missing storage object',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from report_photo_rows r
left join report_storage s on s.name = r.object_name
where s.name is null
union all
select
  'summary',
  'report storage objects missing table row',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from report_storage s
left join report_photo_rows r on r.object_name = s.name
where r.id is null
union all
select
  'summary',
  'department_photos table rows',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from department_photo_rows
union all
select
  'summary',
  'department-photos storage objects',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from department_storage
union all
select
  'summary',
  'department table rows missing storage object',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from department_photo_rows d
left join department_storage s on s.name = d.object_name
where s.name is null
union all
select
  'summary',
  'department storage objects missing table row',
  count(*)::text,
  null::uuid,
  null::uuid,
  null::text,
  null::timestamptz
from department_storage s
left join department_photo_rows d on d.object_name = s.name
where d.id is null
union all
select
  'recent_report_photos',
  'recent row',
  null::text,
  id,
  report_id,
  object_name,
  created_at
from report_recent
union all
select
  'recent_department_photos',
  'recent row',
  null::text,
  id,
  department_id,
  object_name,
  created_at
from department_recent
union all
select
  'orphan_department_storage',
  'storage object missing department_photos row',
  null::text,
  null::uuid,
  department_id,
  object_name,
  created_at
from department_storage_orphans
order by section, created_at desc nulls first, check_name;
