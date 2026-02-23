-- 심방 일정표 테이블 생성
-- 실행 위치: Supabase Dashboard > SQL Editor

-- 심방 상태 enum
CREATE TYPE visitation_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- 심방 사유 enum
CREATE TYPE visitation_reason AS ENUM ('hospital', 'newcomer', 'regular', 'encouragement', 'other');

-- 심방 일정 테이블
CREATE TABLE visitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  visit_time TIME,
  visitor VARCHAR(200) NOT NULL,
  reason visitation_reason NOT NULL DEFAULT 'regular',
  status visitation_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_visitations_visit_date ON visitations(visit_date);
CREATE INDEX idx_visitations_department_id ON visitations(department_id);
CREATE INDEX idx_visitations_status ON visitations(status);
CREATE INDEX idx_visitations_created_by ON visitations(created_by);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_visitations_updated_at
  BEFORE UPDATE ON visitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE visitations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 로그인한 사용자는 모든 심방 일정 조회 가능
CREATE POLICY "visitations_select_authenticated"
  ON visitations FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 로그인한 사용자는 심방 일정 등록 가능
CREATE POLICY "visitations_insert_authenticated"
  ON visitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS 정책: 본인이 등록한 일정만 수정 가능
CREATE POLICY "visitations_update_own"
  ON visitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS 정책: 본인이 등록한 일정만 삭제 가능
CREATE POLICY "visitations_delete_own"
  ON visitations FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

COMMENT ON TABLE visitations IS '심방 일정표';
COMMENT ON COLUMN visitations.member_id IS '심방 대상 교인 (선택)';
COMMENT ON COLUMN visitations.member_name IS '심방 대상자 이름 (교인 미등록도 입력 가능)';
COMMENT ON COLUMN visitations.visitor IS '심방자 (방문하는 사람)';
COMMENT ON COLUMN visitations.reason IS '심방 사유: hospital(병원), newcomer(신입), regular(정기), encouragement(격려), other(기타)';
