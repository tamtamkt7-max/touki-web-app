import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <main className="doc-page">
      <div className="doc-inner">
        <header className="doc-header">
          <p className="doc-eyebrow">Legal</p>
          <h1 className="doc-title">利用規約</h1>
          <p className="doc-meta">最終更新日: 2026年4月23日</p>
          <p className="doc-lead">
            本規約は「登記サクッと変換」（以下「本サービス」）の利用条件を定めるものです。
            利用者は本規約に同意のうえ本サービスを利用するものとします。
          </p>
        </header>

        <nav className="doc-nav" aria-label="利用規約の目次">
          <a href="#purpose">1. サービスの目的</a>
          <a href="#accountability">2. 利用者の責任</a>
          <a href="#accuracy">3. 抽出結果の正確性</a>
          <a href="#data">4. データの取扱い</a>
          <a href="#prohibited">5. 禁止事項</a>
          <a href="#liability">6. 免責・責任制限</a>
          <a href="#changes">7. 規約変更</a>
        </nav>

        <section className="doc-section" id="purpose">
          <h2>1. サービスの目的</h2>
          <p>
            本サービスは、利用者が適法に取得した登記関連PDFの内容を読み取り、
            所在地・地番・面積・所有者情報等を画面上で整理表示し、
            CSVまたはExcel形式で出力できるようにする補助ツールです。
          </p>
        </section>

        <section className="doc-section" id="accountability">
          <h2>2. 利用者の責任</h2>
          <p>
            利用者は、アップロードまたは入力するデータについて必要な権限を有していることを保証するものとします。
            また、抽出結果を実務で利用する場合は、利用者自身の責任で原本照合および最終確認を行うものとします。
          </p>
        </section>

        <section className="doc-section" id="accuracy">
          <h2>3. 抽出結果の正確性</h2>
          <p>
            本サービスはOCRや機械抽出を含むため、抽出結果の完全性・正確性・最新性を保証しません。
            外部提出、契約判断、登記申請等の高い正確性が求められる用途では、必ず原本で確認してください。
          </p>
        </section>

        <section className="doc-section" id="data">
          <h2>4. データの取扱い</h2>
          <p>
            本サービスはPDFデータの恒久保存を前提としません。
            ただし、障害調査・不正利用対策・法令対応のために必要最小限のログを保持する場合があります。
            詳細はプライバシーポリシーに定めます。
          </p>
        </section>

        <section className="doc-section" id="prohibited">
          <h2>5. 禁止事項</h2>
          <ul>
            <li>法令または公序良俗に反する行為</li>
            <li>本サービスまたは第三者に対する妨害・不正アクセス・過負荷行為</li>
            <li>取得元サービスの規約に違反する自動取得・再配布・再販売目的での利用</li>
            <li>第三者の権利を侵害する目的での利用</li>
          </ul>
        </section>

        <section className="doc-section" id="liability">
          <h2>6. 免責・責任制限</h2>
          <p>
            本サービス利用により生じた損害、逸失利益、第三者との紛争について、
            提供者は故意または重過失を除き責任を負いません。
          </p>
        </section>

        <section className="doc-section" id="changes">
          <h2>7. 規約変更</h2>
          <p>
            本規約は、必要に応じて予告なく変更されることがあります。
            変更後の規約は本ページに掲載した時点で効力を生じます。
          </p>
        </section>

        <div className="doc-actions">
          <Link href="/tool" className="button button-primary">
            ツールを使う
          </Link>
          <Link href="/privacy" className="button button-secondary">
            プライバシーポリシーを見る
          </Link>
        </div>
      </div>
    </main>
  );
}
