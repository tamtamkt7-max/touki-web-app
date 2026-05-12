export type ExtractedFields = {
  location: string;
  number: string;
  area: string;
  buildingArea: string;
  owner: string;
  ownersHistory: string[];
  raw: string;
};

type Sections = {
  title: string[];
  rights: string[];
  kouku: string[];
  otsuku: string[];
  collateral: string[];
  all: string[];
};

type KoukuEntry = {
  startIndex: number;
  lines: string[];
  purpose: string;
  cause: string;
  owners: string[];
  invalid: boolean;
  ownershipEvent: boolean;
};

const LABEL_NORMALIZERS: Array<[RegExp, string]> = [
  [/表 題 部|表題都|表題郡|表題部\s*\(.*?\)/g, '表題部'],
  [/権 利 部/g, '権利部'],
  [/甲 區|甲區/g, '甲区'],
  [/乙 區|乙區/g, '乙区'],
  [/所 邊|所辺|所 在|所　在|所在地/g, '所在'],
  [/地 番|地盤|地香/g, '地番'],
  [/地 積|地績|地責/g, '地積'],
  [/床 面 積|床面 積/g, '床面積'],
  [/建 物 面 積/g, '建物面積'],
  [/権 利 者|権利者その他の事項/g, '権利者その他事項'],
  [/所 有 者|所有 者/g, '所有者'],
  [/抹 消/g, '抹消'],
  [/変 更/g, '変更'],
  [/仮 登 記|仮登記/g, '仮登記'],
  [/更 正/g, '更正'],
  [/持\s*分/g, '持分'],
  [/原\s*因/g, '原因']
];

const TITLE_LABELS = ['所在', '地番', '地積', '床面積', '建物面積'];

const EXCLUDED_RIGHTS_SECTION = /乙区|抵当権|抵当権設定|共同担保目録|共同担保|担保目録|金銭消費貸借|連帯債務者|抵当権者/;
const HEADER_LINE = /登記の目的|受付年月日|受付番号|権利者その他事項|順位番号.*登記の目的|遷委番号.*登記の目的|権利者その他|能利者その他/;

const OCR_LABEL_NORMALIZERS: Array<[RegExp, string]> = [
  [/所\s*有\s*權/g, '所有権'],
  [/所\s*有\s*権\s*秘\s*転/g, '所有権移転'],
  [/所有権秘転/g, '所有権移転'],
  [/所\s*有\s*権\s*移\s*転/g, '所有権移転'],
  [/所\s*有\s*権/g, '所有権'],
  [/所\s*有\s*省/g, '所有者'],
  [/所有省/g, '所有者'],
  [/能\s*利\s*者/g, '権利者'],
  [/能利者/g, '権利者'],
  [/権\s*利\s*者\s*そ\s*の\s*他\s*の\s*事\s*項/g, '権利者その他事項'],
  [/権\s*利\s*者/g, '権利者'],
  [/共\s*有\s*者/g, '共有者'],
  [/原\s*因/g, '原因'],
  [/順\s*位\s*番\s*号/g, '順位番号'],
  [/受\s*付\s*年\s*月\s*日/g, '受付年月日'],
  [/受\s*付\s*番\s*号/g, '受付番号'],
  [/登\s*記\s*の\s*目\s*的/g, '登記の目的'],
  [/抵\s*当\s*挫/g, '抵当権'],
  [/地\s*図\s*帯\s*[呈号]/g, '地図番号'],
  [/令\s*大/g, '令和'],
  [/売\s*[質買]|沈\s*質/g, '売買'],
  [/所\s*在/g, '所在'],
  [/地\s*番/g, '地番'],
  [/地\s*積/g, '地積'],
  [/床\s*面\s*積/g, '床面積'],
  [/建\s*物\s*面\s*積/g, '建物面積'],
  [/表\s*題\s*部/g, '表題部'],
  [/権\s*利\s*部/g, '権利部'],
  [/甲\s*[区區]/g, '甲区'],
  [/乙\s*[区區]/g, '乙区']
];

