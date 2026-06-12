const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentReports() {
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select(`
      id, 
      report_date, 
      author_id, 
      department_id, 
      cell_id, 
      meeting_title,
      users:author_id (name, role),
      departments:department_id (name, code),
      cells:cell_id (name)
    `)
    .eq('report_type', 'cell_leader')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('조회 실패:', error);
    return;
  }

  console.log('=== 최근 셀장보고서 10건 ===');
  reports?.forEach(r => {
    console.log(`[${r.report_date}] ${r.users?.name || '작성자없음'}(${r.departments?.name}) - ${r.cells?.name || '셀없음'}`);
    console.log(`  - 보고서 ID: ${r.id}`);
    console.log(`  - 작성자 ID: ${r.author_id}`);
    console.log(`  - 부서 ID: ${r.department_id} (${r.departments?.code})`);
    console.log('-----------------------------------');
  });
}

checkRecentReports();
