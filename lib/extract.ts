export type ExtractedFields = {
  location: string;
  number: string;
  area: string;
  buildingArea: string;
  owner: string;
  ownersHistory: string[];
  raw: string;
};

function pickFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractOwnersHistory(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const ownerLike = lines.filter((line) => {
    return (
      line.includes('所有者') ||
      line.includes('権利者') ||
      line.includes('持分') ||
      /住所/.test(line) ||
      /氏名/.test(line)
    );
  });

  return [...new Set(ownerLike)].slice(0, 12);
}

export function extractToukiFields(text: string): ExtractedFields {
  const normalized = text.replace(/\r/g, '');

  const location = pickFirst(normalized, [
    /所在\s*[:：]?\s*(.+)/,
    /所在\s+(.+)/,
  ]);

  const number = pickFirst(normalized, [
    /地番\s*[:：]?\s*(.+)/,
    /家屋番号\s*[:：]?\s*(.+)/,
  ]);

  const area = pickFirst(normalized, [
    /地積\s*[:：]?\s*(.+)/,
    /地積\s+(.+)/,
  ]);

  const buildingArea = pickFirst(normalized, [
    /床面積\s*[:：]?\s*(.+)/,
    /建物面積\s*[:：]?\s*(.+)/,
  ]);

  const owner = pickFirst(normalized, [
    /所有者\s*[:：]?\s*(.+)/,
    /権利者その他の事項\s*[:：]?\s*(.+)/,
  ]);

  const ownersHistory = extractOwnersHistory(normalized);

  return {
    location,
    number,
    area,
    buildingArea,
    owner,
    ownersHistory,
    raw: normalized,
  };
}
