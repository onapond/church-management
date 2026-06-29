-- Recover activity gallery metadata for files that exist in Storage but are
-- missing from public.department_photos.
--
-- Data repair only. Run the preview SELECT first, review the rows, then run
-- the INSERT in Supabase SQL Editor with a privileged role.

-- 1) Preview rows that will be recovered.
with department_storage as (
  select
    name,
    to_timestamp((split_part(split_part(name, '/', 2), '_', 1)::numeric / 1000)) as inferred_created_at
  from storage.objects
  where bucket_id = 'department-photos'
),
department_photo_rows as (
  select split_part(photo_url, '/department-photos/', 2) as object_name
  from public.department_photos
),
orphans as (
  select
    s.name as object_name,
    split_part(s.name, '/', 1)::uuid as department_id,
    s.inferred_created_at as recovered_at
  from department_storage s
  left join department_photo_rows d on d.object_name = s.name
  join public.departments dept on dept.id = split_part(s.name, '/', 1)::uuid
  where d.object_name is null
)
select
  object_name,
  department_id,
  'https://zikneyjidzovvkmflibo.supabase.co/storage/v1/object/public/department-photos/' || object_name as photo_url,
  recovered_at::date as photo_date,
  recovered_at
from orphans
order by recovered_at desc;

-- 2) Insert missing metadata rows.
with department_storage as (
  select
    name,
    to_timestamp((split_part(split_part(name, '/', 2), '_', 1)::numeric / 1000)) as inferred_created_at
  from storage.objects
  where bucket_id = 'department-photos'
),
department_photo_rows as (
  select split_part(photo_url, '/department-photos/', 2) as object_name
  from public.department_photos
),
orphans as (
  select
    s.name as object_name,
    split_part(s.name, '/', 1)::uuid as department_id,
    s.inferred_created_at as recovered_at
  from department_storage s
  left join department_photo_rows d on d.object_name = s.name
  join public.departments dept on dept.id = split_part(s.name, '/', 1)::uuid
  where d.object_name is null
)
insert into public.department_photos (
  department_id,
  photo_url,
  title,
  description,
  photo_date,
  uploaded_by
)
select
  department_id,
  'https://zikneyjidzovvkmflibo.supabase.co/storage/v1/object/public/department-photos/' || object_name,
  null,
  'Recovered from Storage metadata audit',
  recovered_at::date,
  null
from orphans;
