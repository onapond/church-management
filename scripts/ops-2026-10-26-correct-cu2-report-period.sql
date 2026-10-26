-- Data-only repair. Keep report content, status, submission time, approval history and children.
-- Default is a dry run; replace the final ROLLBACK with COMMIT only for the approved repair.
BEGIN;
LOCK TABLE public.weekly_reports IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
  before_row public.weekly_reports%ROWTYPE;
  after_row public.weekly_reports%ROWTYPE;
  history_before jsonb;
  history_after jsonb;
BEGIN
  SELECT * INTO STRICT before_row FROM public.weekly_reports
  WHERE id = '23e35ee6-a91d-4250-ad57-9bb2352c4a5b' FOR UPDATE;
  IF before_row.report_type::text <> 'weekly'
     OR before_row.department_id <> 'ea5996b1-3ed5-4b54-bb58-72d3c9bc93fe'::uuid
     OR before_row.author_id <> '7352bc56-d797-48eb-a039-edd14e5e1901'::uuid
     OR before_row.report_date <> DATE '2026-10-25'
     OR before_row.week_number <> 43 OR before_row.year <> 2026
     OR before_row.status::text <> 'coordinator_reviewed' THEN
    RAISE EXCEPTION 'Report identity or state changed; stop and review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.weekly_reports
     WHERE department_id = before_row.department_id AND report_type::text = 'weekly'
       AND year = 2026 AND week_number = 42 AND id <> before_row.id) THEN
    RAISE EXCEPTION 'Target week already has a report; nothing changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.attendance_records WHERE report_id = before_row.id) THEN
    RAISE EXCEPTION 'Report has linked attendance; requires separate review';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.id), '[]'::jsonb) INTO history_before
  FROM public.approval_history h WHERE h.report_id = before_row.id;
  UPDATE public.weekly_reports
  SET report_date = DATE '2026-10-18', week_number = 42, year = 2026
  WHERE id = before_row.id RETURNING * INTO after_row;
  IF (to_jsonb(before_row) - ARRAY['report_date','week_number','year','updated_at'])
     IS DISTINCT FROM
     (to_jsonb(after_row) - ARRAY['report_date','week_number','year','updated_at']) THEN
    RAISE EXCEPTION 'Unexpected report content or approval change';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.id), '[]'::jsonb) INTO history_after
  FROM public.approval_history h WHERE h.report_id = before_row.id;
  IF history_before IS DISTINCT FROM history_after THEN
    RAISE EXCEPTION 'Approval history changed';
  END IF;
END $$;
SELECT id, report_date, week_number, year, status, submitted_at
FROM public.weekly_reports WHERE id = '23e35ee6-a91d-4250-ad57-9bb2352c4a5b';
ROLLBACK;
