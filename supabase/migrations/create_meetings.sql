create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department_id uuid not null references public.departments(id) on delete restrict,
  meeting_date timestamptz not null,
  location text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meetings_department_id on public.meetings(department_id);
create index if not exists idx_meetings_meeting_date_desc on public.meetings(meeting_date desc);
create index if not exists idx_meetings_created_by on public.meetings(created_by);

alter table public.meetings enable row level security;

drop policy if exists "meetings_select_authenticated" on public.meetings;
create policy "meetings_select_authenticated"
on public.meetings
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
  )
);

drop policy if exists "meetings_insert_leaders" on public.meetings;
create policy "meetings_insert_leaders"
on public.meetings
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president')
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

