'use client';

import { useMemo, useState } from 'react';
import { templateMap } from '@/lib/templates';

type Fields = {
  propertyName: string;
  location: string;
  lotNumber: string;
  landArea: string;
  buildingArea: string;
  usage: string;
  owner: string;
  rawText: string;
};

const emptyFields: Fields = {
  propertyName: '', location: '', lotNumber: '', landArea: '', buildingArea: '', usage: '', owner: '', rawText: ''
};

export function ToolClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [templateKey, setTemplateKey] = useState<keyof typeof templateMap>('standard');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [notice, setNotice] = useState('');

  async function submitPdf() {
    if (!file) return;
    setLoading(true);
    setNotice('');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/parse', { method: 'POST', body: formData });
    const data = await res.json();
    setFields(data.fields ?? emptyFields);
    setCustomSubject(data.template.subject);
    setCustomBody(data.template.body);
    setLoading(false);
  }

  async function rerunWithOcr() {
    setLoading(true);
    setNotice('');
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocrText, templateKey })
    });
    const data = await res.json();
    setFields(data.fields ?? emptyFields);
    setCustomSubject(data.template.subject);
    setCustomBody(data.template.body);
    setLoading(false);
  }

  async function downloadExcel() {
    const res = await fetch('/api/parse', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, subject: customSubject, body: customBody })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'touki-output.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyMail() {
    navigator.clipboard.writeText(`件名: ${customSubject}\n\n${customBody}`);
    setNotice('件名と本文をコピーしました。');
  }

  function saveTxt() {
    const blob = new Blob([`件名: ${customSubject}\n\n${customBody}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mail-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const templateOptions = useMemo(() => Object.entries(templateMap), []);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h1>登記PDF変換ツール</h1>
        <p className="small">この画面には広告を置かない前提です。アップロードされたPDFは保存しない設計を想定しています。</p>
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <div>
            <label className="label">PDFを選択</label>
            <input className="input" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="label">テンプレ</label>
            <select className="select" value={templateKey} onChange={(e) => setTemplateKey(e.target.value as keyof typeof templateMap)}>
              {templateOptions.map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={submitPdf} disabled={!file || loading}>{loading ? '抽出中…' : 'PDFから抽出'}</button>
        </div>
      </div>

      <div className="card">
        <h2>OCR再抽出</h2>
        <p className="small">画像PDFのときは、ブラウザや外部OCRで得たテキストをここに貼り付けて再抽出できます。</p>
        <textarea className="textarea" value={ocrText} onChange={(e) => setOcrText(e.target.value)} placeholder="OCR結果テキストを貼り付け" />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={rerunWithOcr} disabled={!ocrText || loading}>OCRテキストから再抽出</button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>抽出結果</h2>
          {(['propertyName','location','lotNumber','landArea','buildingArea','usage','owner'] as const).map((key) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label className="label">{key}</label>
              <input className="input" value={fields[key]} onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="card">
          <h2>メールテンプレ</h2>
          <div style={{ marginBottom: 12 }}>
            <label className="label">件名</label>
            <input className="input" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">本文</label>
            <textarea className="textarea" value={customBody} onChange={(e) => setCustomBody(e.target.value)} />
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" onClick={downloadExcel}>Excelダウンロード</button>
            <button className="btn secondary" onClick={copyMail}>件名＋本文をコピー</button>
            <button className="btn secondary" onClick={saveTxt}>TXT保存</button>
          </div>
          {notice ? <p className="small" style={{ marginTop: 12 }}>{notice}</p> : null}
        </div>
      </div>

      <div className="card">
        <h2>問い合わせ</h2>
        <p className="small">Resendの環境変数を設定すると、そのまま通知メールを送れる構成です。未設定でもフォーム送信自体は壊れません。</p>
        <ContactForm />
      </div>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  async function submit() {
    setStatus('送信中…');
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    const data = await res.json();
    setStatus(data.message ?? '送信しました。');
  }

  return (
    <div className="grid">
      <input className="input" placeholder="お名前" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea className="textarea" placeholder="お問い合わせ内容" value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="actions">
        <button className="btn" onClick={submit}>送信</button>
      </div>
      <div className="small">{status}</div>
    </div>
  );
}
