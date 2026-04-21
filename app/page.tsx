export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="site-header shell">
        <div className="brand">登記サクッと変換</div>

        <nav className="site-nav">
          <Link href="/tool">ツール</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシー</Link>
        </nav>
      </header>

<section className="hero shell">
  <div className="hero-copy">
    <p className="eyebrow">PDFを入れるだけ</p>
    <h1 className="hero-title">
      登記簿PDFを、
      <br />
      見やすく整理して
      <br />
      すぐ使える形へ。
    </h1>

    <p className="hero-lead">
      所在地・地番・面積・最新の持ち主を整理して表示。
      <br />
      まずはPDFを入れるだけで使えます。
    </p>

    <div className="hero-actions">
      <Link href="/tool" className="button button-primary">
        今すぐツールを使う
      </Link>
      <Link href="/tool" className="button button-secondary">
        PDFをアップロードする
      </Link>
    </div>

    <div className="trust-pills">
      <span>迷わず使える</span>
      <span>画面で結果確認</span>
      <span>必要ならCSV / Excel保存</span>
    </div>
  </div>

  <div className="hero-panel">
    <div className="panel panel-dark">
      <div className="panel-badge">かんたん3ステップ</div>
      <ol className="step-list">
        <li>
          <strong>PDFを入れる</strong>
          <span>ドラッグ＆ドロップかクリックで選択</span>
        </li>
        <li>
          <strong>結果を確認する</strong>
          <span>持ち主、所在地、面積を見やすく表示</span>
        </li>
        <li>
          <strong>必要なら保存する</strong>
          <span>CSVやExcelでそのまま保存</span>
        </li>
      </ol>
    </div>
  </div>
</section>

      <section className="feature-grid shell">
        <article className="panel panel-card">
          <h2>このツールでできること</h2>
          <ul className="bullet-list">
            <li>PDFの中の必要な情報を自動で読み取る</li>
            <li>持ち主や面積を見やすく整理する</li>
            <li>読み取った内容を画面ですぐ確認できる</li>
            <li>そのままExcelにまとめられる</li>
          </ul>
        </article>

        <article className="panel panel-card">
          <h2>安心して使えるポイント</h2>
          <ul className="bullet-list">
            <li>やることはPDFを入れるだけ</li>
            <li>結果は画面でその場で確認できる</li>
            <li>必要なときだけExcelで保存できる</li>
            <li>難しい専門用語なしで使える</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
