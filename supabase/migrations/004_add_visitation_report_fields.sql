-- 심방 보고서 필드 추가
ALTER TABLE visitations 
ADD COLUMN IF NOT EXISTS prayer_topics TEXT,
ADD COLUMN IF NOT EXISTS report_content TEXT;

COMMENT ON COLUMN visitations.prayer_topics IS '기도제목';
COMMENT ON COLUMN visitations.report_content IS '심방 내용';
