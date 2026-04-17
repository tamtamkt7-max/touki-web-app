export type ParsedResult = {
  propertyName: string;
  location: string;
  lotNumber: string;
  landArea: string;
  buildingArea: string;
  usage: string;
  owner: string;
  rawText: string;
};

function pick(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[\r\n]+/g, ' ');
  }
  return '';
}

export function extractToukiFields(text: string): ParsedResult {
  const normalized = text
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n');

  const location = pick(normalized, [
    /所在\s*[:：]?\s*([^\n]+)/,
    /所在事項\s*[:：]?\s*([^\n]+)/
  ]);
  const lotNumber = pick(normalized, [
    /地番\s*[:：]?\s*([^\n]+)/,
    /家屋番号\s*[:：]?\s*([^\n]+)/
  ]);
  const landArea = pick(normalized, [
    /地積\s*[:：]?\s*([^\n]+)/,
    /敷地面積\s*[:：]?\s*([^\n]+)/
  ]);
  const buildingArea = pick(normalized, [
    /床面積\s*[:：]?\s*([^\n]+)/,
    /建物面積\s*[:：]?\s*([^\n]+)/
  ]);
  const usage = pick(normalized, [
    /種類\s*[:：]?\s*([^\n]+)/,
    /用途\s*[:：]?\s*([^\n]+)/
  ]);
  const owner = pick(normalized, [
    /所有者\s*[:：]?\s*([^\n]+)/,
    /権利者その他の事項\s*([^\n]+)/,
    /氏名\s*[:：]?\s*([^\n]+)/
  ]);
  const propertyName = [location, lotNumber].filter(Boolean).join(' ').trim() || '登記対象物件';

  return { propertyName, location, lotNumber, landArea, buildingArea, usage, owner, rawText: normalized };
}
