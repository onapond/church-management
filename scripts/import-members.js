const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co';
const supabaseKey = 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV';
const supabase = createClient(supabaseUrl, supabaseKey);

// 엑셀 파일 읽기
const filePath = 'C:\\Users\\4ever\\Documents\\카카오톡 받은 파일\\2026 교육부 재적(26.01.28_디모데).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

async function importMembers() {
  // 부서 ID 가져오기
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, code');

  if (deptError) {
    console.error('부서 조회 실패:', deptError);
    return;
  }

  const deptMap = {};
  departments.forEach(d => {
    deptMap[d.code] = d.id;
  });

  console.log('부서 ID:', deptMap);

  const members = [];
  let currentDept = null;

  // 데이터 파싱
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 부서 헤더 감지
    if (row[0] === '청년') {
      currentDept = 'youth_adult'; // 나중에 나이로 cu1/cu2 구분
      continue;
    }
    if (row[0] === '청소년부') {
      currentDept = 'youth';
      continue;
    }
    if (row[0] === '아동부 / 유치부') {
      currentDept = 'ck';
      continue;
    }

    // 헤더 행 건너뛰기
    if (row[0] === '이름' || row[0] === '2026년 교육부 신상') continue;

    // 데이터 행 처리
    if (currentDept && row[0]) {
      const name = row[0];
      const phone = row[1] || null;
      const position = row[2] || null;
      let birthDateStr = row[3] || null;

      // 생년월일 처리
      let birthDate = null;
      let birthYear = null;
      if (birthDateStr && birthDateStr !== '0000-00-00') {
        // 엑셀 날짜 숫자 처리
        if (typeof birthDateStr === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(birthDateStr);
          birthDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
          birthYear = excelDate.y;
        } else if (typeof birthDateStr === 'string') {
          birthDate = birthDateStr;
          birthYear = parseInt(birthDateStr.split('-')[0]);
        }
      }

      // 청년은 나이로 CU1/CU2 구분 (1995년 기준: 30세)
      let departmentCode = currentDept;
      if (currentDept === 'youth_adult') {
        if (birthYear && birthYear <= 1995) {
          departmentCode = 'cu2'; // 30대 이상
        } else {
          departmentCode = 'cu1'; // 20대
        }
      }

      // 아동부/유치부 구분
      if (currentDept === 'ck' && position) {
        // 모두 CK로 통합
        departmentCode = 'ck';
      }

      members.push({
        name,
        phone,
        birth_date: birthDate,
        department_id: deptMap[departmentCode],
        is_active: true
      });
    }
  }

  console.log(`\n총 ${members.length}명 준비 완료\n`);

  // 부서별 인원 확인
  const cu1Count = members.filter(m => m.department_id === deptMap['cu1']).length;
  const cu2Count = members.filter(m => m.department_id === deptMap['cu2']).length;
  const youthCount = members.filter(m => m.department_id === deptMap['youth']).length;
  const ckCount = members.filter(m => m.department_id === deptMap['ck']).length;

  console.log('부서별 인원:');
  console.log(`- CU 1청년부 (20대): ${cu1Count}명`);
  console.log(`- CU 2청년부 (30대): ${cu2Count}명`);
  console.log(`- 청소년부: ${youthCount}명`);
  console.log(`- CK (아동/유치): ${ckCount}명`);

  // Supabase에 삽입
  console.log('\n데이터 삽입 중...');

  const { data: inserted, error: insertError } = await supabase
    .from('members')
    .insert(members)
    .select('id, name');

  if (insertError) {
    console.error('삽입 실패:', insertError);
    return;
  }

  console.log(`\n${inserted.length}명 등록 완료!`);
}

importMembers().catch(console.error);
