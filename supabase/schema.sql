-- =============================================
-- 청파중앙교회 교육위원회 통합 관리 시스템
-- Supabase SQL Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. ENUM 타입 정의
-- =============================================

CREATE TYPE user_role AS ENUM (
  'super_admin',      -- 최고 관리자 (담당 목사, 위원장)
  'president',        -- CU 회장
  'accountant',       -- 회계
  'team_leader',      -- 부서별 팀장
  'member'            -- 일반 교인
);

CREATE TYPE department_code AS ENUM (
  'ck',               -- CK (유치·유년부)
  'youth',            -- 청소년부
  'cu1',              -- CU 1청년부 (20대)
  'cu2'               -- CU 2청년부 (30대)
);

CREATE TYPE approval_status AS ENUM (
  'draft',                -- 작성 중
  'submitted',            -- 제출됨 (팀장 작성 완료)
  'coordinator_reviewed', -- 회장 협조 완료
  'manager_approved',     -- 부장 결재 완료
  'final_approved',       -- 목사 최종 확인 완료
  'rejected',             -- 반려
  'revision_requested'    -- 수정 요청
);

CREATE TYPE attendance_type AS ENUM (
  'worship',          -- 예배 출석
  'meeting'           -- CU 모임 출석
);

-- =============================================
-- 2. 부서 테이블
-- =============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code department_code UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (code, name, description) VALUES
  ('ck', 'CK (유치·유년부)', '유치부 및 유년부 통합'),
  ('youth', '청소년부', '중·고등부'),
  ('cu1', 'CU 1청년부', '20대 청년부'),
  ('cu2', 'CU 2청년부', '30대 청년부');

-- =============================================
-- 3. 사용자 테이블 (Supabase Auth 연동)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'member',
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_team_leader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- =============================================
-- 4. 교인 명단 테이블 (얼굴 매칭 출결용)
-- =============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  birth_date DATE,
  address TEXT,
  occupation VARCHAR(100),
  photo_url TEXT,
  photo_updated_at TIMESTAMPTZ,
  department_id UUID NOT NULL REFERENCES departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_photo ON members(photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX idx_members_department ON members(department_id);
CREATE INDEX idx_members_active ON members(is_active) WHERE is_active = TRUE;

-- =============================================
-- 5. 주차 보고서 테이블
-- =============================================
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id),
  report_date DATE NOT NULL,
  week_number INT,
  year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  author_id UUID NOT NULL REFERENCES users(id),
  total_registered INT DEFAULT 0,
  worship_attendance INT DEFAULT 0,
  meeting_attendance INT DEFAULT 0,
  notes TEXT,
  status approval_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  coordinator_id UUID REFERENCES users(id),
  coordinator_reviewed_at TIMESTAMPTZ,
  coordinator_comment TEXT,
  manager_id UUID REFERENCES users(id),
  manager_approved_at TIMESTAMPTZ,
  manager_comment TEXT,
  final_approver_id UUID REFERENCES users(id),
  final_approved_at TIMESTAMPTZ,
  final_comment TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, year, week_number)
);

CREATE INDEX idx_reports_status ON weekly_reports(status);
CREATE INDEX idx_reports_date ON weekly_reports(report_date DESC);
CREATE INDEX idx_reports_author ON weekly_reports(author_id);

-- =============================================
-- 6. 결재 이력 테이블
-- =============================================
CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  from_status approval_status NOT NULL,
  to_status approval_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_history_report ON approval_history(report_id);

-- =============================================
-- 7. 진행 순서 테이블
-- =============================================
CREATE TABLE report_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  content VARCHAR(200) NOT NULL,
  person_in_charge VARCHAR(100),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programs_report ON report_programs(report_id);

-- =============================================
-- 8. 출결 기록 테이블
-- =============================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  report_id UUID REFERENCES weekly_reports(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  attendance_type attendance_type NOT NULL,
  is_present BOOLEAN DEFAULT FALSE,
  checked_by UUID REFERENCES users(id),
  checked_via VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, attendance_date, attendance_type)
);

CREATE INDEX idx_attendance_date ON attendance_records(attendance_date DESC);
CREATE INDEX idx_attendance_member ON attendance_records(member_id);
CREATE INDEX idx_attendance_report ON attendance_records(report_id);

