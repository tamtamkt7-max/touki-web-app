'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import {
  extractToukiFields,
  normalizeOcrTextForExtraction,
  normalizeOcrTextForExtractionWithReport
} from '@/lib/extract';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type ExtractedFields = {
  location?: string;
  number?: string;
  area?: string;
  buildingArea?: string;
  owner?: string;
  ownersHistory?: string[];
  ownershipDiagnostics?: string[];
  fieldDiagnostics?: string[];
  raw?: string;
};

type ParseResponse = {
  fields: ExtractedFields;
};

type TextSource =
  | 'text-layer'
  | 'server'
  | 'ocr-original'
  | 'ocr-grayscale'
  | 'ocr-light'
  | 'ocr-contrast'
  | 'ocr-binary'
  | 'ocr-normalized';

type TextQuality = {
  score: number;
  labelCount: number;
  japaneseRatio: number;
  noiseRatio: number;
  garbageLineCount: number;
  length: number;
  lineCount: number;
};

type TextCandidate = {
  source: TextSource;
  rawText: string;
  parsed: ParseResponse;
  quality: TextQuality;
};

type OcrPage = {
  original: HTMLCanvasElement;
  grayscale: HTMLCanvasElement;
  light: HTMLCanvasElement;
  contrast: HTMLCanvasElement;
  binary: HTMLCanvasElement;
};

type OcrTextResult = {
  text: string;
  source: OcrImageSource;
  quality: TextQuality;
  diagnostics: OcrDiagnostics;
};

type OcrImageSource = Extract<
  TextSource,
  'ocr-original' | 'ocr-grayscale' | 'ocr-light' | 'ocr-contrast' | 'ocr-binary'
>;

type OcrVariantDiagnostic = {
  source: OcrImageSource;
  label: string;
  text: string;
  quality: TextQuality;
  extracted?: ExtractedFields;
  imageDataUrl?: string;
};

type OcrDiagnostics = {
  variants: OcrVariantDiagnostic[];
  adoptedSource?: TextSource;
  normalizedText?: string;
  normalizedQuality?: TextQuality;
  normalizedExtracted?: ExtractedFields;
  correctionExamples?: Array<{ label: string; count: number }>;
  normalizationSummary?: string[];
  fieldReasons?: string[];
  structureSummary?: string[];
  extractionAccepted?: boolean;
};

function hasEnoughText(text: string) {
  return text.replace(/\s/g, '').length >= 20;
}

const TOUKI_LABEL_PATTERNS = [
  /表\s*題\s*部/,
  /所\s*在/,
  /地\s*番/,
  /地\s*積/,
  /権\s*利\s*部/,
  /甲\s*[区區]/,
  /乙\s*[区區]/,
  /所\s*有\s*者/,
  /権\s*利\s*者/
];

function countMatches(value: string, pattern: RegExp) {
  return (value.match(pattern) || []).length;
}

function scoreTextQuality(text: string): TextQuality {
  const compact = text.replace(/\s/g, '');
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const length = compact.length;
  const japaneseCount = countMatches(compact, /[\u3040-\u30ff\u3400-\u9fff々〆ヶ]/g);
  const asciiCount = countMatches(compact, /[A-Za-z0-9]/g);
  const symbolCount = countMatches(compact, /[^A-Za-z0-9\u3040-\u30ff\u3400-\u9fff々〆ヶ\s]/g);
  const weirdTokenCount = countMatches(text, /\b[A-Za-z]{4,}\b/g);
  const labelCount = TOUKI_LABEL_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
  const garbageLineCount = lines.filter((line) => {
    const lineCompact = line.replace(/\s/g, '');
    if (lineCompact.length < 4) return false;
    const lineJapanese = countMatches(lineCompact, /[\u3040-\u30ff\u3400-\u9fff々〆ヶ]/g);
    const lineAscii = countMatches(lineCompact, /[A-Za-z0-9]/g);
    const lineSymbols = countMatches(lineCompact, /[^A-Za-z0-9\u3040-\u30ff\u3400-\u9fff々〆ヶ\s]/g);
    const lineWeirdWords = countMatches(line, /\b[A-Za-z]{4,}\b/g);
    return (
      (lineJapanese === 0 && lineAscii / lineCompact.length >= 0.55) ||
      (lineJapanese === 0 && lineSymbols / lineCompact.length >= 0.35) ||
      lineWeirdWords >= 2
    );
  }).length;

  const japaneseRatio = length > 0 ? japaneseCount / length : 0;
  const asciiRatio = length > 0 ? asciiCount / length : 0;
  const symbolRatio = length > 0 ? symbolCount / length : 0;
  const noiseRatio = length > 0 ? (asciiCount + symbolCount) / length : 0;
  const score =
    Math.min(length / 6, 45) +
    japaneseRatio * 80 +
    labelCount * 22 -
    asciiRatio * 35 -
    symbolRatio * 35 -
    weirdTokenCount * 8 -
    garbageLineCount * 15;

  return {
    score,
    labelCount,
    japaneseRatio,
    noiseRatio,
    garbageLineCount,
    length,
    lineCount: lines.length
  };
}

