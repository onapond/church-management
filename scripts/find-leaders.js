const XLSX = require('xlsx');

const filePath = 'ref/1청년부 전체 명단 (26.02.16).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 1청년부 셀장 후보군 조사 ===');

data.forEach((row, i) => {
  const rowStr = JSON.stringify(row);
  if (rowStr.includes('셀장') || rowStr.includes('팀장')) {
    console.log(`${i + 1}: ${rowStr}`);
  }
});
