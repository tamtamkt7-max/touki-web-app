import * as XLSX from 'xlsx';

type Fields = {
  location?: string;
  number?: string;
  area?: string;
  buildingArea?: string;
  owner?: string;
  ownersHistory?: string[];
  raw?: string;
};

function displayValue(value?: string) {
  return value && value.trim() ? value : '未検出';
}

export function buildWorkbook(fields: Fields, _subject = '', _body = '') {
  const summary = [
    ['項目', '値'],
    ['最新の持ち主', displayValue(fields.owner)],
    ['所在地', displayValue(fields.location)],
    ['地番', displayValue(fields.number)],
    ['土地の面積', displayValue(fields.area)],
    ['建物の面積', displayValue(fields.buildingArea)]
  ];

  const history = [
    ['持ち主の流れ'],
    ...((fields.ownersHistory || []).length
      ? (fields.ownersHistory || []).map((v) => [v])
      : [['未検出']])
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '概要');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(history), '履歴');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function buildCsv(fields: Fields) {
  const rows = [
    ['項目', '値'],
    ['最新の持ち主', displayValue(fields.owner)],
    ['所在地', displayValue(fields.location)],
    ['地番', displayValue(fields.number)],
    ['土地の面積', displayValue(fields.area)],
    ['建物の面積', displayValue(fields.buildingArea)],
    ['持ち主の流れ', (fields.ownersHistory || []).length ? (fields.ownersHistory || []).join(' / ') : '未検出']
  ];

  const csvBody = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return '\ufeff' + csvBody;
}
