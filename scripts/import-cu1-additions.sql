-- One-shot import for 1청년부 additions from ref/1청년부 전체 명단 (26.05.08).xlsx.
-- Safe to re-run: existing members are matched by phone or name + birth_date.

WITH cu1 AS (
  SELECT id
  FROM public.departments
  WHERE code = 'cu1'
),
source_members (name, phone, birth_date, email, address) AS (
  VALUES
    ('박철호', '010-6335-7653', DATE '2003-07-02', NULL, '인천광역시 부평구 산청로 97'),
    ('도지수', '010-3248-6119', DATE '2002-11-01', NULL, '강북구 도봉로 290 / 1817호'),
    ('한수연b', '010-7335-3794', DATE '2005-02-25', NULL, '경기도 성남시 분당구'),
    ('강태웅', '010-2377-0120', DATE '2000-05-24', NULL, '서울 마포구 월드컵북로42가길 28 301호'),
    ('임한', '010-6776-2619', DATE '2003-04-25', NULL, '강서로 47길 153 208동 101호'),
    ('최유진', '010-2470-9565', DATE '1999-02-05', NULL, '서울시 성동구 난계로 84, 111동 503호'),
    ('이인혁', '010-4224-3448', DATE '2002-03-20', NULL, NULL),
    ('봉준영', '010-4497-6497', DATE '1999-01-24', NULL, '경상남도 거창군 가조면 마상 4길 62. 304호')
),
existing_members AS (
  SELECT DISTINCT ON (s.name, s.birth_date)
    s.name,
    s.birth_date,
    m.id AS member_id
  FROM source_members s
  JOIN public.members m
    ON m.phone = s.phone
    OR (m.name = s.name AND m.birth_date = s.birth_date)
  ORDER BY s.name, s.birth_date, m.created_at ASC
),
inserted_members AS (
  INSERT INTO public.members (
    name,
    phone,
    birth_date,
    email,
    address,
    department_id,
    is_active
  )
  SELECT
    s.name,
    s.phone,
    s.birth_date,
    s.email,
    s.address,
    cu1.id,
    true
  FROM source_members s
  CROSS JOIN cu1
  WHERE NOT EXISTS (
    SELECT 1
    FROM existing_members e
    WHERE e.name = s.name
      AND e.birth_date = s.birth_date
  )
  RETURNING id AS member_id, name, birth_date
),
target_members AS (
  SELECT member_id, name, birth_date FROM existing_members
  UNION ALL
  SELECT member_id, name, birth_date FROM inserted_members
),
inserted_links AS (
  INSERT INTO public.member_departments (
    member_id,
    department_id,
    is_primary
  )
  SELECT
    t.member_id,
    cu1.id,
    true
  FROM target_members t
  CROSS JOIN cu1
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.member_departments md
    WHERE md.member_id = t.member_id
      AND md.department_id = cu1.id
  )
  RETURNING member_id
)
SELECT
  (SELECT COUNT(*) FROM inserted_members) AS inserted_members,
  (SELECT COUNT(*) FROM inserted_links) AS inserted_department_links,
  (SELECT COUNT(*) FROM target_members) AS total_target_members;
