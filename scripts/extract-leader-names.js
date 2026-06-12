const XLSX = require('xlsx');

const filePath = 'ref/1청년부 전체 명단 (26.02.16).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 셀장 명단 정밀 분석 ===');

// 각 셀의 헤더 행에서 셀장 이름을 추출하거나, 소속 열에서 추출
data.forEach((row, i) => {
  if (!row || row.length < 5) return;
  
  const col3 = String(row[2] || ''); // 소속/직분
  const col5 = String(row[4] || ''); // 이름
  
  if (col3.includes('셀장') || col3.includes('팀장')) {
    console.log(`행 ${i+1}: 소속=[${col3}] 이름=[${col5}]`);
  }
});