function isUsableQuality(quality: TextQuality, source: TextSource) {
  if (quality.length < 40) return false;
  if (quality.labelCount < 1) return false;
  if (quality.japaneseRatio < 0.18) return false;
  if (quality.garbageLineCount >= 8) return false;
  if (source.startsWith('ocr-')) {
    return quality.score >= 55 && quality.labelCount >= 2 && quality.garbageLineCount <= 3;
  }
  return quality.score >= 45;
}

function isPreviewableQuality(quality: TextQuality) {
  if (quality.length < 20) return false;
  if (quality.lineCount > 0 && quality.garbageLineCount >= Math.max(10, quality.lineCount * 0.8)) {
    return false;
  }

  return quality.score >= 5 || quality.labelCount >= 1 || quality.japaneseRatio >= 0.05;
}

function isStrongQuality(quality: TextQuality) {
  return quality.score >= 85 && quality.labelCount >= 3 && quality.garbageLineCount <= 2;
}

function previewScore(candidate: TextCandidate) {
  return (
    candidate.quality.score +
    Math.min(candidate.quality.length / 8, 60) +
    candidate.quality.labelCount * 12 -
    candidate.quality.garbageLineCount * 6
  );
}

function previewScoreForText(text: string) {
  const quality = scoreTextQuality(text);
  return (
    quality.score +
    Math.min(quality.length / 8, 60) +
    quality.labelCount * 12 -
    quality.garbageLineCount * 6
  );
}

function emptyParseResponse(previewText = ''): ParseResponse {
  return {
    fields: normalizeFields({ raw: previewText })
  };
}

function normalizeFields(fields: ExtractedFields = {}): ExtractedFields {
  return {
    location: fields.location || '',
    number: fields.number || '',
    area: fields.area || '',
    buildingArea: fields.buildingArea || '',
    owner: fields.owner || '',
    ownersHistory: Array.isArray(fields.ownersHistory) ? fields.ownersHistory.filter(Boolean) : [],
    ownershipDiagnostics: Array.isArray(fields.ownershipDiagnostics) ? fields.ownershipDiagnostics.filter(Boolean) : [],
    fieldDiagnostics: Array.isArray(fields.fieldDiagnostics) ? fields.fieldDiagnostics.filter(Boolean) : [],
    raw: fields.raw || ''
  };
}

function sourceLabel(source: TextSource) {
  switch (source) {
    case 'text-layer':
      return '文字層';
    case 'server':
      return 'サーバー解析';
    case 'ocr-original':
      return 'OCR original';
    case 'ocr-grayscale':
      return 'OCR grayscale';
    case 'ocr-light':
      return 'OCR light';
    case 'ocr-contrast':
      return 'OCR contrast';
    case 'ocr-binary':
      return 'OCR binary';
    case 'ocr-normalized':
      return 'OCR normalized';
  }
}

