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
    .replace(/郡 山/g, '郡山市')
    .replace(/郡 山 市/g, '郡山市')
    .replace(/所 邊|所辺|所邊|所 在/g, '所在')
    .replace(/地 番|地香|地盤|地 番/g, '地番')
    .replace(/地 積|地绩|地責/g, '地積')
    .replace(/床 面 積|床面 積/g, '床面積')
    .replace(/所 有 者|所有 者/g, '所有者')
    .replace(/持 分/g, '持分')
    .replace(/令 和/g, '令和')
    .replace(/[①②③④⑤⑥⑦⑧⑨]/g, ' ')
    .trim();
}

function cleanValue(value: string) {
  return value
    .replace(/^[\s:：]+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[()（）【】]/g, ' ')
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
      line.includes('贈与') ||
      line.includes('原因') ||
      line.includes('令和')
    );
  });

  return unique(candidates).slice(0, 24);
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

  const shareLike = ownersHistory.filter((line) => {
    return line.includes('持分') || /[0-9]+分の[0-9]+/.test(line);
  });

  if (shareLike.length > 0) {
    return shareLike[shareLike.length - 1];
  }

  return '';
}

function extractLocation(text: string) {
  const direct = pickFirst(text, [
    /所在\s*[:：]?\s*([^\n]+)/,
    /所在欄\s*[:：]?\s*([^\n]+)/,
    /所在\s+([^\n]+)/,
    /(福島県[^\n]*郡山市[^\n]*)/,
    /(郡山市[^\n]*)/
  ]);

  return direct || '';
}

function extractNumber(text: string) {
  return pickFirst(text, [
    /地番\s*[:：]?\s*([^\n]+)/,
    /家屋番号\s*[:：]?\s*([^\n]+)/,
    /([0-9]+番[0-9-]*)/,
    /([0-9]+-[0-9]+)/
  ]);
}

function extractArea(text: string) {
  return pickFirst(text, [
    /地積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /地積\s*[:：]?\s*([^\n]+)/,
    /([0-9]{2,5}\s*㎡)/
  ]);
}

function extractBuildingArea(text: string) {
  return pickFirst(text, [
    /床面積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /建物面積\s*[:：]?\s*([0-9.,]+\s*㎡?)/,
    /床面積\s*[:：]?\s*([^\n]+)/,
    /建物面積\s*[:：]?\s*([^\n]+)/
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
