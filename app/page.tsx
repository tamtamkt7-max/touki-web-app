import Link from 'next/link';
import AdSlot from '@/components/AdSlot';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="site-header shell">
        <div className="brand">登記サクッと変換</div>

        <nav className="site-nav">
          <Link href="/tool">変換ツール</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシー</Link>
        </nav>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">登記簿PDFの確認を、短時間で</p>

          <h1 className="hero-title">
            登記簿PDFを読み取り、
            <br />
            確認しやすい一覧へ。
          </h1>

          <p className="hero-lead">
            所在地・地番・面積・所有者の流れを画面で確認し、CSVやExcelに保存できます。
            読み取り結果はその場で見直せるので、実務前の整理に使いやすい形です。
          </p>

          <div className="hero-actions">
            <Link href="/tool" className="button button-primary">
              変換ツールを開く
            </Link>
            <Link href="/terms" className="button button-secondary">
              使う前に確認
            </Link>
          </div>

          <div className="trust-pills">
            <span>画面で確認してから保存</span>
            <span>CSV / Excel対応</span>
            <span>広告はトップページのみ</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="panel panel-card workflow-panel">
            <div className="panel-badge">利用の流れ</div>
            <ol className="step-list">
              <li>
                <strong>PDFを選択</strong>
                <span>登記簿PDFをドラッグ、またはクリックして選びます。</span>
              </li>
              <li>
                <strong>読み取り内容を確認</strong>
                <span>所在地、地番、面積、所有者の流れを画面で確認できます。</span>
              </li>
              <li>
                <strong>必要な形式で保存</strong>
                <span>確認後、CSVまたはExcelとして保存できます。</span>
              </li>
            </ol>
          </div>

          <div className="panel panel-card ad-panel">
            <div className="ad-label">広告</div>
            <AdSlot slot="1234567890" />
            <p className="ad-note">
              広告はトップページのみに表示しています。変換ツール画面には表示しません。
            </p>
          </div>
        </div>
      </section>

      <section className="feature-grid shell">
        <article className="panel panel-card">
          <h2>整理できる項目</h2>
          <ul className="bullet-list">
            <li>表題部から所在地、地番、土地面積、建物面積を整理</li>
            <li>甲区の所有者履歴を登記事件ごとに確認</li>
            <li>共有者候補や持分候補を、確定値と分けて表示</li>
            <li>画面の結果と同じ内容をCSV / Excelに出力</li>
          </ul>
        </article>

        <article className="panel panel-card">
          <h2>確認しやすい設計</h2>
          <ul className="bullet-list">
            <li>処理中の進捗を表示し、読み取り状況が分かります</li>
            <li>不確かな項目は無理に確定せず、確認しやすく表示します</li>
            <li>読み取り方法や採用理由を、必要なときだけ開いて確認できます</li>
            <li>生の読み取りテキストも残し、後から照合できます</li>
          </ul>
        </article>
      </section>

      <section className="home-cta shell">
        <article className="panel panel-card home-cta-panel">
          <div>
            <p className="eyebrow">まずは1件から確認</p>
            <h2>登記簿PDFを入れて、読み取り結果を確認してください。</h2>
            <p>
              正確性が必要な書類のため、出力前に画面上の結果とプレビューを確認する前提のツールです。
              不明な項目は未検出として扱い、誤った値を確定表示しない方針にしています。
            </p>
          </div>
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
          <Link href="/tool">変換ツール</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
        </nav>
      </footer>
    </main>
  );
}
