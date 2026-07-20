-- Fix report photo upload Storage policies.
--
-- Report photo files are uploaded under:
--   report-photos/{reportId}/{timestamp}_{index}.{ext}
--
-- The app first saves the report row, then uploads files and inserts
-- report_photos metadata. Storage policies therefore need to authorize by the
-- report id embedded in the object path, not by a department-specific path.

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  true,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = true,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report_photos_storage_select" on storage.objects;
create policy "report_photos_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    where r.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "report_photos_storage_insert_author" on storage.objects;
create policy "report_photos_storage_insert_author"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-photos'
  and array_length(storage.foldername(name), 1) >= 1
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(name))[1]
      and u.is_active = true
      and (
        r.author_id = auth.uid()
        or u.role in ('super_admin', 'president', 'accountant')
      )
  )
);

drop policy if exists "report_photos_storage_update_author" on storage.objects;
create policy "report_photos_storage_update_author"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(name))[1]
      and u.is_active = true
      and (
        r.author_id = auth.uid()
        or u.role in ('super_admin', 'president', 'accountant')
      )
  )
)
with check (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(name))[1]
      and u.is_active = true
      and (
        r.author_id = auth.uid()
        or u.role in ('super_admin', 'president', 'accountant')
      )
  )
);

drop policy if exists "report_photos_storage_delete_author" on storage.objects;
create policy "report_photos_storage_delete_author"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(name))[1]
      and u.is_active = true
      and (
        r.author_id = auth.uid()
        or u.role in ('super_admin', 'president', 'accountant')
      )
  )
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'report_photos'
  ) then
    execute 'alter table public.report_photos enable row level security';

    execute 'drop policy if exists "report_photos_select" on public.report_photos';
    execute 'create policy "report_photos_select" on public.report_photos for select to authenticated using (
      exists (
        select 1
        from public.weekly_reports r
        where r.id = report_photos.report_id
      )
    )';

    execute 'drop policy if exists "report_photos_modify" on public.report_photos';
    execute 'create policy "report_photos_modify" on public.report_photos for all to authenticated using (
      exists (
        select 1
        from public.weekly_reports r
        join public.users u on u.id = auth.uid()
        where r.id = report_photos.report_id
          and u.is_active = true
          and (
            r.author_id = auth.uid()
            or u.role in (''super_admin'', ''president'', ''accountant'')
          )
      )
    ) with check (
      exists (
        select 1
        from public.weekly_reports r
        join public.users u on u.id = auth.uid()
        where r.id = report_photos.report_id
          and u.is_active = true
          and (
            r.author_id = auth.uid()
            or u.role in (''super_admin'', ''president'', ''accountant'')
          )
      )
    )';
  end if;
end $$;
