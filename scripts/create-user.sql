-- =============================================
-- 사용자 계정 생성 SQL
-- =============================================
-- 사용법:
-- 1. Supabase Dashboard > Authentication > Users 에서 먼저 사용자 생성
-- 2. 생성된 User UID를 아래 @user_id에 붙여넣기
-- 3. SQL Editor에서 이 쿼리 실행

-- =============================================
-- 신요한 계정 (super_admin)
-- =============================================

-- 1단계: Auth에서 사용자 생성 후 받은 UUID를 여기에 입력
-- 예: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

DO $$
DECLARE
  user_id UUID := '여기에_USER_UID_입력'; -- Auth에서 생성된 UUID
  dept_id UUID;
BEGIN
  -- CU 부서 ID 조회 (CU 1청년부 또는 다른 부서)
  SELECT id INTO dept_id FROM departments WHERE code = 'cu1' LIMIT 1;

  -- users 테이블에 삽입
  INSERT INTO users (id, email, name, phone, role, department_id, is_active)
  VALUES (
    user_id,
    'yohan@church.com',
    '신요한',
    NULL,
    'super_admin',
    dept_id,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    department_id = EXCLUDED.department_id;

  -- user_departments 테이블에도 연결 (팀장으로 설정)
  INSERT INTO user_departments (user_id, department_id, is_team_leader)
  VALUES (user_id, dept_id, TRUE)
  ON CONFLICT (user_id, department_id) DO UPDATE SET
    is_team_leader = TRUE;

  RAISE NOTICE '사용자 생성 완료: 신요한 (super_admin)';
END $$;

-- =============================================
-- 확인 쿼리
-- =============================================
-- SELECT * FROM users WHERE email = 'yohan@church.com';
-- SELECT * FROM user_departments WHERE user_id = (SELECT id FROM users WHERE email = 'yohan@church.com');
