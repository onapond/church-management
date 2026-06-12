const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllReports() {
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select(`
      id, 
      report_date, 
      report_type,
      status,
      users:author_id (name),
      departments:department_id (name)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('조회 실패:', error);
    return;
  }

  console.log('=== 모든 최근 보고서 20건 ===');
  reports?.forEach(r => {
    console.log(`[${r.report_date}] ${r.users?.name}(${r.departments?.name}) - ${r.report_type} (${r.status})`);
    console.log(`  - ID: ${r.id}, Author: ${r.users?.name}`);
  });
}

checkAllReports();