-- =============================================
-- 9. 새신자 명단 테이블
-- =============================================
CREATE TABLE newcomers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  introducer VARCHAR(100),
  address TEXT,
  affiliation VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  converted_to_member_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newcomers_report ON newcomers(report_id);

-- =============================================
-- 10. 푸시 알림 구독 테이블 (PWA)
-- =============================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name VARCHAR(100),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- =============================================
-- 11. 알림 테이블
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  report_id UUID REFERENCES weekly_reports(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- =============================================
-- 12. 트리거: updated_at 자동 갱신
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 13. 출결 집계 자동 업데이트 트리거
-- =============================================
CREATE OR REPLACE FUNCTION update_report_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE weekly_reports
  SET
    worship_attendance = (
      SELECT COUNT(*) FROM attendance_records
      WHERE report_id = COALESCE(NEW.report_id, OLD.report_id)
        AND attendance_type = 'worship' AND is_present = TRUE
    ),
    meeting_attendance = (
      SELECT COUNT(*) FROM attendance_records
      WHERE report_id = COALESCE(NEW.report_id, OLD.report_id)
        AND attendance_type = 'meeting' AND is_present = TRUE
    )
  WHERE id = COALESCE(NEW.report_id, OLD.report_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- INSERT/UPDATE 트리거 (NEW 사용)
CREATE TRIGGER trg_attendance_count_insert_update
  AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  WHEN (NEW.report_id IS NOT NULL)
  EXECUTE FUNCTION update_report_attendance_counts();

-- DELETE 트리거 (OLD 사용)
CREATE TRIGGER trg_attendance_count_delete
  AFTER DELETE ON attendance_records
  FOR EACH ROW
  WHEN (OLD.report_id IS NOT NULL)
  EXECUTE FUNCTION update_report_attendance_counts();

-- =============================================
-- 14. RLS (Row Level Security)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE newcomers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "View members in same department or admin" ON members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('super_admin', 'president')
        OR EXISTS (
          SELECT 1 FROM user_departments ud
          WHERE ud.user_id = u.id AND ud.department_id = members.department_id
        )
      )
    )
  );

CREATE POLICY "View reports based on role" ON weekly_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('super_admin', 'president', 'accountant')
        OR author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_departments ud
          WHERE ud.user_id = u.id AND ud.department_id = weekly_reports.department_id
        )
      )
    )
  );

CREATE POLICY "Authors can update own draft reports" ON weekly_reports
  FOR UPDATE USING (author_id = auth.uid() AND status = 'draft');

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 15. 뷰: 결재 대기 목록
-- =============================================
CREATE VIEW pending_approvals AS
SELECT
  wr.id, wr.report_date, wr.status,
  d.name AS department_name,
  author.name AS author_name,
  wr.created_at, wr.submitted_at,
  CASE
    WHEN wr.status = 'submitted' THEN 'coordinator'
    WHEN wr.status = 'coordinator_reviewed' THEN 'manager'
    WHEN wr.status = 'manager_approved' THEN 'final'
  END AS pending_role
FROM weekly_reports wr
JOIN departments d ON d.id = wr.department_id
JOIN users author ON author.id = wr.author_id
WHERE wr.status IN ('submitted', 'coordinator_reviewed', 'manager_approved');

-- =============================================
-- 16. 뷰: 부서별 출결 현황
-- =============================================
CREATE VIEW department_attendance_summary AS
SELECT
  d.id AS department_id, d.name AS department_name,
  wr.report_date, wr.year, wr.week_number,
  (SELECT COUNT(*) FROM members m WHERE m.department_id = d.id AND m.is_active = TRUE) AS total_registered,
  wr.worship_attendance, wr.meeting_attendance,
  ROUND(
    (wr.worship_attendance::DECIMAL / NULLIF(
      (SELECT COUNT(*) FROM members m WHERE m.department_id = d.id AND m.is_active = TRUE), 0
    )) * 100, 1
  ) AS worship_rate
FROM weekly_reports wr
JOIN departments d ON d.id = wr.department_id
WHERE wr.status = 'final_approved';