function formatScore(value: number) {
  return String(Math.round(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clipDiagnosticText(text = '') {
  const limit = 5000;
  return text.length > limit ? `${text.slice(0, limit)}\n...（以下省略）` : text;
}

function localParseResponse(text: string, rawText = text): ParseResponse {
  const fields = extractToukiFields(text);
  return {
    fields: normalizeFields({
      ...fields,
      raw: rawText
    })
  };
}

function buildNormalizationSummary(before: TextQuality, after: TextQuality) {
  return [
    `正規化前スコア: ${formatScore(before.score)} / 後: ${formatScore(after.score)}`,
    `ラベル数: ${before.labelCount} → ${after.labelCount}`,
    `日本語率: ${formatPercent(before.japaneseRatio)} → ${formatPercent(after.japaneseRatio)}`,
    `ノイズ率: ${formatPercent(before.noiseRatio)} → ${formatPercent(after.noiseRatio)}`
  ];
}

function hasExtractedValue(fields: ExtractedFields) {
  return Boolean(
    fields.location ||
      fields.number ||
      fields.area ||
      fields.buildingArea ||
      fields.owner ||
      (fields.ownersHistory && fields.ownersHistory.length > 0)
  );
}

function fieldCompleteness(fields: ExtractedFields) {
  return [
    fields.location,
    fields.number,
    fields.area,
    fields.buildingArea,
    fields.owner,
    fields.ownersHistory && fields.ownersHistory.length > 0 ? 'history' : ''
  ].filter(Boolean).length;
}

function scoreFieldCandidate(candidate: TextCandidate, field: keyof ExtractedFields) {
  const value = candidate.parsed.fields[field];
  if (Array.isArray(value)) return value.length * 12 + candidate.quality.labelCount * 2;
  if (!value) return -Infinity;

  let score = candidate.quality.labelCount * 5 + candidate.quality.japaneseRatio * 20 - candidate.quality.noiseRatio * 10;
  if (candidate.source === 'ocr-normalized') score += 8;
  if (field === 'number' && /^[0-9]{1,5}(?:番[0-9-]{0,8}|-[0-9]{1,5})$/.test(value)) score += 40;
  if ((field === 'area' || field === 'buildingArea') && /^[0-9]+(?:\.[0-9]+)?㎡$/.test(value)) score += 35;
  if (field === 'owner') score += /株式会社|有限会社|合同会社|[一-龠]{2,}/.test(value) ? 35 : -30;
  if (field === 'location') score += /[都道府県市区町村]/.test(value) ? 35 : -20;
  return score;
}

function chooseField(candidates: TextCandidate[], field: keyof ExtractedFields) {
  return [...candidates]
    .filter((candidate) => {
      const value = candidate.parsed.fields[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    })
    .sort((a, b) => scoreFieldCandidate(b, field) - scoreFieldCandidate(a, field))[0];
}

function hasDangerousConfirmedText(value: string) {
  return /登記の目的|受付年月日|受付番号|順位番号|遷委番号|権利者その他|原因|売買|所有権移転|所有権一部移転|持分一部移転|抵当権|共同担保|担保目録|[%@|｜]|ーー|B2548|んかも|床攻会社/.test(value);
}

function hasAsciiOrSymbolNoise(value: string, limit = 0.12) {
  const compact = value.replace(/\s/g, '');
  if (!compact) return true;
  const noisy = (compact.match(/[A-Za-z%*@|｜_~#=+<>\\]/g) || []).length;
  return noisy / compact.length > limit;
}

function isConfirmedFieldValue(field: keyof ExtractedFields, value?: string) {
  if (!value) return false;
  if (hasDangerousConfirmedText(value)) return false;

  if (field === 'owner') {
    if (hasAsciiOrSymbolNoise(value, 0.04)) return false;
    if (/[都道府県市区町村].*(丁目|番地|番)/.test(value)) return false;
    if (/会社/.test(value) && !/(株式会社|有限会社|合同会社|一般社団法人|財団法人|医療法人|学校法人)/.test(value)) {
      return false;
    }
    return /(株式会社|有限会社|合同会社|一般社団法人|財団法人|医療法人|学校法人|[一-龠ぁ-んァ-ン]{2,})/.test(value);
  }

  if (field === 'location') {
    if (hasAsciiOrSymbolNoise(value, 0.06)) return false;
    if (/丁目[0-9一二三四五六七八九十]+番|番地|の土地|土地本|持分|共有者/.test(value)) return false;
    return /[都道府県市区町村]/.test(value);
  }

  if (field === 'number') {
    if (/番地|丁目|所有者|共有者|権利者|抵当権|債務者/.test(value)) return false;
    return /^[0-9]{1,5}(?:番[0-9-]{0,8}|-[0-9]{1,5})$/.test(value);
  }

  if (field === 'area' || field === 'buildingArea') {
    const m = value.match(/^([0-9]+(?:\.[0-9]+)?)㎡$/);
    if (!m) return false;
    const numeric = Number(m[1]);
    if (!Number.isFinite(numeric)) return false;
    return field === 'area' ? numeric >= 10 && numeric <= 1000000 : numeric >= 1 && numeric <= 100000;
  }

  return false;
}

function chooseConfirmedField(candidates: TextCandidate[], field: keyof ExtractedFields) {
  return [...candidates]
    .filter((candidate) => {
      const value = candidate.parsed.fields[field];
      return !Array.isArray(value) && isConfirmedFieldValue(field, value);
    })
    .sort((a, b) => scoreFieldCandidate(b, field) - scoreFieldCandidate(a, field))[0];
}

function mergeFieldCandidates(candidates: TextCandidate[], previewText: string): ParseResponse {
  const location = chooseConfirmedField(candidates, 'location')?.parsed.fields.location || '';
  const number = chooseConfirmedField(candidates, 'number')?.parsed.fields.number || '';
  const area = chooseConfirmedField(candidates, 'area')?.parsed.fields.area || '';
  const buildingArea = chooseConfirmedField(candidates, 'buildingArea')?.parsed.fields.buildingArea || '';
  const owner = chooseConfirmedField(candidates, 'owner')?.parsed.fields.owner || '';
  const historyCandidate = chooseField(candidates, 'ownersHistory');

  return {
    fields: normalizeFields({
      location,
      number,
      area,
      buildingArea,
      owner,
      ownersHistory: historyCandidate?.parsed.fields.ownersHistory || [],
      raw: previewText
    })
  };
}

function candidateSourceForField(candidates: TextCandidate[], field: keyof ExtractedFields, value?: string) {
  if (!value) return '';
  const candidate = candidates.find((item) => item.parsed.fields[field] === value);
  return candidate ? sourceLabel(candidate.source) : '';
}

function countLikelyHistoryNoise(text = '') {
  return text
    .split(/\n+/)
    .filter((line) => /WESS|Mow|BRd Ana|2th22|抵当権|共同担保|担保目録|^[A-Za-z0-9\s]{4,}$/.test(line.trim()))
    .length;
}

function buildStructureSummary(text = '', fields: ExtractedFields) {
  const compact = text.replace(/\s/g, '');
  return [
    `表題部候補: ${/表題部|土地の表示|所在|地番|地積/.test(compact) ? 'あり' : '未確認'}`,
    `甲区候補: ${/甲区|所有権移転|所有権一部移転|持分一部移転/.test(compact) ? 'あり' : '未確認'}`,
    `乙区除外候補: ${/乙区|抵当権/.test(compact) ? 'あり' : 'なし'}`,
    `共同担保除外候補: ${/共同担保|担保目録/.test(compact) ? 'あり' : 'なし'}`,
    `ownersHistory有効件数: ${fields.ownersHistory?.length || 0}件`,
    `甲区所有関係診断: ${fields.ownershipDiagnostics?.length || 0}件`,
    ...(fields.ownershipDiagnostics || []),
    `Title/field diagnostics: ${fields.fieldDiagnostics?.length || 0} items`,
    ...(fields.fieldDiagnostics || []),
    `ownersHistoryノイズ除外目安: ${countLikelyHistoryNoise(text)}行`,
    `最新所有者: ${fields.owner ? '確定候補あり' : '未検出（最新有効エントリの人名/法人名根拠不足）'}`,
    `CSV/Excel確定値: owner=${fields.owner || '空欄'} / location=${fields.location || '空欄'} / number=${fields.number || '空欄'} / area=${fields.area || '空欄'} / buildingArea=${fields.buildingArea || '空欄'}`
  ];
}

function buildFieldReasons(fields: ExtractedFields, candidates: TextCandidate[] = []) {
  const sourceFor = (field: keyof ExtractedFields, value?: string) => {
    const source = candidateSourceForField(candidates, field, value);
    return source ? ` / 採用元: ${source}` : '';
  };

  return [
    `location: ${fields.location ? `${fields.location}（表題部所在の確定候補${sourceFor('location', fields.location)}）` : '未検出（表題部所在なし、所有者住所/担保目録/OCRノイズ由来の候補を却下）'}`,
    `number: ${fields.number ? `${fields.number}（地番ラベル近傍の確定候補${sourceFor('number', fields.number)}）` : '未検出（住所内番地、共有者住所、または地番ラベル根拠なしの番号を却下）'}`,
    `area: ${fields.area ? `${fields.area}（地積ラベル近傍の確定候補${sourceFor('area', fields.area)}）` : '未検出（地積ラベル近傍ではない面積値を却下）'}`,
    `buildingArea: ${fields.buildingArea ? `${fields.buildingArea}（床面積/建物面積ラベル近傍の確定候補${sourceFor('buildingArea', fields.buildingArea)}）` : '未検出（床面積/建物面積ラベル近傍ではない値を却下）'}`,
    `owner: ${fields.owner ? `${fields.owner}（甲区の最新有効エントリ由来の確定候補${sourceFor('owner', fields.owner)}）` : '未検出（見出し語、原因文、住所、日付混入、またはOCRノイズ混じり候補を却下）'}`,
    `history: ${fields.ownersHistory?.length || 0}件（甲区所有権事項を優先）`
  ];
}

function formatExtractedSummary(fields?: ExtractedFields) {
  if (!fields) return '抽出: 未実行';
  return [
    `location: ${fields.location || '未検出'}`,
    `number: ${fields.number || '未検出'}`,
    `owner: ${fields.owner || '未検出'}`,
    `history: ${fields.ownersHistory?.length || 0}件`
  ].join(' / ');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function otsuThreshold(grays: Uint8Array) {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < grays.length; i++) hist[grays[i]]++;

  const total = grays.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;

    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVar) {
      maxVar = variance;
      threshold = t;
    }
  }

  return clamp(threshold, 70, 210);
}

function despeckleBinary(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  const idx = (x: number, y: number) => (y * width + x) * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = idx(x, y);
      const center = copy[i];
      let blackNeighbors = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          if (kx === 0 && ky === 0) continue;
          if (copy[idx(x + kx, y + ky)] < 128) blackNeighbors++;
        }
      }

      if (center < 128 && blackNeighbors <= 1) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
  }
}

function preprocessCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const grays = new Uint8Array(canvas.width * canvas.height);

  for (let i = 0; i < data.length; i += 4) {
    const rawGray = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
    const contrasted = clamp(Math.round((rawGray - 128) * 1.9 + 128), 0, 255);
    grays[i / 4] = contrasted;
  }

  const threshold = otsuThreshold(grays);

  for (let i = 0; i < data.length; i += 4) {
    const bw = grays[i / 4] >= threshold ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }

  despeckleBinary(data, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);

  return autoCropCanvas(canvas);
}

function tonePreprocessCanvas(
  source: HTMLCanvasElement,
  options: { contrast: number; brightness: number; sharpen?: boolean }
) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const rawGray = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
    const contrasted = clamp(Math.round((rawGray - 128) * options.contrast + 128 + options.brightness), 0, 255);
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }

  ctx.putImageData(imageData, 0, 0);

  if (options.sharpen) {
    ctx.filter = 'contrast(1.08) brightness(1.02)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return canvas;
}

