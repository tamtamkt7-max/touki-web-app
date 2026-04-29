import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <main className="doc-page">
      <div className="doc-inner">
        <header className="doc-header">
          <p className="doc-eyebrow">Legal</p>
          <h1 className="doc-title">プライバシーポリシー</h1>
          <p className="doc-meta">最終更新日: 2026年4月23日</p>
          <p className="doc-lead">
            本ポリシーは、本サービスにおける個人情報および関連データの取扱い方針を説明するものです。
          </p>
        </header>

        <nav className="doc-nav" aria-label="プライバシーポリシーの目次">
          <a href="#info">1. 取得する情報</a>
          <a href="#purpose">2. 利用目的</a>
          <a href="#pdf">3. PDFデータの取扱い</a>
          <a href="#ads">4. 広告・解析</a>
          <a href="#thirdparty">5. 第三者提供</a>
          <a href="#rights">6. 開示・訂正等</a>
        </nav>

        <section className="doc-section" id="info">
          <h2>1. 取得する情報</h2>
          <ul>
            <li>お問い合わせ時に利用者が入力した情報（氏名・メールアドレス・本文等）</li>
            <li>サービス運用上必要な技術情報（アクセスログ、エラー情報、利用環境情報等）</li>
            <li>広告配信・不正防止のために必要なCookie等の識別情報</li>
          </ul>
        </section>

        <section className="doc-section" id="purpose">
          <h2>2. 利用目的</h2>
          <ul>
            <li>本サービスの提供、保守、品質改善</li>
            <li>問い合わせ対応および不正利用・障害対応</li>
            <li>法令遵守およびセキュリティ確保</li>
          </ul>
        </section>

        <section className="doc-section" id="pdf">
          <h2>3. PDFデータの取扱い</h2>
          <p>
            アップロードされたPDFは変換処理のために一時的に扱われます。
            恒久保存は前提としていませんが、障害調査・再発防止のために必要最小限の範囲で
            一時的なログを保持する場合があります。
          </p>
        </section>

        <section className="doc-section" id="ads">
          <h2>4. 広告・解析</h2>
          <p>
            本サービスでは広告配信のためにGoogle AdSenseを利用しています。
            広告はトップページのみに表示し、ツール処理画面には表示しません。
            また、匿名化された範囲でアクセス解析情報を利用する場合があります。
          </p>
        </section>

        <section className="doc-section" id="thirdparty">
          <h2>5. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。
            ただし、広告配信やインフラ運用に必要な範囲で委託先事業者に情報処理を委託する場合があります。
          </p>
        </section>

        <section className="doc-section" id="rights">
          <h2>6. 開示・訂正等</h2>
          <p>
            保有個人データについて、利用者本人から開示・訂正・利用停止等の請求があった場合、
            法令に従い合理的な範囲で対応します。お問い合わせは本サービスの問い合わせ窓口からご連絡ください。
          </p>
        </section>

        <div className="doc-actions">
          <Link href="/tool" className="button button-primary">
            ツールを使う
          </Link>
          <Link href="/terms" className="button button-secondary">
            利用規約を見る
          </Link>
        </div>
      </div>
    </main>
  );
}
