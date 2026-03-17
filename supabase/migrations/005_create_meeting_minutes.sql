create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings(id) on delete cascade,
  discussion_notes text,
  decisions text,
  handoff_notes text,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meeting_minutes_meeting_id on public.meeting_minutes(meeting_id);
create index if not exists idx_meeting_minutes_updated_by on public.meeting_minutes(updated_by);

drop trigger if exists trg_meeting_minutes_updated_at on public.meeting_minutes;
create trigger trg_meeting_minutes_updated_at
before update on public.meeting_minutes
for each row
execute function public.update_updated_at_column();

alter table public.meeting_minutes enable row level security;

drop policy if exists "meeting_minutes_select_authenticated" on public.meeting_minutes;
create policy "meeting_minutes_select_authenticated"
on public.meeting_minutes
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

drop policy if exists "meeting_minutes_insert_leaders" on public.meeting_minutes;
create policy "meeting_minutes_insert_leaders"
on public.meeting_minutes
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_minutes.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president')
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

drop policy if exists "meeting_minutes_update_leaders" on public.meeting_minutes;
create policy "meeting_minutes_update_leaders"
on public.meeting_minutes
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_minutes.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = m.department_id
            and ud.is_team_leader = true
        )
      )
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_minutes.meeting_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president')
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
