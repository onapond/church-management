const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDepts() {
  const { data: depts, error } = await supabase
    .from('departments')
    .select('id, name, code');

  if (error) {
    console.error('부서 조회 실패:', error);
    return;
  }

  console.log('=== 부서 ID 매핑 ===');
  depts?.forEach(d => {
    console.log(`${d.name} (${d.code}) : ${d.id}`);
  });
}

checkDepts();
