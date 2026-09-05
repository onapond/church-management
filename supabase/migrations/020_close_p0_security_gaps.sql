-- Close the remaining P0 audit findings without changing attendance/report/accounting data flows.

-- P0-1: the canonical approval flag is users.is_active and new accounts must be inactive.
alter table public.users alter column is_active set default false;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role::text from public.users u where u.id = auth.uid()
$$;

create or replace function public.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active = true
  )
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant')
  )
$$;

revoke all on function public.get_my_role() from public;
revoke all on function public.is_current_user_active() from public;
revoke all on function public.is_admin_role() from public;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_current_user_active() to authenticated;
grant execute on function public.is_admin_role() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'member',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Replace the legacy policy before removing its is_approved dependency. The
-- self-service branch cannot change role or activate a pending account.
drop policy if exists "Allow insert for trigger" on public.users;
drop policy if exists "Users can view all users" on public.users;
drop policy if exists "Users can view own data" on public.users;
drop policy if exists "users_select" on public.users;
drop policy if exists "users_insert" on public.users;
drop policy if exists "Admin can update users" on public.users;
drop policy if exists "Users can update own or admin all" on public.users;
drop policy if exists "users_update_self" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_update_self_profile" on public.users;
drop policy if exists "users_update_active_admin" on public.users;

create policy "users_select_authenticated"
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or public.is_current_user_active()
);

create policy "users_update_self_profile"
on public.users
for update
to authenticated
using (
  id = auth.uid()
  and is_active = true
)
with check (
  id = auth.uid()
  and is_active = true
  and role::text = public.get_my_role()
);

create policy "users_update_active_admin"
on public.users
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president')
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president')
  )
);

alter table public.users drop column if exists is_approved;

-- P0-3: visitations are visible only to their creator, global admins, or department leaders.
drop policy if exists "visitations_select" on public.visitations;
drop policy if exists "visitations_select_authenticated" on public.visitations;
drop policy if exists "visitations_select_scoped" on public.visitations;
drop policy if exists "visitations_insert_authenticated" on public.visitations;
drop policy if exists "visitations_insert_active" on public.visitations;
drop policy if exists "visitations_update_own" on public.visitations;
drop policy if exists "visitations_update_own_active" on public.visitations;
drop policy if exists "visitations_delete_own" on public.visitations;
drop policy if exists "visitations_delete_own_active" on public.visitations;
create policy "visitations_select_scoped"
on public.visitations
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        visitations.created_by = u.id
        or u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = visitations.department_id
            and ud.is_team_leader = true
        )
      )
  )
);

create policy "visitations_insert_active"
on public.visitations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_current_user_active()
);

create policy "visitations_update_own_active"
on public.visitations
for update
to authenticated
using (
  created_by = auth.uid()
  and public.is_current_user_active()
)
with check (
  created_by = auth.uid()
  and public.is_current_user_active()
);

create policy "visitations_delete_own_active"
on public.visitations
for delete
to authenticated
using (
  created_by = auth.uid()
  and public.is_current_user_active()
);

-- P0-6: team leaders may edit member data, but only global admins may delete members
-- or remove existing department links.
drop policy if exists "members_delete_teamlead" on public.members;
drop policy if exists "members_insert_teamlead" on public.members;
drop policy if exists "members_modify_teamlead" on public.members;

create policy "members_insert_teamlead"
on public.members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_departments ud
    where ud.user_id = auth.uid()
      and ud.is_team_leader = true
  )
  and public.is_current_user_active()
);

create policy "members_modify_teamlead"
on public.members
for update
to authenticated
using (
  exists (
    select 1
    from public.member_departments md
    join public.user_departments ud on ud.department_id = md.department_id
    where md.member_id = members.id
      and ud.user_id = auth.uid()
      and ud.is_team_leader = true
  )
  and public.is_current_user_active()
)
with check (public.is_current_user_active());

drop policy if exists "member_departments_modify_teamlead" on public.member_departments;
drop policy if exists "member_departments_insert_teamlead" on public.member_departments;
drop policy if exists "member_departments_update_teamlead" on public.member_departments;

create policy "member_departments_insert_teamlead"
on public.member_departments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_departments ud
    join public.users u on u.id = ud.user_id
    where ud.user_id = auth.uid()
      and ud.department_id = member_departments.department_id
      and ud.is_team_leader = true
      and u.is_active = true
  )
);

