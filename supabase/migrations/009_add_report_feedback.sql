create table if not exists public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  commenter_id uuid not null references public.users(id) on delete restrict,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_report_feedback_report_id on public.report_feedback(report_id);
create index if not exists idx_report_feedback_commenter_id on public.report_feedback(commenter_id);

alter table public.report_feedback enable row level security;

drop policy if exists "report_feedback_select_viewers" on public.report_feedback;
create policy "report_feedback_select_viewers"
on public.report_feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.weekly_reports r on r.id = report_feedback.report_id
    where u.id = auth.uid()
      and u.is_active = true
      and (
        r.author_id = auth.uid()
        or r.status <> 'draft'
        or u.role in ('super_admin', 'president', 'accountant')
        or exists (
          select 1
          from public.user_departments ud
          where ud.user_id = u.id
            and ud.department_id = r.department_id
            and ud.is_team_leader = true
        )
      )
  )
);

drop policy if exists "report_feedback_insert_reviewers" on public.report_feedback;
create policy "report_feedback_insert_reviewers"
on public.report_feedback
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