function grayscalePreprocessCanvas(source: HTMLCanvasElement) {
  return tonePreprocessCanvas(source, { contrast: 1.12, brightness: 4 });
}

function lightPreprocessCanvas(source: HTMLCanvasElement) {
  return tonePreprocessCanvas(source, { contrast: 1.22, brightness: 8, sharpen: true });
}

function contrastPreprocessCanvas(source: HTMLCanvasElement) {
  return tonePreprocessCanvas(source, { contrast: 1.5, brightness: 10, sharpen: true });
}

function autoCropCanvas(source: HTMLCanvasElement) {
  const srcCtx = source.getContext('2d');
  if (!srcCtx) return source;

  const { width, height } = source;
  const imageData = srcCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const rowHasInk = (y: number) => {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 245) return true;
    }
    return false;
  };

  const colHasInk = (x: number) => {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (data[i] < 245) return true;
    }
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < height && !rowHasInk(top)) top++;
  while (bottom > top && !rowHasInk(bottom)) bottom--;
  while (left < width && !colHasInk(left)) left++;
  while (right > left && !colHasInk(right)) right--;

  const padding = 60;
  top = clamp(top - padding, 0, height - 1);
  bottom = clamp(bottom + padding, 0, height - 1);
  left = clamp(left - padding, 0, width - 1);
  right = clamp(right + padding, 0, width - 1);

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;

  if (cropWidth < width * 0.75 || cropHeight < height * 0.75) {
    return source;
  }

  const cropped = document.createElement('canvas');
  cropped.width = cropWidth;
  cropped.height = cropHeight;

  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return source;

  croppedCtx.drawImage(
    source,
    left,
    top,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return cropped;
}

