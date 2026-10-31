-- A prospect is a member-level classification. Keep it on the existing
-- members row so the existing member RLS also protects this pastoral data.
-- The CU2 roster filter is a view of current memberships, not a new cell.
alter table public.members
  add column is_prospect boolean not null default false;

comment on column public.members.is_prospect is
  '태신자 표시. 현재 부서 소속과 별도로 보존하며, 2청년 명단에서 필터링한다.';
