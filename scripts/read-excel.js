const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2] || 'C:\\Users\\4ever\\Documents\\카카오톡 받은 파일\\2026 교육부 재적(26.01.28_디모데).xlsx';

const workbook = XLSX.readFile(filePath);

// 모든 시트 이름 출력
console.log('=== 시트 목록 ===');
console.log(workbook.SheetNames);

// 각 시트의 데이터 출력
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // 처음 20행만 출력
  data.slice(0, 20).forEach((row, i) => {
    console.log(`${i + 1}: ${JSON.stringify(row)}`);
  });

  console.log(`\n총 ${data.length}행`);
});
