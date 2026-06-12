const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWeekNumbers() {
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select('id, report_date, week_number, year, report_type, departments(name)')
    .eq('report_type', 'weekly')
    .order('report_date', { ascending: false });

  if (error) {
    console.error('조회 실패:', error);
    return;
  }

  console.log('=== 주차 보고서 데이터 정밀 점검 (2026년) ===');
  reports?.filter(r => r.year === 2026).forEach(r => {
    console.log(`[${r.report_date}] ${r.departments?.name} : ${r.week_number}주차 (ID: ${r.id})`);
  });
}

checkWeekNumbers();
