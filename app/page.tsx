'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero grid grid-2" style={{ alignItems: 'center' }}>
        <div>
          <div className="kicker">Touki PDF to Excel</div>
          <h1 className="h1">登記簿PDFを、<br />メール文面まで一気に整える。</h1>
          <p className="lead">
            適法に取得したPDFをアップロードし、所在・地番・面積・所有者などを抽出。
            Excel出力とメール文面作成までまとめて行います。
          </p>
          <div className="actions" style={{ marginTop: 20 }}>
            <Link className="btn" href="/tool">ツールを使う</Link>
            <Link className="btn secondary" href="/terms">公開前の注意点を見る</Link>
          </div>
          <div style={{ marginTop: 18 }} className="small">
            ※ 広告はこの説明ページ側にのみ配置し、処理画面には配置しない運用を推奨。
          </div>
        </div>
        <div className="card">
          <span className="badge">収益導線あり</span>
          <h2>公開しやすい2層構成</h2>
          <ul className="list">
            <li>説明ページでSEOと広告収益</li>
            <li>変換ツール本体は広告なし</li>
            <li>PDF保存なし前提で個人情報リスクを圧縮</li>
            <li>最初はテキストPDF、後からOCRも対応</li>
          </ul>
          <div className="ad-box" style={{ marginTop: 16 }}>AdSenseプレースホルダ</div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h3>このアプリでできること</h3>
          <ul className="list">
            <li>PDFから主要項目を抽出</li>
            <li>複数テンプレでメール文面生成</li>
            <li>Excelを2シートで出力</li>
            <li>OCR再抽出の補助</li>
          </ul>
        </div>
        <div className="card">
          <h3>公開時に必須の注意点</h3>
          <ul className="list">
            <li>取得元サービスへの自動ログイン・スクレイピングは避ける</li>
            <li>アップロードPDFは保存しない</li>
            <li>利用規約とプライバシーポリシーを設置する</li>
            <li>処理結果は原本照合を前提にする</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
