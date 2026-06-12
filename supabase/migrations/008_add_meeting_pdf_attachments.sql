alter table public.meeting_minutes
  add column if not exists pdf_file_path text,
  add column if not exists pdf_file_name text,
  add column if not exists pdf_file_size bigint,
  add column if not exists pdf_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meeting-pdfs', 'meeting-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meeting_pdfs_select_active_users" on storage.objects;
create policy "meeting_pdfs_select_active_users"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
);

drop policy if exists "meeting_pdfs_insert_editors" on storage.objects;
create policy "meeting_pdfs_insert_editors"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
);

drop policy if exists "meeting_pdfs_update_editors" on storage.objects;
create policy "meeting_pdfs_update_editors"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
)
with check (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
);

drop policy if exists "meeting_pdfs_delete_editors" on storage.objects;
create policy "meeting_pdfs_delete_editors"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
);
