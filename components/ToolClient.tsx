'use client';

import { useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type ExtractedFields = {
  location?: string;
  number?: string;
  area?: string;
  buildingArea?: string;
  owner?: string;
  ownersHistory?: string[];
  raw?: string;
};

type ParseResponse = {
  fields: ExtractedFields;
};

function hasEnoughText(text: string) {
  return text.replace(/\s/g, '').length >= 20;
}

function preprocessCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const boosted = avg > 180 ? 255 : avg < 120 ? 0 : avg;
    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function extractTextLayerFromPdf(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

async function renderPdfPagesToImages(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const processed = preprocessCanvas(canvas);
    images.push(processed.toDataURL('image/png'));
  }

  return images;
}

async function extractTextWithOcr(file: File, onStatus?: (v: string) => void) {
  const images = await renderPdfPagesToImages(file);
  let fullText = '';

  for (let i = 0; i < images.length; i++) {
    onStatus?.(`画像として読み取っています… ${i + 1}/${images.length}ページ`);
    const result = await Tesseract.recognize(images[i], 'jpn+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onStatus?.(`画像として読み取っています… ${i + 1}/${images.length}ページ`);
        }
      }
    });
    fullText += result.data.text + '\n';
  }

  return fullText.trim();
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

  if (!res.ok) throw new Error(data?.error || '解析に失敗しました。');
  return data as ParseResponse;
}

async function parseWithServerPdf(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/parse', { method: 'POST', body: formData });
  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || '解析に失敗しました。');
  }

  if (!res.ok) throw new Error(data?.error || '解析に失敗しました。');
  return data as ParseResponse;
}

export function ToolClient() {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const summaryCards = useMemo(() => {
    if (!result?.fields) return [];
    return [
      { label: '最新の持ち主', value: result.fields.owner || '不明' },
      { label: '所在地', value: result.fields.location || '未抽出' },
      { label: '地番', value: result.fields.number || '未抽出' },
      { label: '土地の面積', value: result.fields.area || '未抽出' },
      { label: '建物の面積', value: result.fields.buildingArea || '未抽出' }
    ];
  }, [result]);

  const detailRows = useMemo(() => {
    if (!result?.fields) return [];
    return [
      ['最新の持ち主', result.fields.owner || '不明'],
      ['所在地', result.fields.location || '未抽出'],
      ['地番', result.fields.number || '未抽出'],
      ['土地の面積', result.fields.area || '未抽出'],
      ['建物の面積', result.fields.buildingArea || '未抽出']
    ];
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
    setStatusText('PDFの文字を確認しています…');

    try {
      const textLayer = await extractTextLayerFromPdf(file);

      if (hasEnoughText(textLayer)) {
        setStatusText('文字を整理しています…');
        const parsed = await parseWithRawText(textLayer);
        setResult(parsed);
        setStatusText('');
        return;
      }

      setStatusText('別の方法でPDFを確認しています…');
      try {
        const serverParsed = await parseWithServerPdf(file);
        setResult(serverParsed);
        setStatusText('');
        return;
      } catch {
      }

      const ocrText = await extractTextWithOcr(file, setStatusText);

      if (!hasEnoughText(ocrText)) {
        throw new Error('このPDFは文字をうまく読み取れませんでした。より鮮明なPDFか、文字がはっきり写ったPDFでお試しください。');
      }

      setStatusText('読み取った内容を整理しています…');
      const parsed = await parseWithRawText(ocrText);
      setResult(parsed);
      setStatusText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDFの読み取りに失敗しました。');
      setStatusText('');
    } finally {
      setLoading(false);
    }
  }

  async function downloadFile(format: 'xlsx' | 'csv') {
    if (!result) return;

    const res = await fetch('/api/parse', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, fields: result.fields })
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
            {loading ? statusText || '内容を整理しています。少しだけお待ちください。' : 'またはクリックしてPDFを選択'}
          </p>
        </div>
      </section>

      <div className="tool-pills">
        <span>PDFを入れるだけ</span>
        <span>画面ですぐ確認</span>
        <span>必要ならCSV / Excel保存</span>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {result ? (
        <section className="result-section">
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

              <textarea
                readOnly
                value={result.fields.raw || ''}
                className="preview-textarea"
              />
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
