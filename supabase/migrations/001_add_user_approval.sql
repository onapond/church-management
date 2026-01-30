-- =============================================
-- 사용자 승인 시스템 마이그레이션
-- =============================================

-- 1. users 테이블에 is_approved 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 기존 사용자는 모두 승인 처리
UPDATE users SET is_approved = TRUE WHERE is_approved IS NULL OR is_approved = FALSE;

-- 2. 회원가입 시 자동으로 users 테이블에 레코드 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, is_approved, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'member',
    FALSE,  -- 신규 가입자는 미승인 상태
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 새 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. 승인 관련 RLS 정책 추가
-- 미승인 사용자도 자신의 정보는 볼 수 있도록
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- super_admin만 사용자 승인 가능
CREATE POLICY "Admin can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'president')
    )
  );
