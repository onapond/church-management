-- One-shot, guarded CU1 roster sync from
-- `1청년부 전체 명단 (26.09.08).xlsx`.
--
-- Data-only scope:
--   - preserve all attendance/report/accounting/auth/RLS records and behavior;
--   - preserve the two distinct people Han Suyeon A/B;
--   - merge only Han Suyeon A's duplicate rows into the older history-bearing row;
--   - add Shin Hee-jun without inventing the incomplete birth date or phone;
--   - add Sungmo cell and apply the six source-backed cell assignments;
--   - correct Park Seungjo's birth date.
--
-- This script is intentionally one-shot. A second invocation fails its
-- preconditions before making any changes.

begin;

do $$
declare
  v_department_id uuid;
  v_mina_cell_id uuid;
  v_sunwoong_cell_id uuid;
  v_dahui_cell_id uuid;
  v_hyunjin_cell_id uuid;
  v_taehee_cell_id uuid;
  v_new_member_cell_id uuid;
  v_chaehyun_cell_id uuid;
  v_taesinja_cell_id uuid;
  v_sungmo_cell_id uuid;
  v_hansu_original_id uuid;
  v_hansu_duplicate_id uuid;
  v_shin_heejun_id uuid;
  v_names text[];
  v_updated_count integer;
  v_reference_count integer;
  v_mismatch_count integer;
  v_duplicate_membership_count integer;
  v_cross_department_cell_count integer;
  v_attendance_count_before bigint;
  v_report_count_before bigint;
  v_report_linked_attendance_before bigint;
  v_member_count_before bigint;
