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
  all: string[];
};

type KoukuEntry = {
  startIndex: number;
  lines: string[];
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

function cleanValue(value: string) {
  return value
    .replace(/[|｜]/g, ' ')
    .replace(/[()（）【】「」『』]/g, ' ')
    .replace(/[‐-‒–—―]/g, '-')
    .replace(/^[\s:：・\-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeText(text: string) {
  let v = text
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
  if (/^[\W_]+$/.test(cleaned)) return true;
  if (/^[^一-龠ぁ-んァ-ンa-zA-Z0-9]+$/.test(cleaned)) return true;
  if (/(.)\1{6,}/.test(cleaned)) return true;
  if (/^[a-zA-Z0-9]{1,2}$/.test(cleaned)) return true;
  return false;
}

function isPlausibleText(line: string) {
  const cleaned = cleanValue(line);
  if (isNoiseLine(cleaned)) return false;
  if (/�/.test(cleaned)) return false;
  return true;
}

function findHeadingIndex(lines: string[], heading: RegExp) {
  return lines.findIndex((line) => heading.test(line));
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

  const title = lines.slice(titleStart, rightsStart > titleStart ? rightsStart : lines.length);
  const rights = rightsStart < lines.length ? lines.slice(rightsStart) : [];

  const koukuIdx = findHeadingIndex(rights, /甲区/);
  const otsukuIdx = findHeadingIndex(rights, /乙区/);

  let kouku: string[] = [];
  let otsuku: string[] = [];

  if (koukuIdx >= 0 && otsukuIdx >= 0) {
    if (koukuIdx < otsukuIdx) {
      kouku = rights.slice(koukuIdx, otsukuIdx);
      otsuku = rights.slice(otsukuIdx);
    } else {
      otsuku = rights.slice(otsukuIdx, koukuIdx);
      kouku = rights.slice(koukuIdx);
    }
  } else if (koukuIdx >= 0) {
    kouku = rights.slice(koukuIdx);
  } else if (rights.length > 0) {
    kouku = rights;
  }

  return { title, rights, kouku, otsuku, all: lines };
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

function extractLocationFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '所在'),
    findLabelValueByPosition(title, '所在', 6),
    findLabelValueByPosition(all, '所在', 6)
  ].map(cleanValue);

  for (const c of candidates) {
    if (!c) continue;
    if (!isPlausibleText(c)) continue;
    return c;
  }

  const joined = all.join('\n');
  const m = joined.match(/(.*?[都道府県].*?[市区町村].*)/);
  return m ? cleanValue(m[1]) : '';
}

function extractNumberFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '地番'),
    findLabelValueByPosition(title, '地番', 5),
    findLabelValueByPosition(all, '地番', 5)
  ].map(cleanValue);

  for (const c of candidates) {
    if (!c) continue;
    const m = c.match(/([0-9]{1,5}番[0-9\-]{0,8}|[0-9]{1,5}-[0-9]{1,5})/);
    if (m) return m[1];
  }

  const joined = all.join(' ');
  const m = joined.match(/([0-9]{1,5}番[0-9\-]{0,8}|[0-9]{1,5}-[0-9]{1,5})/);
  return m ? cleanValue(m[1]) : '';
}

function extractAreaFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '地積'),
    findLabelValueByPosition(title, '地積', 5),
    findLabelValueByPosition(all, '地積', 5)
  ].map(normalizeArea);

  for (const c of candidates) {
    if (c) return c;
  }

  const joined = all.join(' ');
  const m = joined.match(/([0-9]+(?:\.[0-9]+)?\s*㎡)/);
  return m ? normalizeArea(m[1]) : '';
}

function extractBuildingAreaFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractFromInlineTitleRow(title, '床面積'),
    extractFromInlineTitleRow(title, '建物面積'),
    findLabelValueByPosition(title, '床面積', 5),
    findLabelValueByPosition(title, '建物面積', 5),
    findLabelValueByPosition(all, '床面積', 5),
    findLabelValueByPosition(all, '建物面積', 5)
  ].map(normalizeArea);

  for (const c of candidates) {
    if (c) return c;
  }

  return '';
}

function isEntryStart(line: string) {
  if (/^順位番号\s*\d+/.test(line)) return true;
  if (/^第?\d+\s*(号|番)/.test(line)) return true;
  if (/^\d+\s+/.test(line) && /原因|登記/.test(line)) return true;
  return false;
}

function extractCause(lines: string[]) {
  const joined = lines.join(' ');
  const direct = joined.match(/原因\s*[:：]?\s*([^\n]+)/);
  if (direct?.[1]) return cleanValue(direct[1]);

  const event = lines.find((line) => /所有権|移転|相続|売買|贈与|抹消|変更|更正|仮登記/.test(line));
  return event ? cleanValue(event) : '';
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

    if (/所有者|権利者その他事項|権利者|氏名/.test(line)) {
      const value = line.replace(/^(所有者|権利者その他事項|権利者|氏名)\s*[:：]?/, '').trim();
      if (value) raw.push(value);
    }

    const inline = [...line.matchAll(/(?:所有者|権利者)\s*[:：]?\s*([^\s]+)/g)].map((m) => m[1]);
    raw.push(...inline);
  }

  return unique(raw)
    .map(cleanValue)
    .filter((v) => isPlausibleText(v))
    .filter((v) => !/^(持分|住所|受付|順位|原因|記載)/.test(v))
    .filter((v) => looksLikeCorp(v) || looksLikePerson(v));
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
  const body = koukuLines.filter((line) => !/甲区|権利部/.test(line));
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
    const cause = extractCause(block.lines);
    const owners = extractOwnerCandidates(block.lines);
    const invalid = isInvalidKoukuEntry(cause, block.lines);
    const ownershipEvent = /所有権|移転|売買|相続|贈与/.test(`${cause} ${block.lines.join(' ')}`);

    return {
      startIndex: block.startIndex,
      lines: block.lines,
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
    .map((e) => {
      const parts: string[] = [];
      if (e.cause) parts.push(`原因: ${e.cause}`);
      if (e.owners.length > 0) parts.push(`権利者: ${e.owners.join(' / ')}`);
      const merged = parts.join(' | ');
      return isPlausibleText(merged) ? merged : '';
    })
    .filter(Boolean);

  if (structured.length > 0) return unique(structured).slice(0, 30);

  const fallback = allLines.filter((line) => {
    return /所有権|所有者|権利者|原因|売買|相続|贈与/.test(line) && isPlausibleText(line);
  });

  return unique(fallback).slice(0, 30);
}

function fallbackOwners(allLines: string[], ownersHistory: string[]) {
  const lineBased = allLines
    .filter((line) => /所有者|権利者/.test(line))
    .map((line) => line.replace(/^(所有者|権利者その他事項|権利者)\s*[:：]?/, '').trim())
    .filter((line) => looksLikeCorp(line) || looksLikePerson(line));

  if (lineBased.length > 0) {
    return unique(lineBased.slice(-2));
  }

  const fromHistory = ownersHistory
    .map((v) => v.replace(/^.*権利者:\s*/, ''))
    .flatMap((v) => v.split('/'))
    .map(cleanValue)
    .filter((v) => looksLikeCorp(v) || looksLikePerson(v));

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
  const ownerList = owners.length > 0 ? owners : fallback;

  return {
    location,
    number,
    area,
    buildingArea,
    owner: ownerList.join(' / '),
    ownersHistory,
    raw: normalized
  };
}
