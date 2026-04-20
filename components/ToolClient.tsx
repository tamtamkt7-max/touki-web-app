'use client';

import { useMemo, useRef, useState } from 'react';

type ParseResponse = {
  fields: {
    location?: string;
    number?: string;
    area?: string;
    buildingArea?: string;
    owner?: string;
    ownersHistory?: string[];
    raw?: string;
  };
  template?: string;
};

export function ToolClient() {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const summaryCards = useMemo(() => {
    if (!result?.fields) return [];
    return [
      { label: '最新所有者', value: result.fields.owner || '不明' },
      { label: '所在地', value: result.fields.location || '未抽出' },
      { label: '地番', value: result.fields.number || '未抽出' },
      { label: '土地面積', value: result.fields.area || '未抽出' },
      { label: '建物面積', value: result.fields.buildingArea || '未抽出' },
    ];
  }, [result]);

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください。');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      });

      let data;
try {
  data = await res.json();
} catch {
  const text = await res.text();
  throw new Error(text);
}

      if (!res.ok) {
        throw new Error(data?.error || '解析に失敗しました。');
      }

      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    if (!result) return;

    const res = await fetch('/api/parse', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: result.fields,
        subject: '登記情報',
        body: result.template || '',
      }),
    });

    if (!res.ok) {
      setError('Excelの作成に失敗しました。');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'touki-output.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.wrapper}>
      <section style={styles.hero}>
        <div>
          <p style={styles.badge}>PDFを入れるだけ</p>
          <h1 style={styles.title}>登記簿PDFを、見やすく整理してすぐ使える形へ。</h1>
          <p style={styles.lead}>
            ドラッグ＆ドロップでアップロードすると、所在地・地番・面積・最新所有者を自動抽出。
            所有者の流れも一覧で確認できます。
          </p>
        </div>
      </section>

      <section
        style={{
          ...styles.dropzone,
          ...(dragging ? styles.dropzoneActive : {}),
          ...(loading ? styles.dropzoneLoading : {}),
        }}
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
        <div style={styles.dropzoneInner}>
          <div style={styles.dropIcon}>📄</div>
          <h2 style={styles.dropTitle}>
            {loading ? '解析中です…' : 'ここに登記簿PDFをドラッグ＆ドロップ'}
          </h2>
          <p style={styles.dropText}>
            {loading
              ? '自動で抽出しています。数秒お待ちください。'
              : 'またはクリックしてPDFを選択'}
          </p>
        </div>
      </section>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      {result ? (
        <section style={styles.resultArea}>
          <div style={styles.grid}>
            {summaryCards.map((card) => (
              <div key={card.label} style={styles.card}>
                <div style={styles.cardLabel}>{card.label}</div>
                <div style={styles.cardValue}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={styles.twoColumn}>
            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>所有者の流れ</h3>
              {result.fields.ownersHistory && result.fields.ownersHistory.length > 0 ? (
                <ol style={styles.historyList}>
                  {result.fields.ownersHistory.map((item, index) => (
                    <li key={`${item}-${index}`} style={styles.historyItem}>
                      <span style={styles.historyIndex}>{index + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={styles.emptyText}>所有者の履歴は抽出できませんでした。</p>
              )}
            </div>

            <div style={styles.panel}>
              <h3 style={styles.panelTitle}>抽出結果プレビュー</h3>
              <textarea
                readOnly
                value={result.fields.raw || ''}
                style={styles.textarea}
              />
            </div>
          </div>

          <div style={styles.downloadRow}>
            <button onClick={downloadExcel} style={styles.downloadButton}>
              Excelをダウンロード
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 80px',
  },
  hero: {
    marginBottom: 24,
  },
  badge: {
    display: 'inline-block',
    margin: 0,
    marginBottom: 12,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: '#e8f0ff',
    color: '#1d4ed8',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(28px, 4vw, 48px)',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  lead: {
    marginTop: 16,
    marginBottom: 0,
    color: '#475569',
    fontSize: 16,
    lineHeight: 1.8,
    maxWidth: 760,
  },
  dropzone: {
    border: '2px dashed #94a3b8',
    borderRadius: 24,
    background: '#f8fafc',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: '0.2s ease',
  },
  dropzoneActive: {
    borderColor: '#2563eb',
    background: '#eff6ff',
  },
  dropzoneLoading: {
    opacity: 0.8,
  },
  dropzoneInner: {
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  dropIcon: {
    fontSize: 40,
  },
  dropTitle: {
    margin: 0,
    fontSize: 24,
  },
  dropText: {
    margin: 0,
    color: '#64748b',
    fontSize: 15,
  },
  errorBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
  },
  resultArea: {
    marginTop: 32,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
  },
  cardLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
    wordBreak: 'break-word',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  panel: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 20,
  },
  historyList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    background: '#f8fafc',
  },
  historyIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: '#dbeafe',
    color: '#1d4ed8',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
  },
  emptyText: {
    color: '#64748b',
  },
  textarea: {
    width: '100%',
    minHeight: 320,
    resize: 'vertical',
    borderRadius: 14,
    border: '1px solid #cbd5e1',
    padding: 14,
    fontSize: 14,
    lineHeight: 1.6,
  },
  downloadRow: {
    marginTop: 24,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  downloadButton: {
    border: 'none',
    borderRadius: 999,
    padding: '14px 22px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    background: '#111827',
    color: '#fff',
  },
};
