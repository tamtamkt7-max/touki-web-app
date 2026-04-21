import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <header className="header">
        <div className="header-inner">
          <div className="logo">登記サクッと変換</div>
          <nav className="nav">
            <Link href="/tool">ツール</Link>
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシー</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="badge">PDFを入れるだけ</div>

            <h1 className="hero-title">
              登記簿PDFを、
              <br />
              見やすく整理して
              <br />
              すぐ使える形へ。
            </h1>

            <p className="hero-desc">
              PDFを入れるだけで、所在地・地番・面積・最新の持ち主を整理して表示します。
              結果はその場で確認でき、必要ならCSVやExcelで保存できます。
            </p>

            <Link href="/tool" className="cta">
              PDFを入れて変換する
            </Link>

            <div className="feature-tags">
              <span>迷わず使える</span>
              <span>画面で結果確認</span>
              <span>必要なら保存</span>
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

            {/* ★広告枠 */}
            <div className="panel panel-card ad-panel">
              <div className="ad-label">広告</div>
              <div className="ad-box">
                AdSense をここに設置
              </div>
              <p className="ad-note">
                ツール画面には広告を表示しません
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="info">
        <div className="info-grid">
          <div className="info-card">
            <h2>このツールでできること</h2>
            <ul>
              <li>PDFの中の情報を自動で読み取る</li>
              <li>持ち主や面積を見やすく整理</li>
              <li>結果をその場で確認できる</li>
              <li>CSVやExcelで保存できる</li>
            </ul>
          </div>

          <div className="info-card">
            <h2>安心して使えるポイント</h2>
            <ul>
              <li>やることはPDFを入れるだけ</li>
              <li>難しい操作なし</li>
              <li>画面でそのまま確認できる</li>
              <li>必要なときだけ保存</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