create policy "member_departments_update_teamlead"
on public.member_departments
for update
to authenticated
using (
  exists (
    select 1
    from public.user_departments ud
    join public.users u on u.id = ud.user_id
    where ud.user_id = auth.uid()
      and ud.department_id = member_departments.department_id
      and ud.is_team_leader = true
      and u.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.user_departments ud
    join public.users u on u.id = ud.user_id
    where ud.user_id = auth.uid()
      and ud.department_id = member_departments.department_id
      and ud.is_team_leader = true
      and u.is_active = true
  )
);

-- P0-7: validate both agenda and minutes paths; no unknown path falls through to true.
create or replace function public.can_manage_meeting_pdf(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        (
          split_part(object_name, '/', 1) = 'agenda'
          and split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and split_part(object_name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and exists (
            select 1 from public.meetings m
            where m.id = split_part(object_name, '/', 2)::uuid
          )
          and (
            u.role in ('super_admin', 'president', 'accountant')
            or (
              u.role = 'team_leader'
              and exists (
                select 1 from public.user_departments ud
                where ud.user_id = u.id
                  and ud.department_id = split_part(object_name, '/', 3)::uuid
              )
            )
          )
        )
        or (
          split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and exists (
            select 1
            from public.meetings m
            where m.id = split_part(object_name, '/', 1)::uuid
              and (
                m.created_by = u.id
                or u.role in ('super_admin', 'president', 'accountant')
                or exists (
                  select 1 from public.user_departments ud
                  where ud.user_id = u.id
                    and ud.department_id = m.department_id
                    and ud.is_team_leader = true
                )
              )
          )
        )
      )
  );
$$;

revoke all on function public.can_manage_meeting_pdf(text) from public;
grant execute on function public.can_manage_meeting_pdf(text) to authenticated;

drop policy if exists "meeting_pdfs_insert_editors" on storage.objects;
create policy "meeting_pdfs_insert_editors"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meeting-pdfs'
  and public.can_manage_meeting_pdf(storage.objects.name)
);

drop policy if exists "meeting_pdfs_update_editors" on storage.objects;
create policy "meeting_pdfs_update_editors"
on storage.objects for update to authenticated
using (
  bucket_id = 'meeting-pdfs'
  and public.can_manage_meeting_pdf(storage.objects.name)
)
with check (
  bucket_id = 'meeting-pdfs'
  and public.can_manage_meeting_pdf(storage.objects.name)
);

drop policy if exists "meeting_pdfs_delete_editors" on storage.objects;
create policy "meeting_pdfs_delete_editors"
on storage.objects for delete to authenticated
using (
  bucket_id = 'meeting-pdfs'
  and public.can_manage_meeting_pdf(storage.objects.name)
);

-- P0-8: store stable object paths, make photo buckets private, and sign URLs at read time.
update public.members
set photo_url = regexp_replace(
  split_part(photo_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/member-photos/',
  ''
)
where photo_url ~ '/storage/v1/object/(public|sign|authenticated)/member-photos/';

update public.department_photos
set photo_url = regexp_replace(
  split_part(photo_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/department-photos/',
  ''
)
where photo_url ~ '/storage/v1/object/(public|sign|authenticated)/department-photos/';

update public.report_photos
set photo_url = regexp_replace(
  split_part(photo_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/report-photos/',
  ''
)
where photo_url ~ '/storage/v1/object/(public|sign|authenticated)/report-photos/';

update storage.buckets
set public = false
where id in ('member-photos', 'department-photos', 'report-photos');

-- Remove the legacy anonymous/public policies using their production names.
drop policy if exists "Allow all n2mp78_0" on storage.objects;
drop policy if exists "Allow all n2mp78_1" on storage.objects;
drop policy if exists "Allow all n2mp78_2" on storage.objects;
drop policy if exists "Allow all n2mp78_3" on storage.objects;
drop policy if exists "Authenticated delete" on storage.objects;
drop policy if exists "Authenticated upload" on storage.objects;
drop policy if exists "Public read access" on storage.objects;
drop policy if exists "Auth delete" on storage.objects;
drop policy if exists "Auth upload" on storage.objects;
drop policy if exists "Public read" on storage.objects;
drop policy if exists "Auth delete report-photos" on storage.objects;
drop policy if exists "Auth upload report-photos" on storage.objects;
drop policy if exists "Public read report-photos" on storage.objects;

drop policy if exists "member_photos_select_active" on storage.objects;
create policy "member_photos_select_active"
on storage.objects for select to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active = true
  )
);

drop policy if exists "department_photos_select_active" on storage.objects;
create policy "department_photos_select_active"
on storage.objects for select to authenticated
using (
  bucket_id = 'department-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active = true
  )
);

