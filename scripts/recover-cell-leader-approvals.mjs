#!/usr/bin/env node
// One-shot recovery: backfill cell_leader reports where team leader's approval
// was silently dropped by RLS before policy 007 was applied.
//
// Run: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/recover-cell-leader-approvals.mjs

const PROJECT_REF = 'zikneyjidzovvkmflibo';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN env var required');
  process.exit(1);
}

async function executeSql(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Cell-leader approval recovery');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('[1/4] Snapshot BEFORE update');
  const before = await executeSql(`
    SELECT status, COUNT(*)::int AS cnt
    FROM weekly_reports
    WHERE report_type = 'cell_leader'
    GROUP BY status
    ORDER BY status;
  `);
  console.log(JSON.stringify(before, null, 2));

  console.log('\n[2/4] Apply UPDATE (returning ids)');
  const updated = await executeSql(`
    UPDATE weekly_reports wr
    SET
      status            = 'final_approved',
      final_approver_id = latest.approver_id,
      final_approved_at = latest.created_at,
      final_comment     = latest.comment
    FROM (
      SELECT DISTINCT ON (report_id)
        report_id, approver_id, created_at, comment
      FROM approval_history
      WHERE to_status = 'final_approved'
      ORDER BY report_id, created_at DESC
    ) AS latest
    WHERE wr.id = latest.report_id
      AND wr.report_type = 'cell_leader'
      AND wr.status = 'submitted'
    RETURNING wr.id;
  `);
  const updatedCount = Array.isArray(updated) ? updated.length : 0;
  console.log(`Updated rows: ${updatedCount}`);

  console.log('\n[3/4] Snapshot AFTER update');
  const after = await executeSql(`
    SELECT status, COUNT(*)::int AS cnt
    FROM weekly_reports
    WHERE report_type = 'cell_leader'
    GROUP BY status
    ORDER BY status;
  `);
  console.log(JSON.stringify(after, null, 2));

  const stillPending = await executeSql(`
    SELECT COUNT(*)::int AS still_pending
    FROM weekly_reports wr
    JOIN approval_history ah ON ah.report_id = wr.id
    WHERE wr.report_type = 'cell_leader'
      AND wr.status = 'submitted'
      AND ah.to_status = 'final_approved';
  `);
  console.log(`still_pending = ${stillPending[0]?.still_pending}`);

  console.log('\n[4/4] Recovered approvers / departments (last 10 min)');
  const dist = await executeSql(`
    SELECT
      u.name AS approver,
      d.name AS dept,
      COUNT(*)::int AS recovered
    FROM weekly_reports wr
    JOIN users u ON u.id = wr.final_approver_id
    LEFT JOIN departments d ON d.id = wr.department_id
    WHERE wr.report_type = 'cell_leader'
      AND wr.status = 'final_approved'
      AND wr.final_approved_at >= NOW() - INTERVAL '10 minutes'
    GROUP BY u.name, d.name
    ORDER BY recovered DESC;
  `);
  console.log(JSON.stringify(dist, null, 2));

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
