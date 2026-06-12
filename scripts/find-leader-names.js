const XLSX = require('xlsx');

const filePath = 'ref/1청년부 전체 명단 (26.02.16).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 셀장 성씨 기반 조사 ===');

const leaders = [];
data.forEach((row, i) => {
  const rowStr = JSON.stringify(row);
  if (rowStr.includes('셀장')) {
    // 성씨와 이름을 유추 (데이터 구조상 5번째 또는 4번째 열)
    const name = row[4] || row[3] || row[5] || '이름없음';
    const cell = row[3] || row[2] || '셀정보없음';
    leaders.push({ row: i+1, name, cell });
  }
});

leaders.forEach(l => console.log(`행 ${l.row}: ${l.name} (${l.cell})`));