function cleanValue(value: string) {
  return value
    .replace(/[|｜]/g, ' ')
    .replace(/[()（）【】「」『』]/g, ' ')
    .replace(/[‐-‒–—―]/g, '-')
    .replace(/^[\s:：・\-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeOcrTextForExtraction(text: string) {
  let v = text
    .replace(/\r/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[㎡m²㎥]/g, '㎡')
    .replace(/[｜|]/g, ' ')
    .replace(/[§ＳS](?=\d)/g, '5')
    .replace(/(?<=\d)[§ＳS](?=\d|$)/g, '5')
    .replace(/(\d)\s*[=:]\s*(\d)/g, '$1-$2')
    .replace(/(\d+)\)/g, '$1')
    .replace(/\s{2,}/g, ' ');

  for (const [pattern, replacement] of OCR_LABEL_NORMALIZERS) {
    v = v.replace(pattern, replacement);
  }

  v = v
    .split('\n')
    .map((line) =>
      line
        .replace(/([一-龠ぁ-んァ-ンー々〆ヶ])\s+(?=[一-龠ぁ-んァ-ンー々〆ヶ])/g, '$1')
        .replace(/([一-龠ぁ-んァ-ンー々〆ヶ])\s+(?=\d)/g, '$1')
        .replace(/(\d)\s+(?=\d)/g, '$1')
        .replace(/(\d)\s+(?=[年月日番号])/g, '$1')
        .replace(/([年月日番号])\s+(?=\d)/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .join('\n');

  for (const [pattern, replacement] of OCR_LABEL_NORMALIZERS) {
    v = v.replace(pattern, replacement);
  }

  return v.replace(/\n{2,}/g, '\n').trim();
}

function normalizeText(text: string) {
  let v = normalizeOcrTextForExtraction(text)
    .replace(/\r/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[㎡m²㎥]/g, '㎡')
    .replace(/\n{2,}/g, '\n')
    .trim();

  for (const [pattern, replacement] of LABEL_NORMALIZERS) {
    v = v.replace(pattern, replacement);
  }

  return v;
}

function linesOf(text: string) {
  return text
    .split('\n')
    .map(cleanValue)
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.map(cleanValue).filter(Boolean))];
}

function isNoiseLine(line: string) {
  const cleaned = cleanValue(line);
  if (!cleaned) return true;
  if (!/[一-龠ぁ-んァ-ンa-zA-Z0-9]/.test(cleaned)) return true;
  if (/^[^一-龠ぁ-んァ-ンa-zA-Z0-9]+$/.test(cleaned)) return true;
  if (/(.)\1{6,}/.test(cleaned)) return true;
  if (/^[a-zA-Z0-9]{1,2}$/.test(cleaned)) return true;
  return false;
}

function isPlausibleText(line: string) {
  const cleaned = cleanValue(line);
  if (isNoiseLine(cleaned)) return false;
  if (/�/.test(cleaned)) return false;
  if (looksLikeOcrGarbage(cleaned)) return false;
  return true;
}

function countMatches(value: string, pattern: RegExp) {
  return (value.match(pattern) || []).length;
}

function ratio(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

function hasJapaneseLikeText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff々〆ヶ]/.test(value);
}

function looksLikeOcrGarbage(value: string) {
  const compact = value.replace(/\s/g, '');
  if (!compact) return true;

  const alphaNum = countMatches(compact, /[A-Za-z0-9]/g);
  const symbols = countMatches(compact, /[^A-Za-z0-9\u3040-\u30ff\u3400-\u9fff々〆ヶ\s]/g);
  const weirdTokens = countMatches(value, /\b[A-Za-z]{4,}\b/g);
  const hasJapanese = hasJapaneseLikeText(compact);

  if (!hasJapanese && compact.length >= 6 && ratio(alphaNum, compact.length) >= 0.55) return true;
  if (!hasJapanese && ratio(symbols, compact.length) >= 0.35) return true;
  if (weirdTokens >= 2 && ratio(alphaNum, compact.length) >= 0.35) return true;
  if (/[A-Z]{4,}|\b[a-z]{5,}\b/.test(value) && !hasJapanese) return true;

  return false;
}

function hasFieldContamination(value: string) {
  return /所有権保存|所有権移転|所有権|原因|受付|順位番号|権利部|甲区|乙区|表題部|地積|床面積|権利者|所有者|共同担保|担保目録|抵当権/.test(value);
}

function hasHighAsciiNoise(value: string, maxRatio = 0.25) {
  const compact = value.replace(/\s/g, '');
  if (!compact) return true;
  return ratio(countMatches(compact, /[A-Za-z*]/g), compact.length) > maxRatio;
}

function safeLocation(value: string) {
  const cleaned = cleanValue(value);
  if (!cleaned) return '';
  if (!isPlausibleText(cleaned)) return '';
  if (!hasJapaneseLikeText(cleaned)) return '';
  if (hasHighAsciiNoise(cleaned, 0.18)) return '';
  if (hasFieldContamination(cleaned)) return '';
  if (/の土地|土地本|持分|共有者|番地|丁目\d+番|共同担保|抵当権/.test(cleaned)) return '';
  return cleaned;
}

function safeNumber(value: string) {
  const cleaned = cleanValue(value);
  if (!cleaned || looksLikeOcrGarbage(cleaned)) return '';
  const m = cleaned.match(/^([0-9]{1,5}番[0-9\-]{0,8}|[0-9]{1,5}-[0-9]{1,5}|[0-9]{1,5})$/);
  return m ? m[1] : '';
}

function safeArea(value: string) {
  const normalized = normalizeArea(value);
  const m = normalized.match(/^([0-9]{1,7}(?:\.[0-9]{1,2})?)㎡$/);
  return m ? `${m[1]}㎡` : '';
}

function stripOwnerAnnotation(value: string) {
  return cleanValue(value)
    .replace(/持分.*$/, '')
    .replace(/住所.*$/, '')
    .replace(/受付.*$/, '')
    .trim();
}

function looksLikeAddress(value: string) {
  return /[都道府県市区町村].*(丁目|番地|番)/.test(value);
}

function safeOwner(value: string) {
  const cleaned = stripOwnerAnnotation(value);
  if (!cleaned) return '';
  if (!isPlausibleText(cleaned)) return '';
  if (hasFieldContamination(cleaned)) return '';
  if (looksLikeAddress(cleaned)) return '';
  if (hasHighAsciiNoise(cleaned, 0.12)) return '';
  if (cleaned.length > 40) return '';
  return looksLikeCorp(cleaned) || looksLikePerson(cleaned) ? cleaned : '';
}

function findHeadingIndex(lines: string[], heading: RegExp) {
  return lines.findIndex((line) => heading.test(line));
}

function indexOfFirst(lines: string[], pattern: RegExp) {
  const idx = lines.findIndex((line) => pattern.test(line));
  return idx >= 0 ? idx : lines.length;
}

function withoutExcludedRights(lines: string[]) {
  const cut = indexOfFirst(lines, EXCLUDED_RIGHTS_SECTION);
  return lines.slice(0, cut);
}

function splitSections(lines: string[]): Sections {
  const titleIdx = findHeadingIndex(lines, /表題部/);
  const rightsIdx = findHeadingIndex(lines, /権利部/);

  const koukuGlobalIdx = findHeadingIndex(lines, /甲区/);
  const otsukuGlobalIdx = findHeadingIndex(lines, /乙区/);

  const titleStart = titleIdx >= 0 ? titleIdx : 0;
  const rightsStart =
    rightsIdx >= 0
      ? rightsIdx
      : koukuGlobalIdx >= 0
        ? koukuGlobalIdx
        : Math.min(lines.length, titleStart + 120);

  const rawTitle = lines.slice(titleStart, rightsStart > titleStart ? rightsStart : lines.length);
  const title = rawTitle.slice(0, indexOfFirst(rawTitle, /甲区|乙区|共同担保目録|抵当権/));
  const rights = rightsStart < lines.length ? lines.slice(rightsStart) : [];

  const koukuIdx = findHeadingIndex(rights, /甲区/);
  const otsukuIdx = findHeadingIndex(rights, /乙区/);
  const collateralIdx = findHeadingIndex(rights, /共同担保目録|共同担保|担保目録/);

  let kouku: string[] = [];
  let otsuku: string[] = [];
  let collateral: string[] = [];

  if (koukuIdx >= 0 && otsukuIdx >= 0) {
    if (koukuIdx < otsukuIdx) {
      kouku = withoutExcludedRights(rights.slice(koukuIdx, otsukuIdx));
      otsuku = rights.slice(otsukuIdx, collateralIdx > otsukuIdx ? collateralIdx : rights.length);
    } else {
      otsuku = rights.slice(otsukuIdx, koukuIdx);
      kouku = withoutExcludedRights(rights.slice(koukuIdx));
    }
  } else if (koukuIdx >= 0) {
    kouku = withoutExcludedRights(rights.slice(koukuIdx, collateralIdx > koukuIdx ? collateralIdx : rights.length));
  } else if (rights.length > 0) {
    kouku = withoutExcludedRights(rights);
  }

  if (collateralIdx >= 0) {
    collateral = rights.slice(collateralIdx);
  }

  return { title, rights, kouku, otsuku, collateral, all: lines };
}

function normalizeArea(value: string) {
  const cleaned = cleanValue(value).replace(/平方メートル/g, '㎡');
  const m = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*㎡/);
  if (m) return `${m[1]}㎡`;
  return cleaned;
}

