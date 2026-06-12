const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: cells, error: cellError } = await supabase
    .from('cells')
    .select('id, name, is_active, departments (name)');

  if (cellError) {
    console.error('셀 조회 실패:', cellError);
    return;
  }

  console.log('=== 셀 목록 ===');
  cells?.forEach(c => {
    console.log(`[${c.departments?.name}] ${c.name} (${c.is_active})`);
  });

  const { data: teamLeaders, error: tlError } = await supabase
    .from('users')
    .select('id, name, role, departments(name)')
    .eq('role', 'team_leader');

  if (tlError) {
    console.error('팀장 조회 실패:', tlError);
    return;
  }

  console.log('\n=== 셀장/팀장 목록 ===');
  teamLeaders?.forEach(tl => {
    console.log(`${tl.name} (${tl.departments?.name})`);
  });
}

checkData();
