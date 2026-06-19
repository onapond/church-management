drop policy if exists "meeting_feedback_insert_leaders" on public.meeting_feedback;
create policy "meeting_feedback_insert_leaders"
on public.meeting_feedback
for insert
to authenticated
with check (
  commenter_id = auth.uid()
  and exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_feedback.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.id = m.created_by
        or u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = m.department_id
            and ud.is_team_leader = true
        )
      )
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
            or exists (
              select 1
              from public.user_departments ud
              where ud.user_id = u.id
                and ud.department_id = split_part(name, '/', 3)::uuid
                and ud.is_team_leader = true
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
            or exists (
              select 1
              from public.user_departments ud
              where ud.user_id = u.id
                and ud.department_id = split_part(name, '/', 3)::uuid
                and ud.is_team_leader = true
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
            or exists (
              select 1
              from public.user_departments ud
              where ud.user_id = u.id
                and ud.department_id = split_part(name, '/', 3)::uuid
                and ud.is_team_leader = true
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
            and split_part(name, '/', 3) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (
            u.role in ('super_admin', 'president', 'accountant')
            or exists (
              select 1
              from public.user_departments ud
              where ud.user_id = u.id
                and ud.department_id = split_part(name, '/', 3)::uuid
                and ud.is_team_leader = true
            )
          )
          else true
        end
      )
  )
);