function findLabelValueByPosition(section: string[], label: string, lookAhead = 5) {
  const idx = section.findIndex((line) => line.includes(label));
  if (idx < 0) return '';

  const sameLine = cleanValue(section[idx].replace(label, ''));
  if (sameLine && isPlausibleText(sameLine)) return sameLine;

  const values: string[] = [];
  for (let i = idx + 1; i <= Math.min(section.length - 1, idx + lookAhead); i++) {
    const line = section[i];
    if (TITLE_LABELS.some((v) => line.startsWith(v) && v !== label)) break;
    if (/^(権利部|甲区|乙区)/.test(line)) break;
    if (isPlausibleText(line)) values.push(line);
  }

  return cleanValue(values.join(' '));
}

function extractFromInlineTitleRow(section: string[], label: string) {
  for (const line of section) {
    if (!line.includes(label)) continue;

    const after = cleanValue(line.split(label).slice(1).join(' '));
    if (after && isPlausibleText(after)) return after;

    const cells = line.split(/\s+/).map(cleanValue).filter(Boolean);
    const labelIndex = cells.findIndex((c) => c === label);
    if (labelIndex >= 0 && cells[labelIndex + 1] && isPlausibleText(cells[labelIndex + 1])) {
      return cells[labelIndex + 1];
    }
  }
  return '';
}

