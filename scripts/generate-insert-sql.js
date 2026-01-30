const XLSX = require('xlsx');

// 엑셀 파일 읽기
const filePath = 'C:\\Users\\4ever\\Documents\\카카오톡 받은 파일\\2026 교육부 재적(26.01.28_디모데).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const members = [];
let currentDept = null;

// 데이터 파싱
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  // 부서 헤더 감지
  if (row[0] === '청년') {
    currentDept = 'youth_adult';
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
    let birthDateStr = row[3] || null;

    // 생년월일 처리
    let birthDate = null;
    let birthYear = null;
    if (birthDateStr && birthDateStr !== '0000-00-00') {
      if (typeof birthDateStr === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(birthDateStr);
        birthDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        birthYear = excelDate.y;
      } else if (typeof birthDateStr === 'string') {
        birthDate = birthDateStr;
        birthYear = parseInt(birthDateStr.split('-')[0]);
      }
    }

    // 청년은 나이로 CU1/CU2 구분
    let departmentCode = currentDept;
    if (currentDept === 'youth_adult') {
      if (birthYear && birthYear <= 1995) {
        departmentCode = 'cu2';
      } else {
        departmentCode = 'cu1';
      }
    }

    members.push({
      name,
      phone,
      birth_date: birthDate,
      department_code: departmentCode
    });
  }
}

// SQL 생성
console.log('-- 교인 명단 INSERT SQL');
console.log('-- 총 ' + members.length + '명\n');

members.forEach(m => {
  const name = m.name.replace(/'/g, "''");
  const phone = m.phone ? `'${m.phone}'` : 'NULL';
  const birthDate = m.birth_date ? `'${m.birth_date}'` : 'NULL';

  console.log(`INSERT INTO members (name, phone, birth_date, department_id, is_active)
SELECT '${name}', ${phone}, ${birthDate}, id, true FROM departments WHERE code = '${m.department_code}';`);
});

console.log('\n-- RLS 다시 활성화');
console.log('ALTER TABLE members ENABLE ROW LEVEL SECURITY;');
