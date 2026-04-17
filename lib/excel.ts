import * as XLSX from 'xlsx';
import type { ExtractedFields } from './templates';

export function buildWorkbook(fields: ExtractedFields, subject: string, body: string): Buffer {
  const wb = XLSX.utils.book_new();
  const fieldRows = [
    ['項目', '値'],
    ['物件名', fields.propertyName],
    ['所在', fields.location],
    ['地番', fields.lotNumber],
    ['敷地面積', fields.landArea],
    ['建物面積', fields.buildingArea],
    ['用途', fields.usage],
    ['所有者', fields.owner]
  ];
  const mailRows = [
    ['件名', subject],
    ['本文', body]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fieldRows), '抽出結果');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mailRows), 'メール文面');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
