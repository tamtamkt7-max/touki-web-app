'use client';

import { useState } from 'react';

export function ToolClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = async (file: File) => {
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto' }}>
      {!result && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed #999',
            padding: 60,
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <p>登記簿PDFをここにドラッグ＆ドロップ</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFile(e.target.files![0])}
          />
        </div>
      )}

      {loading && <p>解析中...</p>}

      {result && (
        <div>
          <h2>最新所有者</h2>
          <p>{result.fields?.owner || '不明'}</p>

          <h2>面積</h2>
          <p>{result.fields?.area || '-'}</p>

          <h2>所在地</h2>
          <p>{result.fields?.location || '-'}</p>

          <h2>所有履歴</h2>
          <ul>
            {(result.fields?.history || []).map((h: any, i: number) => (
              <li key={i}>{h}</li>
            ))}
          </ul>

          <h2>テキスト</h2>
          <textarea
            value={result.fields?.raw || ''}
            style={{ width: '100%', height: 200 }}
            readOnly
          />

          <button
            onClick={async () => {
              const res = await fetch('/api/parse', {
                method: 'PUT',
                body: JSON.stringify({
                  fields: result.fields,
                  subject: '登記情報',
                  body: result.template,
                }),
              });

              const blob = await res.blob();
              const url = URL.createObjectURL(blob);

              const a = document.createElement('a');
              a.href = url;
              a.download = 'touki.xlsx';
              a.click();
            }}
          >
            Excelダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
