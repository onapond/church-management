const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataRange() {
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select('report_date, week_number, department_id, year, departments(name)')
    .eq('report_type', 'weekly')
    .gte('report_date', '2026-01-01')
    .lte('report_date', '2026-03-31')
    .order('report_date', { ascending: true });

  if (error) {
    console.error('에러:', error);
    return;
  }

  console.log('=== 2026년 주차 보고서 주차 현황 ===');
  reports?.forEach(r => {
    console.log(`날짜: ${r.report_date} | 부서: ${r.departments?.name} | 주차: ${r.week_number} | 연도: ${r.year}`);
  });
}

checkDataRange();
