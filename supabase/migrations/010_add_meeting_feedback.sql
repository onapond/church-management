create table if not exists public.meeting_feedback (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  commenter_id uuid not null references public.users(id) on delete restrict,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meeting_feedback_meeting_id on public.meeting_feedback(meeting_id);
create index if not exists idx_meeting_feedback_commenter_id on public.meeting_feedback(commenter_id);

alter table public.meeting_feedback enable row level security;

drop policy if exists "meeting_feedback_select_active_users" on public.meeting_feedback;
create policy "meeting_feedback_select_active_users"
on public.meeting_feedback
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
    where u.id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'president', 'accountant')
  )
);
