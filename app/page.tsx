import Link from 'next/link';
import AdSlot from '@/components/AdSlot';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="site-header shell">
        <div className="brand">登記サクッと変換</div>

        <nav className="site-nav">
          <Link href="/tool">早速使う</Link>
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
            まずはPDFを入れるだけで使えます。
          </p>

          <div className="hero-actions">
            <Link href="/tool" className="button button-primary">
              早速使う
            </Link>
            <Link href="/terms" className="button button-secondary">
              利用前に確認する
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

          <div className="panel panel-card ad-panel">
            <div className="ad-label">広告</div>
            <AdSlot slot="1234567890" />
            <p className="ad-note">
              広告はトップページのみに表示し、ツール処理画面には表示しません。
            </p>
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
            <li>CSVやExcelにまとめられる</li>
          </ul>
        </article>

        <article className="panel panel-card">
          <h2>安心して使えるポイント</h2>
          <ul className="bullet-list">
            <li>やることはPDFを入れるだけ</li>
            <li>結果は画面でその場で確認できる</li>
            <li>必要なときだけ保存できる</li>
            <li>難しい専門用語なしで使える</li>
          </ul>
        </article>
      </section>

      <section className="home-cta shell">
        <article className="panel panel-card home-cta-panel">
          <h2>準備は完了です。まず1件、PDFで試してみましょう。</h2>
          <p>
            画面で結果を確認してから保存できるため、いきなりダウンロードだけで終わることはありません。
            はじめてでも迷わず使える導線にしています。
          </p>
          <div className="home-cta-actions">
            <Link href="/tool" className="button button-primary">
              ツールを開く
            </Link>
          </div>
        </article>
      </section>

      <footer className="site-footer shell">
        <p className="site-footer-copy">© {new Date().getFullYear()} 登記サクッと変換</p>
        <nav className="site-footer-nav">
          <Link href="/tool">ツール</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
        </nav>
      </footer>
    </main>
  );
}
