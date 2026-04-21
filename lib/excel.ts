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

export function buildWorkbook(fields: Fields, _subject = '', _body = '') {
  const summary = [
    ['項目', '値'],
    ['最新の持ち主', fields.owner || ''],
    ['所在地', fields.location || ''],
    ['地番', fields.number || ''],
    ['土地の面積', fields.area || ''],
    ['建物の面積', fields.buildingArea || '']
  ];

  const history = [
    ['持ち主の流れ'],
    ...((fields.ownersHistory || []).length
      ? (fields.ownersHistory || []).map((v) => [v])
      : [['']])
  ];

  const preview = [['抽出結果プレビュー'], [fields.raw || '']];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '要約');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(history), '履歴');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(preview), 'プレビュー');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function buildCsv(fields: Fields) {
  const rows = [
    ['項目', '値'],
    ['最新の持ち主', fields.owner || ''],
    ['所在地', fields.location || ''],
    ['地番', fields.number || ''],
    ['土地の面積', fields.area || ''],
    ['建物の面積', fields.buildingArea || ''],
    ['持ち主の流れ', (fields.ownersHistory || []).join(' / ')],
    ['抽出結果プレビュー', fields.raw || '']
  ];

  const csvBody = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return '\ufeff' + csvBody;
}
