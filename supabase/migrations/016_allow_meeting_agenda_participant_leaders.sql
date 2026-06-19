-- Allow active leader-meeting participants to use the pre-meeting agenda board.
-- This intentionally does not broaden meeting edit/delete/minutes permissions.

drop policy if exists "meeting_agenda_items_insert_leaders" on public.meeting_agenda_items;
create policy "meeting_agenda_items_insert_leaders"
on public.meeting_agenda_items
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or (
          u.role = 'team_leader'
          and exists (
            select 1
            from public.user_departments ud
            where ud.user_id = u.id
              and ud.department_id = meeting_agenda_items.department_id
          )
        )
      )
  )
);

drop policy if exists "meeting_agenda_comments_insert_leaders" on public.meeting_agenda_comments;
create policy "meeting_agenda_comments_insert_leaders"
on public.meeting_agenda_comments
for insert
to authenticated
with check (
  commenter_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant', 'team_leader')
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
      and (
        case
          when split_part(name, '/', 1) = 'agenda'
            and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (
            u.role in ('super_admin', 'president', 'accountant')
            or (
              u.role = 'team_leader'
              and exists (
                select 1
                from public.user_departments ud
                where ud.user_id = u.id
                  and ud.department_id = split_part(name, '/', 3)::uuid
              )
            )
          )
          else true
        end
      )
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
      and (
        case
          when split_part(name, '/', 1) = 'agenda'
            and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (
            u.role in ('super_admin', 'president', 'accountant')
            or (
              u.role = 'team_leader'
              and exists (
                select 1
                from public.user_departments ud
                where ud.user_id = u.id
                  and ud.department_id = split_part(name, '/', 3)::uuid
              )
            )
          )
          else true
        end
      )
  )
)
with check (
  bucket_id = 'meeting-pdfs'
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        case
          when split_part(name, '/', 1) = 'agenda'
            and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (
            u.role in ('super_admin', 'president', 'accountant')
            or (
              u.role = 'team_leader'
              and exists (
                select 1
                from public.user_departments ud
                where ud.user_id = u.id
                  and ud.department_id = split_part(name, '/', 3)::uuid
              )
            )
          )
          else true
        end
      )
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
      and (
        case
          when split_part(name, '/', 1) = 'agenda'
            and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (
            u.role in ('super_admin', 'president', 'accountant')
            or (
              u.role = 'team_leader'
              and exists (
                select 1
                from public.user_departments ud
                where ud.user_id = u.id
                  and ud.department_id = split_part(name, '/', 3)::uuid
              )
            )
          )
          else true
        end
      )
  )
);