function shouldProcessPageForOcr(pageText: string, pageNum: number) {
  const compact = pageText.replace(/\s/g, '');
  const keywordScore = [
    '表題部',
    '権利部',
    '甲区',
    '乙区',
    '所在',
    '地番',
    '地積',
    '床面積',
    '建物面積',
    '所有者',
    '権利者',
    '順位番号',
    '原因'
  ].reduce((score, keyword) => (compact.includes(keyword) ? score + 1 : score), 0);

  const garbledScore = (compact.match(/�|\?|□|◯|・{2,}/g) || []).length;

  // 1ページ目は表題部の可能性が高いため積極的に対象化
  if (pageNum === 1) {
    if (compact.length < 160) return true;
    return keywordScore >= 1 && compact.length < 220;
  }

  // 文字層が十分なページはOCR対象外（速度優先）
  if (compact.length >= 220 && garbledScore === 0) {
    return false;
  }

  // 文字層が乏しい・崩れている・登記キーワードを含む場合のみOCR
  if (compact.length < 60) return true;
  if (garbledScore >= 2) return true;
  if (keywordScore >= 1 && compact.length < 180) return true;

  return false;
}

async function extractTextLayerFromPdf(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

async function renderPdfPages(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: OcrPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');

    if (!shouldProcessPageForOcr(pageText, pageNum)) {
      continue;
    }

    const viewport = page.getViewport({ scale: 3.8 });

    const original = document.createElement('canvas');
    const context = original.getContext('2d');
    if (!context) continue;

    original.width = viewport.width;
    original.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    pages.push({
      original,
      grayscale: grayscalePreprocessCanvas(original),
      light: lightPreprocessCanvas(original),
      contrast: contrastPreprocessCanvas(original),
      binary: preprocessCanvas(original)
    });
  }

  if (pages.length === 0) {
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 3.8 });
    const original = document.createElement('canvas');
    const context = original.getContext('2d');

    if (context) {
      original.width = viewport.width;
      original.height = viewport.height;
      await firstPage.render({ canvasContext: context, viewport }).promise;
      pages.push({
        original,
        grayscale: grayscalePreprocessCanvas(original),
        light: lightPreprocessCanvas(original),
        contrast: contrastPreprocessCanvas(original),
        binary: preprocessCanvas(original)
      });
    }
  }

  return pages;
}

async function recognizeImage(
  image: string,
  onStatus?: (v: string) => void,
  label?: string
) {
  const result = await Tesseract.recognize(image, 'jpn+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && label) {
        onStatus?.(label);
      }
    }
  });

  return result.data.text.trim();
}

async function extractTextWithOcr(file: File, onStatus?: (v: string) => void): Promise<OcrTextResult> {
  const pages = await renderPdfPages(file);
  let fullText = '';
  const variantTexts: Record<OcrImageSource, string> = {
    'ocr-original': '',
    'ocr-grayscale': '',
    'ocr-light': '',
    'ocr-contrast': '',
    'ocr-binary': ''
  };
  const firstPageImages: Partial<Record<OcrImageSource, string>> = {};
  const sourceCounts: Record<OcrImageSource, number> = {
    'ocr-original': 0,
    'ocr-grayscale': 0,
    'ocr-light': 0,
    'ocr-contrast': 0,
    'ocr-binary': 0
  };

  for (let i = 0; i < pages.length; i++) {
    const pageNo = i + 1;

    const variants: Array<{
      source: OcrImageSource;
      canvas: HTMLCanvasElement;
      label: string;
    }> = [
      {
        source: 'ocr-original',
        canvas: pages[i].original,
        label: `OCRで読み取り中… ${pageNo}/${pages.length}ページ`
      },
      {
        source: 'ocr-grayscale',
        canvas: pages[i].grayscale,
        label: `グレースケールで読み取り中… ${pageNo}/${pages.length}ページ`
      },
      {
        source: 'ocr-light',
        canvas: pages[i].light,
        label: `軽く補正して読み取り中… ${pageNo}/${pages.length}ページ`
      },
      {
        source: 'ocr-contrast',
        canvas: pages[i].contrast,
        label: `コントラスト補正して読み取り中… ${pageNo}/${pages.length}ページ`
      },
      {
        source: 'ocr-binary',
        canvas: pages[i].binary,
        label: `二値化して読み取り中… ${pageNo}/${pages.length}ページ`
      }
    ];

    const results = [];
    for (const variant of variants) {
      const imageDataUrl = variant.canvas.toDataURL('image/png');
      if (!firstPageImages[variant.source]) {
        firstPageImages[variant.source] = imageDataUrl;
      }

      const text = await recognizeImage(
        imageDataUrl,
        onStatus,
        variant.label
      );
      variantTexts[variant.source] += `${text}\n`;
      results.push({
        source: variant.source,
        text,
        quality: scoreTextQuality(text)
      });
    }

    const best = results.sort((a, b) => previewScoreForText(b.text) - previewScoreForText(a.text))[0];
    sourceCounts[best.source] += 1;
    fullText += `${best.text}\n`;
  }

  const source = (Object.entries(sourceCounts) as Array<[OcrImageSource, number]>).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  const diagnostics: OcrDiagnostics = {
    variants: (Object.keys(variantTexts) as OcrImageSource[]).map((source) => ({
      source,
      label: sourceLabel(source),
      text: variantTexts[source].trim(),
      quality: scoreTextQuality(variantTexts[source]),
      imageDataUrl: firstPageImages[source]
    })),
    adoptedSource: source
  };

  console.debug('touki ocr image data urls', firstPageImages);

  return {
    text: fullText.trim(),
    source,
    quality: scoreTextQuality(fullText),
    diagnostics
  };
}

