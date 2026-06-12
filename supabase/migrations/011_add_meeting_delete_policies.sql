drop policy if exists "meetings_delete_editors" on public.meetings;
create policy "meetings_delete_editors"
on public.meetings
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
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

drop policy if exists "meeting_minutes_delete_editors" on public.meeting_minutes;
create policy "meeting_minutes_delete_editors"
on public.meeting_minutes
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_minutes.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.id = m.created_by
        or u.role in ('super_admin', 'president')
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

drop policy if exists "meeting_feedback_delete_editors" on public.meeting_feedback;
create policy "meeting_feedback_delete_editors"
on public.meeting_feedback
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_feedback.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.id = m.created_by
        or u.role in ('super_admin', 'president')
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
