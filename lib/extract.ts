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
    .replace(/[|｜]/g, ' ')
    .replace(/[‐-‒–—―]/g, '-')
    .trim();
}

function cleanValue(value: string) {
  return value
    .replace(/^[\s:：]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((v) => cleanValue(v)).filter(Boolean))];
}

function extractOwnersHistory(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines.filter((line) => {
    return (
      line.includes('所有権移転') ||
      line.includes('所有権一部移転') ||
      line.includes('所有者') ||
      line.includes('権利者') ||
      line.includes('氏名') ||
      line.includes('持分') ||
      line.includes('売買') ||
      line.includes('相続') ||
      line.includes('贈与')
    );
  });

  return unique(candidates).slice(0, 20);
}

function extractLatestOwner(text: string, ownersHistory: string[]) {
  const ownerMatches = [
    ...text.matchAll(/所有者\s*[:：]?\s*([^\n]+)/g),
    ...text.matchAll(/権利者その他の事項\s*[:：]?\s*([^\n]+)/g)
  ]
    .map((m) => cleanValue(m[1]))
    .filter(Boolean);

  if (ownerMatches.length > 0) {
    return ownerMatches[ownerMatches.length - 1];
  }

  const nameLike = ownersHistory.filter((line) => {
    return (
      !line.includes('受付年月日') &&
      !line.includes('登記の目的') &&
      !line.includes('所有権移転') &&
      !line.includes('売買') &&
      !line.includes('相続')
    );
  });

  return nameLike.length > 0 ? nameLike[nameLike.length - 1] : '';
}

function extractArea(text: string) {
  return pickFirst(text, [
    /地積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /地\s*積\s*([0-9.,]+\s*㎡?)/,
    /地積\s*([^\n]+)/,
    /地\s*積\s*([^\n]+)/
  ]);
}

function extractBuildingArea(text: string) {
  return pickFirst(text, [
    /床面積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /建物面積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /床面積\s*([^\n]+)/,
    /建物面積\s*([^\n]+)/
  ]);
}

function extractLocation(text: string) {
  return pickFirst(text, [
    /所在\s*[:：]?\s*([^\n]+)/,
    /所\s*在\s*([^\n]+)/,
    /所在欄\s*[:：]?\s*([^\n]+)/
  ]);
}

function extractNumber(text: string) {
  return pickFirst(text, [
    /地番\s*[:：]?\s*([^\n]+)/,
    /家屋番号\s*[:：]?\s*([^\n]+)/,
    /地\s*番\s*([^\n]+)/,
    /家屋番号\s*([^\n]+)/
  ]);
}

export function extractToukiFields(text: string): ExtractedFields {
  const normalized = normalizeText(text);

  const location = cleanValue(extractLocation(normalized));
  const number = cleanValue(extractNumber(normalized));
  const area = cleanValue(extractArea(normalized));
  const buildingArea = cleanValue(extractBuildingArea(normalized));

  const ownersHistory = extractOwnersHistory(normalized);
  const owner = cleanValue(extractLatestOwner(normalized, ownersHistory));

  return {
    location,
    number,
    area,
    buildingArea,
    owner,
    ownersHistory,
    raw: normalized
  };
}
