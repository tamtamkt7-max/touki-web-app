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

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractOwnersHistory(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines.filter((line) => {
    return (
      line.includes('所有権移転') ||
      line.includes('所有者') ||
      line.includes('権利者') ||
      line.includes('氏名') ||
      line.includes('持分') ||
      line.includes('売買') ||
      line.includes('相続')
    );
  });

  return [...new Set(candidates)].slice(0, 12);
}

export function extractToukiFields(text: string): ExtractedFields {
  const normalized = normalizeText(text);

  const location = pickFirst(normalized, [
    /所在\s*[:：]?\s*([^\n]+)/,
    /所\s*在\s*([^\n]+)/
  ]);

  const number = pickFirst(normalized, [
    /地番\s*[:：]?\s*([^\n]+)/,
    /家屋番号\s*[:：]?\s*([^\n]+)/
  ]);

  const area = pickFirst(normalized, [
    /地積\s*[:：]?\s*([^\n]+)/,
    /地\s*積\s*([^\n]+)/
  ]);

  const buildingArea = pickFirst(normalized, [
    /床面積\s*[:：]?\s*([^\n]+)/,
    /建物面積\s*[:：]?\s*([^\n]+)/
  ]);

  const owner = pickFirst(normalized, [
    /所有者\s*[:：]?\s*([^\n]+)/,
    /権利者その他の事項\s*[:：]?\s*([^\n]+)/,
    /所有権移転[^\n]*\n([^\n]+)/
  ]);

  return {
    location,
    number,
    area,
    buildingArea,
    owner,
    ownersHistory: extractOwnersHistory(normalized),
    raw: normalized
  };
}