begin
  select id into strict v_department_id
  from public.departments
  where code = 'cu1';

  select id into strict v_mina_cell_id
  from public.cells
  where department_id = v_department_id and name = '민아셀' and is_active = true;

  select id into strict v_sunwoong_cell_id
  from public.cells
  where department_id = v_department_id and name = '선웅셀' and is_active = true;

  select id into strict v_dahui_cell_id
  from public.cells
  where department_id = v_department_id and name = '다희셀' and is_active = true;

  select id into strict v_hyunjin_cell_id
  from public.cells
  where department_id = v_department_id and name = '현진셀' and is_active = true;

  select id into strict v_taehee_cell_id
  from public.cells
  where department_id = v_department_id and name = '태희셀' and is_active = true;

  select id into strict v_new_member_cell_id
  from public.cells
  where department_id = v_department_id and name = '새신자셀' and is_active = true;

  select id into strict v_chaehyun_cell_id
  from public.cells
  where department_id = v_department_id and name = '채현셀' and is_active = true;

  select id into strict v_taesinja_cell_id
  from public.cells
  where department_id = v_department_id and name = '태신자셀' and is_active = true;

  if exists (
    select 1 from public.cells
    where department_id = v_department_id and name = '성모셀'
  ) then
    raise exception 'Expected no existing CU1 Sungmo cell.';
  end if;

  select array_agg(m.name order by m.name) into v_names
  from public.member_departments md
  join public.members m on m.id = md.member_id
  where md.department_id = v_department_id
    and m.is_active = true;

  if v_names is distinct from array[
    '강민아', '강채연', '강태웅', '구예린', '구현서',
    '김동욱', '김동혁', '김민지', '김민호', '김선웅',
    '김영효', '김은수', '김지솔', '김채현', '김현주',
    '김효정', '도지수', '문진성', '박수빈', '박승조',
    '박준수', '박철호', '봉준영', '송준선', '신원주',
    '양인우', '우현승', '이다희', '이승재', '이인서',
    '이인혁', '이정민', '이지욱', '이창대', '이태희',
    '이현진', '임채승', '임한', '장미화', '장성재',
    '정성모', '정시후', '정예은', '정은재', '조민정',
    '최유진', '한수연', '한수연a', '한수연b', '현수빈'
  ]::text[] then
    raise exception 'CU1 active roster changed after audit; refusing update. Current roster: %', v_names;
  end if;

  if exists (
    select 1
    from public.member_departments md
    join public.members m on m.id = md.member_id
    where md.department_id = v_department_id
    group by m.id
    having count(*) <> 1
  ) then
    raise exception 'Expected one CU1 membership row per current member.';
  end if;

  select id into strict v_hansu_original_id
  from public.members
  where name = '한수연'
    and phone = '010-6605-2347'
    and birth_date = date '2002-07-18'
    and is_active = true;

  select id into strict v_hansu_duplicate_id
  from public.members
  where name = '한수연a'
    and phone = '010-6605-2347'
    and birth_date = date '2002-07-18'
    and is_active = true;

  if not exists (
    select 1 from public.member_departments
    where member_id = v_hansu_original_id
      and department_id = v_department_id
      and cell_id = v_hyunjin_cell_id
  ) then
    raise exception 'History-bearing Han Suyeon is not in CU1 Hyunjin cell.';
  end if;

  if not exists (
    select 1
    from public.member_departments md
    join public.departments d on d.id = md.department_id
    where md.member_id = v_hansu_original_id
      and d.code = 'CU'
  ) then
    raise exception 'History-bearing Han Suyeon A is not linked to the CU worship team.';
  end if;

  if not exists (
    select 1
    from public.member_departments md
    join public.members m on m.id = md.member_id
    where md.department_id = v_department_id
      and md.cell_id = v_taehee_cell_id
      and m.name = '한수연b'
      and m.phone = '010-7335-3794'
      and m.birth_date = date '2005-02-25'
      and m.is_active = true
  ) then
    raise exception 'Distinct Han Suyeon B identity or Taehee assignment changed.';
  end if;

  select
    (select count(*) from public.attendance_records where member_id = v_hansu_original_id)
  into v_reference_count;
  if v_reference_count < 1 then
    raise exception 'Expected history-bearing Han Suyeon to retain attendance history.';
  end if;

  select
      (select count(*) from public.attendance_records where member_id = v_hansu_duplicate_id)
    + (select count(*) from public.visitations where member_id = v_hansu_duplicate_id)
    + (select count(*) from public.newcomers where converted_to_member_id = v_hansu_duplicate_id)
  into v_reference_count;
  if v_reference_count <> 0 then
    raise exception 'Duplicate Han Suyeon unexpectedly has historical references: %.', v_reference_count;
  end if;

  select count(*) into v_reference_count
  from public.member_departments
  where member_id = v_hansu_duplicate_id;
  if v_reference_count <> 1 then
    raise exception 'Duplicate Han Suyeon should have exactly one department link, found %.', v_reference_count;
  end if;

  if exists (
    select 1 from public.members
    where id = v_hansu_duplicate_id
      and (photo_url is not null or photo_updated_at is not null)
  ) then
    raise exception 'Duplicate Han Suyeon unexpectedly has a profile photo.';
  end if;

  if exists (select 1 from public.members where name = '신희준') then
    raise exception 'Shin Hee-jun already exists; refusing duplicate insert.';
  end if;

  if not exists (
    select 1
    from public.member_departments md
    join public.members m on m.id = md.member_id
    where md.department_id = v_department_id
      and m.name = '박승조'
      and m.phone = '010-5460-5772'
      and m.birth_date = date '2001-01-27'
      and m.is_active = true
      and md.cell_id = v_taehee_cell_id
  ) then
    raise exception 'Park Seungjo pre-update identity or Taehee assignment changed.';
  end if;

  select count(*) into v_attendance_count_before from public.attendance_records;
  select count(*) into v_report_count_before from public.weekly_reports;
  select count(*) into v_report_linked_attendance_before
  from public.attendance_records where report_id is not null;
  select count(*) into v_member_count_before from public.members;

  insert into public.cells (department_id, name, display_order, is_active)
  values (
    v_department_id,
    '성모셀',
    (select coalesce(max(display_order), 0) + 1 from public.cells where department_id = v_department_id),
    true
  )
  returning id into v_sungmo_cell_id;

  delete from public.member_departments
  where member_id = v_hansu_duplicate_id
    and department_id = v_department_id
    and cell_id = v_hyunjin_cell_id;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one duplicate Han Suyeon CU1 link delete, deleted %.', v_updated_count;
  end if;

  delete from public.members
  where id = v_hansu_duplicate_id;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one duplicate Han Suyeon row delete, deleted %.', v_updated_count;
  end if;

  update public.members
  set
    name = '한수연a',
    address = '경기 고양시 덕양구 원흥1로 35 (고양삼송 엘에이치 13단지 아파트)'
  where id = v_hansu_original_id
    and name = '한수연';
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected history-bearing Han Suyeon row rename, updated %.', v_updated_count;
  end if;

  insert into public.members (
    name,
    phone,
    email,
    birth_date,
    address,
    department_id,
    is_active,
    joined_at
  )
  values (
    '신희준',
    null,
    null,
    null,
    '서울 동작구 남부순환로257길 35 (리치빌) 301호',
    v_department_id,
    true,
    current_date
  )
  returning id into v_shin_heejun_id;

  insert into public.member_departments (member_id, department_id, cell_id, is_primary)
  values (v_shin_heejun_id, v_department_id, v_sunwoong_cell_id, true);

  update public.members
  set birth_date = date '1998-01-27'
  where name = '박승조'
    and phone = '010-5460-5772'
    and birth_date = date '2001-01-27'
    and is_active = true;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one Park Seungjo birth-date correction, updated %.', v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_sungmo_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id = v_mina_cell_id
    and m.name = '정성모'
    and m.is_active = true;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one Jeong Sungmo move to Sungmo cell, updated %.', v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_dahui_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id = v_taesinja_cell_id
    and m.name = '김민호'
    and m.is_active = true;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one Kim Minho move to Dahui cell, updated %.', v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_mina_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id = v_taesinja_cell_id
    and m.name = '박수빈'
    and m.is_active = true;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'Expected one Park Subin move to Mina cell, updated %.', v_updated_count;
  end if;

  update public.member_departments md
  set cell_id = v_taesinja_cell_id
  from public.members m
  where m.id = md.member_id
    and md.department_id = v_department_id
    and md.cell_id = v_sunwoong_cell_id
    and m.name in ('정시후', '정은재')
    and m.is_active = true;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 2 then
    raise exception 'Expected two moves from Sunwoong to Tae-sinja cell, updated %.', v_updated_count;
  end if;

  select array_agg(m.name order by m.name) into v_names
  from public.member_departments md
  join public.members m on m.id = md.member_id
  where md.department_id = v_department_id
    and m.is_active = true;

  if v_names is distinct from array[
    '강민아', '강채연', '강태웅', '구예린', '구현서',
    '김동욱', '김동혁', '김민지', '김민호', '김선웅',
    '김영효', '김은수', '김지솔', '김채현', '김현주',
    '김효정', '도지수', '문진성', '박수빈', '박승조',
    '박준수', '박철호', '봉준영', '송준선', '신원주',
    '신희준', '양인우', '우현승', '이다희', '이승재',
    '이인서', '이인혁', '이정민', '이지욱', '이창대',
    '이태희', '이현진', '임채승', '임한', '장미화',
    '장성재', '정성모', '정시후', '정예은', '정은재',
    '조민정', '최유진', '한수연a', '한수연b', '현수빈'
  ]::text[] then
    raise exception 'Final CU1 roster does not match the 2026-09-08 workbook: %', v_names;
  end if;

  with expected(cell_name, member_name) as (
    values
      ('민아셀', '강민아'), ('민아셀', '김동욱'), ('민아셀', '김현주'), ('민아셀', '박수빈'),
      ('민아셀', '박준수'), ('민아셀', '박철호'), ('민아셀', '봉준영'), ('민아셀', '정예은'),
      ('선웅셀', '김선웅'), ('선웅셀', '신희준'), ('선웅셀', '이승재'),
      ('선웅셀', '이인혁'), ('선웅셀', '이지욱'), ('선웅셀', '임채승'),
      ('다희셀', '김동혁'), ('다희셀', '김민호'), ('다희셀', '김은수'),
      ('다희셀', '도지수'), ('다희셀', '이다희'), ('다희셀', '장미화'),
      ('현진셀', '구예린'), ('현진셀', '이현진'), ('현진셀', '임한'),
      ('현진셀', '최유진'), ('현진셀', '한수연a'),
      ('태희셀', '강태웅'), ('태희셀', '김민지'), ('태희셀', '박승조'),
      ('태희셀', '이태희'), ('태희셀', '조민정'), ('태희셀', '한수연b'),
      ('새신자셀', '강채연'), ('새신자셀', '문진성'), ('새신자셀', '양인우'),
      ('새신자셀', '이인서'), ('새신자셀', '이정민'), ('새신자셀', '이창대'),
      ('채현셀', '김채현'),
      ('태신자셀', '구현서'), ('태신자셀', '김영효'), ('태신자셀', '김지솔'),
      ('태신자셀', '송준선'), ('태신자셀', '신원주'), ('태신자셀', '우현승'),
      ('태신자셀', '장성재'), ('태신자셀', '정시후'), ('태신자셀', '정은재'),
      ('태신자셀', '현수빈'),
      ('성모셀', '정성모'),
      (null, '김효정')
  ), actual as (
    select c.name as cell_name, m.name as member_name
    from public.member_departments md
    join public.members m on m.id = md.member_id
    left join public.cells c on c.id = md.cell_id
    where md.department_id = v_department_id
      and m.is_active = true
  ), differences as (
    (select * from expected except select * from actual)
    union all
    (select * from actual except select * from expected)
  )
  select count(*) into v_mismatch_count from differences;

  if v_mismatch_count <> 0 then
    raise exception 'Final CU1 cell roster differs from the workbook mapping in % rows.', v_mismatch_count;
  end if;

  select count(*) into v_duplicate_membership_count
  from (
    select member_id
    from public.member_departments
    where department_id = v_department_id
    group by member_id
    having count(*) > 1
  ) duplicates;

  select count(*) into v_cross_department_cell_count
  from public.member_departments md
  join public.cells c on c.id = md.cell_id
  where md.department_id = v_department_id
    and c.department_id <> v_department_id;

  if v_duplicate_membership_count <> 0 or v_cross_department_cell_count <> 0 then
    raise exception 'Final integrity failed: duplicate memberships %, cross-department cells %.',
      v_duplicate_membership_count,
      v_cross_department_cell_count;
  end if;

  if not exists (
    select 1 from public.members
    where id = v_hansu_original_id
      and name = '한수연a'
      and address = '경기 고양시 덕양구 원흥1로 35 (고양삼송 엘에이치 13단지 아파트)'
      and is_active = true
  ) or exists (
    select 1 from public.members where id = v_hansu_duplicate_id
  ) then
    raise exception 'Han Suyeon merge verification failed.';
  end if;

  if not exists (
    select 1
    from public.members m
    join public.member_departments cu1_md
      on cu1_md.member_id = m.id
     and cu1_md.department_id = v_department_id
     and cu1_md.cell_id = v_hyunjin_cell_id
    join public.member_departments worship_md on worship_md.member_id = m.id
    join public.departments worship_department
      on worship_department.id = worship_md.department_id
     and worship_department.code = 'CU'
    where m.id = v_hansu_original_id
      and m.name = '한수연a'
  ) then
    raise exception 'Han Suyeon A did not retain both Hyunjin and CU worship-team links.';
  end if;

  if not exists (
    select 1
    from public.members m
    join public.member_departments md on md.member_id = m.id
    where m.name = '한수연b'
      and m.phone = '010-7335-3794'
      and m.birth_date = date '2005-02-25'
      and m.is_active = true
      and md.department_id = v_department_id
      and md.cell_id = v_taehee_cell_id
  ) then
    raise exception 'Han Suyeon B preservation verification failed.';
  end if;

  if not exists (
    select 1 from public.members
    where name = '박승조'
      and birth_date = date '1998-01-27'
      and is_active = true
  ) then
    raise exception 'Park Seungjo birth-date verification failed.';
  end if;

  if (select count(*) from public.members) <> v_member_count_before
     or (select count(*) from public.attendance_records) <> v_attendance_count_before
     or (select count(*) from public.weekly_reports) <> v_report_count_before
     or (select count(*) from public.attendance_records where report_id is not null) <> v_report_linked_attendance_before then
    raise exception 'Protected row counts changed unexpectedly.';
  end if;
end;
$$;

commit;
