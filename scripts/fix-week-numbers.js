const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

// 교회 기준 주차 계산 함수 (JS 버전)
function getWeekNumber(dateStr) {
  const parts = dateStr.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const date = new Date(year, month, day)
  const sundayDate = new Date(year, month, day - date.getDay())
  const jan1 = new Date(year, 0, 1)
  const jan1Day = jan1.getDay()
  const firstSunday = jan1Day === 0 ? jan1 : new Date(year, 0, 1 + (7 - jan1Day))
  const diffDays = Math.round((sundayDate.getTime() - firstSunday.getTime()) / 86400000)
  return Math.floor(diffDays / 7) + 1
}

async function fixData() {
  const { data: reports, error } = await supabase
    .from('weekly_reports')
    .select('id, report_date, week_number')
    .eq('report_type', 'weekly')
    .eq('year', 2026);

  if (error) {
    console.error('조회 실패:', error);
    return;
  }

  console.log(`총 ${reports.length}개의 보고서 검토 중...`);

  for (const r of reports) {
    const correctWeek = getWeekNumber(r.report_date);
    if (r.week_number !== correctWeek) {
      console.log(`보정 필요: [${r.report_date}] ${r.week_number}주차 -> ${correctWeek}주차`);
      
      const { error: updError } = await supabase
        .from('weekly_reports')
        .update({ week_number: correctWeek })
        .eq('id', r.id);
        
      if (updError) console.error(`업데이트 실패 (ID: ${r.id}):`, updError);
    }
  }
  
  console.log('보정 작업 완료.');
}

fixData();