async function parseWithRawText(rawText: string) {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText })
  });

  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || '解析に失敗しました。');
  }

  if (!res.ok) {
    throw new Error(data?.error || '解析に失敗しました。');
  }

  return data as ParseResponse;
}

async function parseWithServerPdf(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/parse', {
    method: 'POST',
    body: formData
  });

  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || '解析に失敗しました。');
  }

  if (!res.ok) {
    throw new Error(data?.error || '解析に失敗しました。');
  }

  return data as ParseResponse;
}

export function ToolClient() {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [doneMessage, setDoneMessage] = useState('');
  const [qualityWarning, setQualityWarning] = useState('');
  const [readMeta, setReadMeta] = useState('');
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OcrDiagnostics | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  const summaryCards = useMemo(() => {
    if (!result?.fields) return [];
    return [
      { label: '最新の持ち主', value: result.fields.owner || '未検出' },
      { label: '所在地', value: result.fields.location || '未検出' },
      { label: '地番', value: result.fields.number || '未検出' },
      { label: '土地の面積', value: result.fields.area || '未検出' },
      { label: '建物の面積', value: result.fields.buildingArea || '未検出' }
    ];
  }, [result]);

  const detailRows = useMemo(() => {
    if (!result?.fields) return [];
    return [
      ['最新の持ち主', result.fields.owner || '未検出'],
      ['所在地', result.fields.location || '未検出'],
      ['地番', result.fields.number || '未検出'],
      ['土地の面積', result.fields.area || '未検出'],
      ['建物の面積', result.fields.buildingArea || '未検出']
    ];
  }, [result]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  async function handleFile(file?: File | null) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください。');
      return;
    }

    setLoading(true);
    setDragging(false);
    setError('');
    setResult(null);
    setDoneMessage('');
    setQualityWarning('');
    setReadMeta('');
    setOcrDiagnostics(null);
    setStatusText('PDFの文字を確認しています…');

    try {
      const candidates: TextCandidate[] = [];
      let latestOcrDiagnostics: OcrDiagnostics | null = null;
      const addCandidate = (
        source: TextCandidate['source'],
        rawText: string,
        parsed: ParseResponse,
        qualityText = rawText
      ) => {
        candidates.push({
          source,
          rawText,
          parsed,
          quality: scoreTextQuality(qualityText)
        });
      };
      const chooseBestCandidate = () =>
        [...candidates].sort((a, b) => b.quality.score - a.quality.score)[0];
      const choosePreviewCandidate = () =>
        [...candidates]
          .filter((candidate) => isPreviewableQuality(candidate.quality))
          .sort((a, b) => previewScore(b) - previewScore(a))[0];

      const textLayer = await extractTextLayerFromPdf(file);

      if (hasEnoughText(textLayer)) {
        setStatusText('文字を整理しています…');
        const parsed = await parseWithRawText(textLayer);
        addCandidate('text-layer', textLayer, parsed);
      }

      setStatusText('別の方法でPDFを確認しています…');
      try {
        const serverParsed = await parseWithServerPdf(file);
        addCandidate('server', serverParsed.fields.raw || '', serverParsed);
      } catch {
        // OCRへ進む
      }

      const bestBeforeOcr = chooseBestCandidate();
      if (!bestBeforeOcr || !isStrongQuality(bestBeforeOcr.quality)) {
        const ocrResult = await extractTextWithOcr(file, setStatusText);

        if (hasEnoughText(ocrResult.text)) {
          setStatusText('読み取った内容を整理しています…');
          const normalizationReport = normalizeOcrTextForExtractionWithReport(ocrResult.text);
          const normalizedExtractionText = normalizationReport.text;
          const parseText = hasEnoughText(normalizedExtractionText)
            ? normalizedExtractionText
            : ocrResult.text;
          const normalizedParsed = localParseResponse(parseText, ocrResult.text);

          for (const variant of ocrResult.diagnostics.variants) {
            const normalizedVariantText = normalizeOcrTextForExtraction(variant.text);
            const variantParsed = localParseResponse(normalizedVariantText, variant.text);
            variant.extracted = variantParsed.fields;
            addCandidate(variant.source, variant.text, variantParsed, normalizedVariantText);
          }

          addCandidate('ocr-normalized', ocrResult.text, normalizedParsed, parseText);

          const previewQuality = scoreTextQuality(ocrResult.text);
          const normalizedQuality = scoreTextQuality(parseText);
          latestOcrDiagnostics = {
            ...ocrResult.diagnostics,
            normalizedText: parseText,
            normalizedQuality,
            normalizedExtracted: normalizedParsed.fields,
            correctionExamples: normalizationReport.corrections.slice(0, 12),
            normalizationSummary: buildNormalizationSummary(previewQuality, normalizedQuality)
          };
          console.debug('touki ocr normalization', {
            source: ocrResult.source,
            previewScore: Math.round(previewQuality.score),
            normalizedScore: Math.round(normalizedQuality.score),
            previewLabels: previewQuality.labelCount,
            normalizedLabels: normalizedQuality.labelCount
          });
        }
      }

      const best = chooseBestCandidate();
      const usableBest = best && isUsableQuality(best.quality, best.source) ? best : null;
      const previewBest = choosePreviewCandidate();
      const previewText = previewBest?.rawText || '';
      const fieldMerged = mergeFieldCandidates(candidates, previewText);
      const fieldMergedAccepted = hasExtractedValue(fieldMerged.fields);
      const displayCandidate = usableBest || previewBest;
      if (latestOcrDiagnostics) {
        setOcrDiagnostics({
          ...latestOcrDiagnostics,
          fieldReasons: buildFieldReasons(fieldMerged.fields, candidates),
          structureSummary: buildStructureSummary(latestOcrDiagnostics.normalizedText || previewText, fieldMerged.fields),
          extractionAccepted: Boolean(usableBest || fieldMergedAccepted),
          adoptedSource: displayCandidate?.source || latestOcrDiagnostics.adoptedSource
        });
      } else {
        setOcrDiagnostics(null);
      }
      setReadMeta(
        displayCandidate
          ? `読み取り方法: ${sourceLabel(displayCandidate.source)} / 品質スコア: ${Math.round(displayCandidate.quality.score)}`
          : ''
      );

      if (usableBest || fieldMergedAccepted) {
        const fields = normalizeFields(usableBest
          ? {
              ...usableBest.parsed.fields,
              ...fieldMerged.fields,
              raw: usableBest.rawText || fieldMerged.fields.raw || usableBest.parsed.fields.raw || previewText
            }
          : fieldMerged.fields);
        setResult({
          fields
        });
        setDoneMessage('抽出が完了しました。内容を確認してください。');
        setQualityWarning(usableBest ? '' : 'PDFの文字認識が不安定です。プレビューを確認し、必要に応じて手入力してください。');
      } else {
        setResult(emptyParseResponse(previewText));
        setDoneMessage('');
        setQualityWarning(
          'PDFの文字認識が不安定です。プレビューを確認し、必要に応じて手入力してください。'
        );
      }
      setStatusText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDFの読み取りに失敗しました。');
      setStatusText('');
      setDoneMessage('');
      setQualityWarning('');
      setReadMeta('');
      setOcrDiagnostics(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadFile(format: 'xlsx' | 'csv') {
    if (!result) return;

    const res = await fetch('/api/parse', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format,
        fields: result.fields
      })
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || '出力ファイルの作成に失敗しました。');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'csv' ? 'touki-output.csv' : 'touki-output.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setResult(null);
    setError('');
    setStatusText('');
    setDoneMessage('');
    setQualityWarning('');
    setReadMeta('');
    setOcrDiagnostics(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="tool">
      <div className="tool-header">
        <div>
          <p className="eyebrow">PDFを入れるだけ</p>
          <h1 className="tool-title">登記簿PDFを、見やすく整理してすぐ使える形へ。</h1>
          <p className="tool-lead">
            PDFを入れるだけで、所在地・地番・面積・最新の持ち主を整理して表示します。
            結果はその場で確認でき、必要ならCSVやExcelで保存できます。
          </p>
        </div>
      </div>

      <section
        className={`dropzone ${dragging ? 'is-dragging' : ''} ${loading ? 'is-loading' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />

        <div className="dropzone-inner">
          <div className="dropzone-icon">📄</div>
          <h2 className="dropzone-title">
            {loading ? 'PDFを読み取り中です…' : 'ここに登記簿PDFをドラッグ＆ドロップ'}
          </h2>
          <p className="dropzone-text">
            {loading
              ? statusText || '内容を整理しています。少しだけお待ちください。'
              : 'またはクリックしてPDFを選択'}
          </p>
        </div>
      </section>

      <div className="tool-pills">
        <span>PDFを入れるだけ</span>
        <span>画面ですぐ確認</span>
        <span>必要ならCSV / Excel保存</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {doneMessage ? <div className="alert alert-success">{doneMessage}</div> : null}
      {qualityWarning ? <div className="alert">{qualityWarning}</div> : null}

      {result ? (
        <section className="result-section" ref={resultRef}>
          <div className="summary-grid">
            {summaryCards.map((card) => (
              <article key={card.label} className="summary-card">
                <div className="summary-label">{card.label}</div>
                <div className="summary-value">{card.value}</div>
              </article>
            ))}
          </div>

          <div className="result-grid">
            <article className="result-card">
              <div className="result-card-header">
                <h3>整理した結果</h3>
              </div>

              <div className="detail-table">
                {detailRows.map(([label, value]) => (
                  <div className="detail-row" key={String(label)}>
                    <div className="detail-label">{label}</div>
                    <div className="detail-value">{value}</div>
                  </div>
                ))}
              </div>

              <div className="result-card-header" style={{ marginTop: 20 }}>
                <h3>持ち主の流れ</h3>
              </div>

              {result.fields.ownersHistory && result.fields.ownersHistory.length > 0 ? (
                <ol className="timeline">
                  {result.fields.ownersHistory.map((item, index) => (
                    <li key={`${item}-${index}`} className="timeline-item">
                      <span className="timeline-index">{index + 1}</span>
                      <span className="timeline-text">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">履歴はまだ読み取れませんでした。</p>
              )}
            </article>

            <article className="result-card">
              <div className="result-card-header">
                <h3>抽出結果プレビュー</h3>
              </div>
              {readMeta ? <p className="muted">{readMeta}</p> : null}

              <textarea
                readOnly
                value={result.fields.raw || ''}
                className="preview-textarea"
              />

              {ocrDiagnostics ? (
                <details style={{ marginTop: 16 }}>
                  <summary className="muted" style={{ cursor: 'pointer', fontWeight: 700 }}>
                    読み取り診断を表示
                  </summary>

                  <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
                    <div className="muted">
                      採用: {ocrDiagnostics.adoptedSource ? sourceLabel(ocrDiagnostics.adoptedSource) : '未採用'} / 抽出採用:{' '}
                      {ocrDiagnostics.extractionAccepted ? 'あり' : 'なし'}
                      {ocrDiagnostics.normalizedQuality
                        ? ` / 正規化後スコア: ${formatScore(ocrDiagnostics.normalizedQuality.score)}`
                        : ''}
                    </div>
                    {ocrDiagnostics.fieldReasons && ocrDiagnostics.fieldReasons.length > 0 ? (
                      <div className="muted">
                        採用フィールド:
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                          {ocrDiagnostics.fieldReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {ocrDiagnostics.structureSummary && ocrDiagnostics.structureSummary.length > 0 ? (
                      <div className="muted">
                        構造解析:
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                          {ocrDiagnostics.structureSummary.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {ocrDiagnostics.normalizationSummary && ocrDiagnostics.normalizationSummary.length > 0 ? (
                      <div className="muted">
                        正規化サマリ:
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                          {ocrDiagnostics.normalizationSummary.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {ocrDiagnostics.correctionExamples && ocrDiagnostics.correctionExamples.length > 0 ? (
                      <div className="muted">
                        OCR補正例:
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                          {ocrDiagnostics.correctionExamples.map((item) => (
                            <li key={item.label}>
                              {item.label}: {item.count}件
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {ocrDiagnostics.variants.map((variant) => (
                      <section key={variant.source} style={{ display: 'grid', gap: 8 }}>
                        <div className="muted">
                          {variant.label}: score {formatScore(variant.quality.score)} / 日本語率{' '}
                          {formatPercent(variant.quality.japaneseRatio)} / ラベル {variant.quality.labelCount} / ノイズ率{' '}
                          {formatPercent(variant.quality.noiseRatio)}
                        </div>
                        <div className="muted">{formatExtractedSummary(variant.extracted)}</div>
                        <textarea
                          readOnly
                          value={clipDiagnosticText(variant.text)}
                          className="preview-textarea"
                          style={{ minHeight: 160 }}
                        />
                      </section>
                    ))}

                    <section style={{ display: 'grid', gap: 8 }}>
                      <div className="muted">normalizedExtractionText</div>
                      <div className="muted">{formatExtractedSummary(ocrDiagnostics.normalizedExtracted)}</div>
                      <textarea
                        readOnly
                        value={clipDiagnosticText(ocrDiagnostics.normalizedText || '')}
                        className="preview-textarea"
                        style={{ minHeight: 180 }}
                      />
                    </section>
                  </div>
                </details>
              ) : null}
            </article>
          </div>

          <div className="result-actions">
            <button className="button button-secondary" onClick={resetAll}>
              別のPDFで試す
            </button>
            <button className="button button-secondary" onClick={() => downloadFile('csv')}>
              CSVをダウンロード
            </button>
            <button className="button button-primary" onClick={() => downloadFile('xlsx')}>
              Excelをダウンロード
            </button>
          </div>
        </section>
      ) : (
        <section className="result-card info-card">
          <h3>このツールでできること</h3>
          <ul className="bullet-list">
            <li>PDFの中の必要な情報を自動で読み取る</li>
            <li>持ち主や面積を見やすく整理する</li>
            <li>読み取った内容を画面ですぐ確認できる</li>
            <li>CSVやExcelにまとめられる</li>
          </ul>
        </section>
      )}
    </div>
  );
}
