const XLSX = require('xlsx');

const filePath = 'C:\\Users\\4ever\\Documents\\카카오톡 받은 파일\\2026 교육부 재적(26.01.28_디모데).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 전체 데이터 출력
data.forEach((row, i) => {
  if (row.length > 0) {
    console.log(`${i + 1}: ${JSON.stringify(row)}`);
  }
});