function extractAreaByLabel(section: string[], label: string, lookAhead = 5) {
  const idx = section.findIndex((line) => line.includes(label));
  if (idx < 0) return '';

  const sameLine = safeArea(section[idx].split(label).slice(1).join(' '));
  if (sameLine) return sameLine;

  for (let i = idx + 1; i <= Math.min(section.length - 1, idx + lookAhead); i++) {
    const line = section[i];
    if (TITLE_LABELS.some((v) => line.startsWith(v) && v !== label)) break;
    if (/^(権利部|甲区|乙区)/.test(line)) break;

    const value = safeArea(line);
    if (value) return value;
  }

  return '';
}

function extractLocationFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '所在'),
    findLabelValueByPosition(title, '所在', 6)
  ].map(cleanValue);

  for (const c of candidates) {
    if (!c) continue;
    const safe = safeLocation(c);
    if (safe) return safe;
  }

  const joined = title.join('\n');
  const m = joined.match(/(.*?[都道府県].*?[市区町村].*)/);
  return m ? safeLocation(m[1]) : '';
}

function extractNumberFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '地番'),
    findLabelValueByPosition(title, '地番', 5)
  ].map(cleanValue);

  for (const c of candidates) {
    if (!c) continue;
    const m = c.match(/([0-9]{1,5}番[0-9\-]{0,8}|[0-9]{1,5}-[0-9]{1,5}|[0-9]{1,5})/);
    if (m) return safeNumber(m[1]);
  }

  const joined = title.join(' ');
  const m = /地番|表題部|所在|地積|土地/.test(joined)
    ? joined.match(/([0-9]{1,5}番[0-9\-]{0,8}|[0-9]{1,5}-[0-9]{1,5})/)
    : null;
  return m ? safeNumber(m[1]) : '';
}

function extractAreaFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractAreaByLabel(title, '地積', 5),
    extractAreaByLabel(all, '地積', 5)
  ];

  for (const c of candidates) {
    const safe = safeArea(c);
    if (safe) return safe;
  }

  const joined = all.join(' ');
  const m = joined.match(/([0-9]+(?:\.[0-9]+)?\s*㎡)/);
  return m ? safeArea(m[1]) : '';
}

function extractBuildingAreaFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractAreaByLabel(title, '床面積', 5),
    extractAreaByLabel(title, '建物面積', 5),
    extractAreaByLabel(all, '床面積', 5),
    extractAreaByLabel(all, '建物面積', 5)
  ];

  for (const c of candidates) {
    const safe = safeArea(c);
    if (safe) return safe;
  }

  return '';
}

function isEntryStart(line: string) {
  if (HEADER_LINE.test(line)) return false;
  if (/^順位番号\s*\d+/.test(line)) return true;
  if (/^第?\d+\s*(号|番)/.test(line)) return true;
  if (/所有権移転|所有権一部移転|持分一部移転/.test(line)) return true;
  if (/^\d+\s+/.test(line) && /原因|登記/.test(line)) return true;
  return false;
}

function extractCause(lines: string[]) {
  const directLine = lines.find((line) => /^原因\b|^原因\s*[:：]?/.test(line));
  if (directLine) {
    const direct = directLine.replace(/^原因\s*[:：]?/, '');
    if (direct) return cleanValue(direct);
  }

  const event = lines.find((line) => /所有権|移転|相続|売買|贈与|抹消|変更|更正|仮登記/.test(line));
  return event ? cleanValue(event) : '';
}

function extractPurpose(lines: string[]) {
  const purposeLine = lines.find((line) => /所有権保存|所有権移転|所有権/.test(line));
  if (!purposeLine) return '';

  const cleaned = cleanValue(purposeLine.replace(/^登記の目的\s*[:：]?/, ''));
  if (/原因|受付|順位番号|権利者|所有者/.test(cleaned)) return '';
  return cleaned;
}

function looksLikeCorp(name: string) {
  return /(株式会社|有限会社|合同会社|一般社団法人|財団法人|医療法人|学校法人|銀行|信託|組合|公社|協同組合)/.test(name);
}

function looksLikePerson(name: string) {
  const v = cleanValue(name);
  if (!v) return false;
  if (/[0-9]{3,}/.test(v)) return false;
  if (/^(順位|受付|原因|登記|住所|持分|甲区|乙区|権利部)/.test(v)) return false;
  return /[一-龠ぁ-んァ-ン]{2,}/.test(v);
}

function extractOwnerCandidates(lines: string[]) {
  const raw: string[] = [];

  for (const line of lines) {
    if (!isPlausibleText(line)) continue;
    if (HEADER_LINE.test(line) || EXCLUDED_RIGHTS_SECTION.test(line)) continue;

    if (/所有者|権利者その他事項|権利者|共有者|氏名/.test(line)) {
      const value = line.replace(/^(所有者|権利者その他事項|権利者|共有者|氏名)\s*[:：]?/, '').trim();
      if (value) raw.push(value);
    }

    const inline = [...line.matchAll(/(?:所有者|権利者|共有者)\s*[:：]?\s*([^\s]+)/g)].map((m) => m[1]);
    raw.push(...inline);
  }

  const cleaned = unique(raw)
    .map(cleanValue)
    .map(safeOwner)
    .filter(Boolean)
    .filter((v) => !/^(持分|住所|受付|順位|原因|記載)/.test(v))
    .filter((v) => looksLikeCorp(v) || looksLikePerson(v));

  return unique(cleaned);
}

function isInvalidKoukuEntry(cause: string, lines: string[]) {
  const joined = `${cause} ${lines.join(' ')}`;
  if (/抹消|全部抹消|一部抹消/.test(joined)) return true;
  if (/仮登記/.test(joined)) return true;
  if (/変更|更正/.test(joined)) return true;
  if (/登記名義人表示変更/.test(joined)) return true;
  return false;
}

