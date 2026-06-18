create table if not exists public.meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete restrict,
  author_id uuid not null references public.users(id) on delete restrict,
  item_type text not null default 'agenda' check (item_type in ('agenda', 'question', 'notice')),
  title text not null,
  content text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meeting_agenda_comments (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references public.meeting_agenda_items(id) on delete cascade,
  commenter_id uuid not null references public.users(id) on delete restrict,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meeting_agenda_items_meeting_id on public.meeting_agenda_items(meeting_id);
create index if not exists idx_meeting_agenda_items_department_id on public.meeting_agenda_items(department_id);
create index if not exists idx_meeting_agenda_items_author_id on public.meeting_agenda_items(author_id);
create index if not exists idx_meeting_agenda_items_status on public.meeting_agenda_items(status);
create index if not exists idx_meeting_agenda_comments_item_id on public.meeting_agenda_comments(agenda_item_id);
create index if not exists idx_meeting_agenda_comments_commenter_id on public.meeting_agenda_comments(commenter_id);

drop trigger if exists trg_meeting_agenda_items_updated_at on public.meeting_agenda_items;
create trigger trg_meeting_agenda_items_updated_at
before update on public.meeting_agenda_items
for each row
execute function public.update_updated_at_column();

alter table public.meeting_agenda_items enable row level security;
alter table public.meeting_agenda_comments enable row level security;

drop policy if exists "meeting_agenda_items_select_active_users" on public.meeting_agenda_items;
create policy "meeting_agenda_items_select_active_users"
on public.meeting_agenda_items
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
  )
);

drop policy if exists "meeting_agenda_items_insert_leaders" on public.meeting_agenda_items;
create policy "meeting_agenda_items_insert_leaders"
on public.meeting_agenda_items
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = meeting_agenda_items.department_id
            and ud.is_team_leader = true
        )
      )
  )
);

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
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        meeting_agenda_items.author_id = u.id
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
)
with check (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_agenda_items.meeting_id
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        meeting_agenda_items.author_id = u.id
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

drop policy if exists "meeting_agenda_items_delete_authors_or_editors" on public.meeting_agenda_items;
create policy "meeting_agenda_items_delete_authors_or_editors"
on public.meeting_agenda_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meetings m on m.id = meeting_agenda_items.meeting_id
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        meeting_agenda_items.author_id = u.id
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

drop policy if exists "meeting_agenda_comments_select_active_users" on public.meeting_agenda_comments;
create policy "meeting_agenda_comments_select_active_users"
on public.meeting_agenda_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
  )
);

drop policy if exists "meeting_agenda_comments_insert_leaders" on public.meeting_agenda_comments;
create policy "meeting_agenda_comments_insert_leaders"
on public.meeting_agenda_comments
for insert
to authenticated
with check (
  commenter_id = (select auth.uid())
  and exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.is_team_leader = true
        )
      )
  )
);

drop policy if exists "meeting_agenda_comments_delete_authors_or_editors" on public.meeting_agenda_comments;
create policy "meeting_agenda_comments_delete_authors_or_editors"
on public.meeting_agenda_comments
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.meeting_agenda_items item on item.id = meeting_agenda_comments.agenda_item_id
    join public.meetings m on m.id = item.meeting_id
    where u.id = (select auth.uid())
      and u.is_active = true
      and (
        meeting_agenda_comments.commenter_id = u.id
        or item.author_id = u.id
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
