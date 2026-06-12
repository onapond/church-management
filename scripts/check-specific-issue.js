const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificIssue() {
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, role, user_departments(department_id, is_team_leader)')
    .eq('role', 'team_leader');

  if (userError) {
    console.error('사용자 조회 실패:', userError);
    return;
  }

  console.log('=== 셀장 소속 정보 ===');
  users?.forEach(u => {
    const depts = u.user_departments?.map(ud => ud.department_id).join(', ');
    console.log(`${u.name} (ID: ${u.id}) - 부서 IDs: ${depts}`);
  });

  const { data: reports, error: reportError } = await supabase
    .from('weekly_reports')
    .select('id, author_id, report_date, department_id, cell_id, attendees')
    .eq('report_type', 'cell_leader')
    .order('created_at', { ascending: false })
    .limit(5);

  if (reportError) {
    console.error('보고서 조회 실패:', reportError);
    return;
  }

  console.log('\n=== 최근 셀장보고서 내역 ===');
  reports?.forEach(r => {
    console.log(`날짜: ${r.report_date}, 작성자ID: ${r.author_id}, 부서ID: ${r.department_id}, 셀ID: ${r.cell_id}`);
    console.log(`참석자: ${r.attendees}`);
  });
}

checkSpecificIssue();