function parseKoukuEntries(koukuLines: string[]) {
  const body = koukuLines.filter((line) => !/甲区|権利部/.test(line) && !HEADER_LINE.test(line));
  const blocks: Array<{ startIndex: number; lines: string[] }> = [];

  let current: string[] = [];
  let currentStart = 0;

  for (let i = 0; i < body.length; i++) {
    const line = body[i];

    if (isEntryStart(line) && current.length > 0) {
      blocks.push({ startIndex: currentStart, lines: current });
      current = [line];
      currentStart = i;
      continue;
    }

    if (current.length === 0) {
      current = [line];
      currentStart = i;
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push({ startIndex: currentStart, lines: current });
  }

  return blocks.map<KoukuEntry>((block) => {
    const purpose = extractPurpose(block.lines);
    const cause = extractCause(block.lines);
    const owners = extractOwnerCandidates(block.lines);
    const invalid = isInvalidKoukuEntry(cause, block.lines);
    const ownershipEvent = /所有権|移転|売買|相続|贈与/.test(`${cause} ${block.lines.join(' ')}`);

    return {
      startIndex: block.startIndex,
      lines: block.lines,
      purpose,
      cause,
      owners,
      invalid,
      ownershipEvent
    };
  });
}

function extractLatestOwnersFromKouku(entries: KoukuEntry[]) {
  const validOwnershipEntries = entries
    .filter((e) => e.ownershipEvent)
    .filter((e) => !e.invalid)
    .filter((e) => e.owners.length > 0);

  if (validOwnershipEntries.length === 0) return [];

  return validOwnershipEntries[validOwnershipEntries.length - 1].owners;
}

function extractOwnersHistory(entries: KoukuEntry[], allLines: string[]) {
  const structured = entries
    .filter((e) => e.ownershipEvent)
    .filter((e) => !e.invalid)
    .map((e) => {
      const parts: string[] = [];
      if (e.purpose) parts.push(e.purpose);
      if (e.cause) parts.push(`原因: ${e.cause}`);
      if (e.owners.length > 0) parts.push(`権利者: ${e.owners.join(' / ')}`);
      const merged = parts.join(' | ');
      return isPlausibleText(merged) ? merged : '';
    })
    .filter(Boolean);

  if (structured.length > 0) return unique(structured).slice(0, 30);

  const fallback = allLines.filter((line) => {
    return /所有権|所有者|権利者|共有者|原因|売買|相続|贈与|受付|第\d+号/.test(line) && isPlausibleText(line) && !EXCLUDED_RIGHTS_SECTION.test(line);
  });

  return unique(fallback).slice(0, 30);
}

function fallbackOwners(allLines: string[], ownersHistory: string[]) {
  const lineBased = allLines
    .filter((line) => /所有者|権利者|共有者/.test(line))
    .map((line) => line.replace(/^(所有者|権利者その他事項|権利者|共有者)\s*[:：]?/, '').trim())
    .map(safeOwner)
    .filter(Boolean);

  if (lineBased.length > 0) {
    return unique(lineBased.slice(-2));
  }

  const fromHistory = ownersHistory
    .map((v) => v.replace(/^.*権利者:\s*/, ''))
    .flatMap((v) => v.split('/'))
    .map(cleanValue)
    .map(safeOwner)
    .filter(Boolean);

  return unique(fromHistory.slice(-2));
}

export function extractToukiFields(text: string): ExtractedFields {
  const normalized = normalizeText(text);
  const rawLines = linesOf(normalized);
  const lines = rawLines.filter((line) => !isNoiseLine(line));

  const sections = splitSections(lines);
  const koukuEntries = parseKoukuEntries(sections.kouku);

  const location = extractLocationFromTitle(sections.title, sections.all);
  const number = extractNumberFromTitle(sections.title, sections.all);
  const area = extractAreaFromTitle(sections.title, sections.all);
  const buildingArea = extractBuildingAreaFromTitle(sections.title, sections.all);

  const ownersHistory = extractOwnersHistory(koukuEntries, sections.all);
  const owners = extractLatestOwnersFromKouku(koukuEntries);
  const fallback = fallbackOwners(sections.all, ownersHistory);
  const ownerList = (owners.length > 0 ? owners : fallback).map(safeOwner).filter(Boolean);

  return {
    location: safeLocation(location),
    number: safeNumber(number),
    area: safeArea(area),
    buildingArea: safeArea(buildingArea),
    owner: ownerList.join(' / '),
    ownersHistory: ownersHistory.filter((v) => isPlausibleText(v) && !looksLikeOcrGarbage(v)),
    raw: normalized
  };
}
