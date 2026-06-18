drop policy if exists "meetings_update_editors" on public.meetings;
create policy "meetings_update_editors"
on public.meetings
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = meetings.created_by
        or u.role in ('super_admin', 'president')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = meetings.department_id
            and ud.is_team_leader = true
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        u.id = meetings.created_by
        or u.role in ('super_admin', 'president')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = meetings.department_id
            and ud.is_team_leader = true
        )
      )
  )
);
