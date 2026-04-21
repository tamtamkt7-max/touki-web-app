import * as XLSX from 'xlsx';
import type { ExtractedFields } from './extract';

export function buildWorkbook(fields: Partial<ExtractedFields>) {
  const wb = XLSX.utils.book_new();

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
    ...((fields.ownersHistory || []).map((item) => [item]))
  ];

  const raw = [
    ['抽出結果プレビュー'],
    [fields.raw || '']
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '要約');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(history), '履歴');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(raw), 'プレビュー');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
