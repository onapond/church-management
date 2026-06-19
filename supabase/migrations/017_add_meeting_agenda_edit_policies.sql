-- Add explicit edit support for pre-meeting agenda items and comments.
-- This keeps the scope limited to agenda discussion and does not broaden meeting minutes editing.

drop policy if exists "meeting_agenda_items_update_authors_or_editors" on public.meeting_agenda_items;
create policy "meeting_agenda_items_update_authors_or_editors"
on public.meeting_agenda_items
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_agenda_items.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        meeting_agenda_items.author_id = u.id
        or u.role in ('super_admin', 'president')
        or (
          u.role = 'team_leader'
          and exists (
            select 1
            from public.user_departments ud
            where ud.user_id = u.id
              and ud.department_id = m.department_id
              and ud.is_team_leader = true
          )
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_agenda_items.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        meeting_agenda_items.author_id = u.id
        or u.role in ('super_admin', 'president')
        or (
          u.role = 'team_leader'
          and exists (
            select 1
            from public.user_departments ud
            where ud.user_id = u.id
              and ud.department_id = m.department_id
              and ud.is_team_leader = true
          )
        )
      )
  )
);

drop policy if exists "meeting_agenda_comments_update_own_or_meeting_editors" on public.meeting_agenda_comments;
create policy "meeting_agenda_comments_update_own_or_meeting_editors"
on public.meeting_agenda_comments
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meeting_agenda_items item on item.id = meeting_agenda_comments.agenda_item_id
    join public.meetings m on m.id = item.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        meeting_agenda_comments.commenter_id = u.id
        or u.role in ('super_admin', 'president')
        or (
          u.role = 'team_leader'
          and exists (
            select 1
            from public.user_departments ud
            where ud.user_id = u.id
              and ud.department_id = m.department_id
              and ud.is_team_leader = true
          )
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    join public.meeting_agenda_items item on item.id = meeting_agenda_comments.agenda_item_id
    join public.meetings m on m.id = item.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        meeting_agenda_comments.commenter_id = u.id
        or u.role in ('super_admin', 'president')
        or (
          u.role = 'team_leader'
          and exists (
            select 1
            from public.user_departments ud
            where ud.user_id = u.id
              and ud.department_id = m.department_id
              and ud.is_team_leader = true
          )
        )
      )
  )
);
