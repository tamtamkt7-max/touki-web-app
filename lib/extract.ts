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
  receipt: string;
  cause: string;
  owners: string[];
  invalid: boolean;
  ownershipEvent: boolean;
};

const LABEL_NORMALIZERS: Array<[RegExp, string]> = [
  [/表 題 部|表題都|表題郡|表題部\s*\(.*?\)/g, '表題部'],
  [/土地の表示|填地の表示|地の表示/g, '土地の表示'],
  [/権 利 部/g, '権利部'],
  [/甲 區|甲區/g, '甲区'],
  [/乙 區|乙區/g, '乙区'],
  [/所 邊|所辺|所 在|所　在|所在地|所奉|所夫/g, '所在'],
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

type OcrCorrectionRule = {
  pattern: RegExp;
  replacement: string;
  label: string;
};

export type OcrCorrectionSummary = {
  text: string;
  corrections: Array<{ label: string; count: number }>;
};

const OCR_CORRECTION_RULES: OcrCorrectionRule[] = [
  { pattern: /所\s*有\s*權/g, replacement: '所有権', label: '所有權→所有権' },
  { pattern: /所有権一部移云/g, replacement: '所有権一部移転', label: '所有権一部移転補正' },
  { pattern: /所\s*有\s*権\s*秘\s*転|所有権秘転|所有権移云/g, replacement: '所有権移転', label: '所有権移転補正' },
  { pattern: /所\s*有\s*権\s*移\s*転/g, replacement: '所有権移転', label: '所有権移転空白補正' },
  { pattern: /所\s*有\s*権/g, replacement: '所有権', label: '所有権空白補正' },
  { pattern: /所\s*有\s*省|所有省/g, replacement: '所有者', label: '所有者補正' },
  { pattern: /能\s*利\s*者|能利者|権刑者/g, replacement: '権利者', label: '権利者補正' },
  { pattern: /権\s*利\s*者\s*そ\s*の\s*他\s*の\s*事\s*項/g, replacement: '権利者その他事項', label: '権利者その他事項補正' },
  { pattern: /権\s*利\s*者/g, replacement: '権利者', label: '権利者空白補正' },
  { pattern: /共\s*有\s*者/g, replacement: '共有者', label: '共有者空白補正' },
  { pattern: /原\s*因|原囚|原回/g, replacement: '原因', label: '原因補正' },
  { pattern: /順\s*位\s*番\s*号|遷委番号/g, replacement: '順位番号', label: '順位番号補正' },
  { pattern: /受\s*付\s*年\s*月\s*日|受人年月日?/g, replacement: '受付年月日', label: '受付年月日補正' },
  { pattern: /受\s*付\s*番\s*号/g, replacement: '受付番号', label: '受付番号補正' },
  { pattern: /受信/g, replacement: '受付', label: '受付補正' },
  { pattern: /登\s*記\s*の\s*目\s*的|登記の日的/g, replacement: '登記の目的', label: '登記の目的補正' },
  { pattern: /登記の目的受付/g, replacement: '登記の目的 受付', label: '登記の目的/受付分割' },
  { pattern: /事[頂通]/g, replacement: '事項', label: '事項補正' },
  { pattern: /抵\s*当\s*挫/g, replacement: '抵当権', label: '抵当権補正' },
  { pattern: /抵当拍者/g, replacement: '抵当権者', label: '抵当権者補正' },
  { pattern: /共同[#＃]保/g, replacement: '共同担保', label: '共同担保補正' },
  { pattern: /担人の目的/g, replacement: '担保の目的', label: '担保の目的補正' },
  { pattern: /地\s*図\s*帯\s*[呈号]/g, replacement: '地図番号', label: '地図番号補正' },
  { pattern: /令\s*大|信和|令衝/g, replacement: '令和', label: '令和補正' },
  { pattern: /売\s*[質買暫]|沈\s*質/g, replacement: '売買', label: '売買補正' },
  { pattern: /大[機衝開欄限横]町/g, replacement: '大槻町', label: '大槻町候補補正' },
  { pattern: /茶山下/g, replacement: '葉山下', label: '葉山下候補補正' },
  { pattern: /都山市|都市山市|都市市|都市山|都市|部山市|前山市|拓貼市/g, replacement: '郡山市', label: '郡山市候補補正' },
  { pattern: /林式会社|床攻会社/g, replacement: '株式会社', label: '株式会社補正' },
  { pattern: /アー\s*ネ\s*ス\s*ト\s*ワン|アーネス\s*トワン|アー\s*ネスト\s*ワン/g, replacement: 'アーネストワン', label: 'アーネストワン補正' },
  { pattern: /波違|濾邊|[sg]辺/g, replacement: '渡辺 OCR候補', label: '渡辺候補補正' },
  { pattern: /所\s*在/g, replacement: '所在', label: '所在空白補正' },
  { pattern: /所[奉夫]/g, replacement: '所在', label: '所在候補補正' },
  { pattern: /填地の表示|地の表示/g, replacement: '土地の表示', label: '土地の表示補正' },
  { pattern: /地\s*番/g, replacement: '地番', label: '地番空白補正' },
  { pattern: /地\s*積/g, replacement: '地積', label: '地積空白補正' },
  { pattern: /床\s*面\s*積/g, replacement: '床面積', label: '床面積空白補正' },
  { pattern: /建\s*物\s*面\s*積/g, replacement: '建物面積', label: '建物面積空白補正' },
  { pattern: /表\s*題\s*部/g, replacement: '表題部', label: '表題部空白補正' },
  { pattern: /権\s*利\s*部/g, replacement: '権利部', label: '権利部空白補正' },
  { pattern: /甲\s*[区區]/g, replacement: '甲区', label: '甲区補正' },
  { pattern: /乙\s*[区區]/g, replacement: '乙区', label: '乙区補正' }
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

function countRuleMatches(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const copy = new RegExp(pattern.source, flags);
  return (value.match(copy) || []).length;
}

function applyOcrCorrectionRules(text: string, corrections: Map<string, number>) {
  let v = text;
  for (const rule of OCR_CORRECTION_RULES) {
    const count = countRuleMatches(v, rule.pattern);
    if (count > 0) {
      corrections.set(rule.label, (corrections.get(rule.label) || 0) + count);
      v = v.replace(rule.pattern, rule.replacement);
    }
  }
  return v;
}

function applyContextualNumberCorrections(text: string, corrections: Map<string, number>) {
  return text
    .split('\n')
    .map((line) => {
      let next = line;
      const isNumericContext = /地番|受付|順位番号|第|号|持分|分の|番地|地積|床面積|建物面積/.test(next);
      if (!isNumericContext) return next;

      const before = next;
      next = next
        .replace(/[§ＳS](?=\d)/g, '5')
        .replace(/(?<=\d)[§ＳS](?=\d|号|番|-|$)/g, '5')
        .replace(/(?<=\d)B(?=\d|号|番|-|$)/g, '8')
        .replace(/(?<=\d)[Il|｜](?=\d|号|番|-|$)/g, '1')
        .replace(/(?<=\d)O(?=\d|号|番|-|$)/g, '0')
        .replace(/第\s*(\d+)\s+(\d+)\s*号/g, '第$1$2号')
        .replace(/(\d)\s*[=:]\s*(\d)/g, '$1-$2')
        .replace(/(\d)\s+(\d)\s*分\s*の\s*(\d)/g, '$1$2分の$3')
        .replace(/(\d+)\s*分\s*の\s*(\d+)/g, '$1分の$2');

      if (next !== before) {
        corrections.set('数値文脈補正', (corrections.get('数値文脈補正') || 0) + 1);
      }
      return next;
    })
    .join('\n');
}

function applyContextualPlaceCorrections(text: string, corrections: Map<string, number>) {
  const before = text;
  const next = text.replace(/(所在\s*)都山市/g, '$1郡山市');
  if (next !== before) {
    corrections.set('郡山市候補補正', (corrections.get('郡山市候補補正') || 0) + 1);
  }
  return next;
}

export function normalizeOcrTextForExtractionWithReport(text: string): OcrCorrectionSummary {
  const corrections = new Map<string, number>();
  let v = text
    .replace(/\r/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[㎡m²㎥]/g, '㎡')
    .replace(/[｜|]/g, ' ')
    .replace(/(\d)\s*[=:]\s*(\d)/g, '$1-$2')
    .replace(/(\d+)\)/g, '$1')
    .replace(/\s{2,}/g, ' ');

  v = applyContextualNumberCorrections(v, corrections);
  v = applyContextualPlaceCorrections(v, corrections);
  v = applyOcrCorrectionRules(v, corrections);

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

  v = applyContextualNumberCorrections(v, corrections);
  v = applyContextualPlaceCorrections(v, corrections);
  v = applyOcrCorrectionRules(v, corrections);

  return {
    text: v.replace(/\n{2,}/g, '\n').trim(),
    corrections: [...corrections.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  };
}

export function normalizeOcrTextForExtraction(text: string) {
  return normalizeOcrTextForExtractionWithReport(text).text;
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

function hasHighSymbolNoise(value: string, maxRatio = 0.12) {
  const compact = value.replace(/\s/g, '');
  if (!compact) return true;
  return ratio(countMatches(compact, /[%@|｜*_~#=+<>\\]/g), compact.length) > maxRatio;
}

function hasExplicitOcrNoise(value: string) {
  return /[%@]|ーー|--|B2548|んかも|床攻会社|遷委番号|WESS|Mow|BRd Ana|2th22/.test(value);
}

function safeLocation(value: string) {
  const cleaned = cleanValue(value);
  if (!cleaned) return '';
  if (!isPlausibleText(cleaned)) return '';
  if (!hasJapaneseLikeText(cleaned)) return '';
  if (hasHighAsciiNoise(cleaned, 0.18)) return '';
  if (hasHighSymbolNoise(cleaned, 0.08)) return '';
  if (hasExplicitOcrNoise(cleaned)) return '';
  if (hasFieldContamination(cleaned)) return '';
  if (/の土地|土地本|持分|共有者|番地|丁目[0-9一二三四五六七八九十]+番|共同担保|抵当権/.test(cleaned)) return '';
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
  if (HEADER_LINE.test(cleaned)) return '';
  if (hasFieldContamination(cleaned)) return '';
  if (looksLikeAddress(cleaned)) return '';
  if (hasHighAsciiNoise(cleaned, 0.12)) return '';
  if (hasHighSymbolNoise(cleaned, 0.02)) return '';
  if (hasExplicitOcrNoise(cleaned)) return '';
  if (/OCR候補/.test(cleaned)) return '';
  if (/[0-9]+年[0-9]+月[0-9]+日|令和|平成|昭和|\/|／/.test(cleaned)) return '';
  if (/登記の目的|受付年月日|受付番号|順位番号|権利者その他|原因|売買|所有権移転|所有権一部移転|持分一部移転|抵当権|共同担保/.test(cleaned)) return '';
  if (/会社/.test(cleaned) && !looksLikeCorp(cleaned)) return '';
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
  const titleIdx = findHeadingIndex(lines, /表題部|土地の表示|所在|地番|地積/);
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

function valueAfterTitleLabel(line: string, label: string) {
  const idx = line.indexOf(label);
  if (idx < 0) return '';

  let after = line.slice(idx + label.length);
  const nextLabelIndexes = [...TITLE_LABELS, '地図番号', '地目', '種類', '構造']
    .filter((v) => v !== label)
    .map((v) => after.indexOf(v))
    .filter((v) => v >= 0);
  const sectionIndexes = ['権利部', '甲区', '乙区', '共同担保目録', '共同担保', '担保目録']
    .map((v) => after.indexOf(v))
    .filter((v) => v >= 0);
  const cutIndexes = [...nextLabelIndexes, ...sectionIndexes];
  if (cutIndexes.length > 0) {
    after = after.slice(0, Math.min(...cutIndexes));
  }

  return cleanValue(after);
}

function findLabelValueByPosition(section: string[], label: string, lookAhead = 5) {
  const idx = section.findIndex((line) => line.includes(label));
  if (idx < 0) return '';

  const sameLine = valueAfterTitleLabel(section[idx], label);
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

    const after = valueAfterTitleLabel(line, label);
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

  const sameLine = safeArea(valueAfterTitleLabel(section[idx], label));
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
    extractAreaByLabel(all, '地積', 2)
  ];

  for (const c of candidates) {
    const safe = safeArea(c);
    if (safe) return safe;
  }

  return '';
}

function extractBuildingAreaFromTitle(title: string[], all: string[]) {
  const candidates = [
    extractAreaByLabel(title, '床面積', 5),
    extractAreaByLabel(title, '建物面積', 5),
    extractAreaByLabel(all, '床面積', 2),
    extractAreaByLabel(all, '建物面積', 2)
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

function extractReceipt(lines: string[]) {
  const joined = lines.join(' ');
  const m = joined.match(/(?:受付\s*)?(第\s*[0-9]{1,8}\s*号)/);
  return m ? cleanValue(m[1].replace(/\s/g, '')) : '';
}

function extractPurpose(lines: string[]) {
  const purposeLine = lines.find((line) => /所有権保存|所有権移転|所有権一部移転|持分一部移転|所有権/.test(line));
  if (!purposeLine) return '';

  const cleaned = cleanValue(purposeLine.replace(/^登記の目的\s*[:：]?/, ''));
  const m = cleaned.match(/所有権保存|所有権一部移転|所有権移転|持分一部移転|所有権/);
  if (m) return m[0];
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
    if (/OCR候補/.test(line)) continue;

    if (/所有者|権利者その他事項|権利者|共有者|氏名/.test(line)) {
      const value = line.replace(/^(所有者|権利者その他事項|権利者|共有者|氏名)\s*[:：]?/, '').trim();
      if (value) {
        raw.push(value);
        raw.push(...value.split(/[／/]/).map(cleanValue));
      }
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

  const mergedBlocks: Array<{ startIndex: number; lines: string[] }> = [];
  for (const block of blocks) {
    const joined = block.lines.join(' ');
    const isReceiptOnly = /^(第\s*)?\d+\s*号$|^第\s*\d+\s*号$/.test(joined.replace(/\s/g, ''));
    if (isReceiptOnly) {
      const next = blocks[blocks.indexOf(block) + 1];
      if (next) {
        next.lines = [...block.lines, ...next.lines];
        next.startIndex = block.startIndex;
        continue;
      }
    }
    mergedBlocks.push(block);
  }

  return mergedBlocks.map<KoukuEntry>((block) => {
    const purpose = extractPurpose(block.lines);
    const receipt = extractReceipt(block.lines);
    const cause = extractCause(block.lines);
    const owners = extractOwnerCandidates(block.lines);
    const invalid = isInvalidKoukuEntry(cause, block.lines);
    const ownershipEvent = /所有権|移転|売買|相続|贈与/.test(`${cause} ${block.lines.join(' ')}`);

    return {
      startIndex: block.startIndex,
      lines: block.lines,
      purpose,
      receipt,
      cause,
      owners,
      invalid,
      ownershipEvent
    };
  });
}

function extractLatestOwnersFromKouku(entries: KoukuEntry[]) {
  const ownershipEntries = entries
    .filter((e) => e.ownershipEvent)
    .filter((e) => !e.invalid);

  if (ownershipEntries.length === 0) return [];

  const latest = ownershipEntries[ownershipEntries.length - 1];
  return latest.owners;
}

function isHistoryNoise(value: string) {
  const cleaned = cleanValue(value);
  if (!cleaned) return true;
  if (HEADER_LINE.test(cleaned)) return true;
  if (EXCLUDED_RIGHTS_SECTION.test(cleaned)) return true;
  if (hasExplicitOcrNoise(cleaned)) return true;
  if (/^[A-Za-z0-9\s]+$/.test(cleaned)) return true;
  if (/^[\d\/:.\-\s]+$/.test(cleaned)) return true;
  if (/^第?\d+号?$/.test(cleaned)) return true;
  if (/^受付\s*第?\d+号?$/.test(cleaned)) return true;
  return looksLikeOcrGarbage(cleaned);
}

function cleanHistoryItem(value: string) {
  return cleanValue(value)
    .replace(/\s*\|\s*/g, ' ')
    .replace(/権利者:\s*([^|]+?)\s*持分/g, '権利者: $1 持分')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractOwnersHistory(entries: KoukuEntry[], allLines: string[]) {
  const structured = entries
    .filter((e) => e.ownershipEvent)
    .filter((e) => !e.invalid)
    .map((e) => {
      const parts: string[] = [];
      if (e.purpose) parts.push(e.purpose);
      if (e.receipt) parts.push(`受付: ${e.receipt}`);
      if (e.cause) parts.push(`原因: ${e.cause}`);
      if (e.owners.length > 0) parts.push(`権利者: ${e.owners.join(' / ')}`);
      const shareLine = e.lines.find((line) => /持分\s*[0-9]+分の[0-9]+/.test(line));
      if (shareLine) {
        const share = shareLine.match(/持分\s*[0-9]+分の[0-9]+/);
        if (share) parts.push(share[0].replace(/\s/g, ''));
      }
      const merged = cleanHistoryItem(parts.join(' '));
      if (!merged) return '';
      if (HEADER_LINE.test(merged) || EXCLUDED_RIGHTS_SECTION.test(merged)) return '';
      if (isHistoryNoise(merged)) return '';
      return isPlausibleText(merged) ? merged : '';
    })
    .filter(Boolean);

  if (structured.length > 0) return unique(structured).slice(0, 30);

  const fallback = allLines.filter((line) => {
    return /所有権|所有者|権利者|共有者|原因|売買|相続|贈与|受付|第\d+号/.test(line) && isPlausibleText(line) && !isHistoryNoise(line);
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
  const hasKoukuOwnershipEntries = koukuEntries.some((e) => e.ownershipEvent && !e.invalid);
  const fallback = hasKoukuOwnershipEntries ? [] : fallbackOwners(sections.all, ownersHistory);
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