-- Replace any broad legacy photo write policies with active editor policies.
drop policy if exists "member_photos_insert" on storage.objects;
drop policy if exists "member_photos_update" on storage.objects;
drop policy if exists "member_photos_delete" on storage.objects;
drop policy if exists "member_photos_authenticated_insert" on storage.objects;
drop policy if exists "member_photos_authenticated_update" on storage.objects;
drop policy if exists "member_photos_authenticated_delete" on storage.objects;
drop policy if exists "member_photos_insert_editors" on storage.objects;
drop policy if exists "member_photos_update_editors" on storage.objects;
drop policy if exists "member_photos_delete_editors" on storage.objects;

create policy "member_photos_insert_editors"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1 from public.user_departments ud
          where ud.user_id = u.id and ud.is_team_leader = true
        )
      )
  )
);

create policy "member_photos_update_editors"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1 from public.user_departments ud
          where ud.user_id = u.id and ud.is_team_leader = true
        )
      )
  )
)
with check (
  bucket_id = 'member-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1 from public.user_departments ud
          where ud.user_id = u.id and ud.is_team_leader = true
        )
      )
  )
);

create policy "member_photos_delete_editors"
on storage.objects for delete to authenticated
using (
  bucket_id = 'member-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1 from public.user_departments ud
          where ud.user_id = u.id and ud.is_team_leader = true
        )
      )
  )
);

drop policy if exists "department_photos_insert" on storage.objects;
drop policy if exists "department_photos_update" on storage.objects;
drop policy if exists "department_photos_delete" on storage.objects;
drop policy if exists "department_photos_authenticated_insert" on storage.objects;
drop policy if exists "department_photos_authenticated_update" on storage.objects;
drop policy if exists "department_photos_authenticated_delete" on storage.objects;
drop policy if exists "department_photos_insert_editors" on storage.objects;
drop policy if exists "department_photos_update_editors" on storage.objects;
drop policy if exists "department_photos_delete_editors" on storage.objects;

create policy "department_photos_insert_editors"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'department-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant', 'team_leader')
  )
);

create policy "department_photos_update_editors"
on storage.objects for update to authenticated
using (
  bucket_id = 'department-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant', 'team_leader')
  )
)
with check (
  bucket_id = 'department-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant', 'team_leader')
  )
);

create policy "department_photos_delete_editors"
on storage.objects for delete to authenticated
using (
  bucket_id = 'department-photos'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant', 'team_leader')
  )
);

-- Recreate report photo policies with a fully-qualified object name. Inside a
-- users subquery an unqualified `name` resolves to users.name, not the object path.
drop policy if exists "report_photos_storage_select" on storage.objects;
create policy "report_photos_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1 from public.weekly_reports r
    where r.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

drop policy if exists "report_photos_storage_insert_author" on storage.objects;
create policy "report_photos_storage_insert_author"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'report-photos'
  and array_length(storage.foldername(storage.objects.name), 1) >= 1
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and u.is_active = true
      and (r.author_id = auth.uid() or u.role in ('super_admin', 'president', 'accountant'))
  )
);

drop policy if exists "report_photos_storage_update_author" on storage.objects;
create policy "report_photos_storage_update_author"
on storage.objects for update to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and u.is_active = true
      and (r.author_id = auth.uid() or u.role in ('super_admin', 'president', 'accountant'))
  )
)
with check (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and u.is_active = true
      and (r.author_id = auth.uid() or u.role in ('super_admin', 'president', 'accountant'))
  )
);

drop policy if exists "report_photos_storage_delete_author" on storage.objects;
create policy "report_photos_storage_delete_author"
on storage.objects for delete to authenticated
using (
  bucket_id = 'report-photos'
  and exists (
    select 1
    from public.weekly_reports r
    join public.users u on u.id = auth.uid()
    where r.id::text = (storage.foldername(storage.objects.name))[1]
      and u.is_active = true
      and (r.author_id = auth.uid() or u.role in ('super_admin', 'president', 'accountant'))
  )
);
