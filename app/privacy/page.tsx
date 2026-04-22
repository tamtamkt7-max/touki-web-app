export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <main className="doc-page">
      <div className="doc-inner">
        <h1 className="doc-title">プライバシーポリシー</h1>

        <section className="doc-section">
          <h2>1. 取得する情報</h2>
          <p>
            本サービスは、お問い合わせフォームで入力された情報と、
            障害解析や運用改善のための最小限の匿名イベントのみを扱う場合があります。
          </p>
        </section>

        <section className="doc-section">
          <h2>2. PDFデータの取扱い</h2>
          <p>
            アップロードされたPDFは変換処理のために一時的に扱われます。
            恒久保存は行わない設計を推奨しています。
          </p>
        </section>

        <section className="doc-section">
          <h2>3. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。
          </p>
        </section>

        <section className="doc-section">
          <h2>4. 広告と解析</h2>
          <p>
            本サービスでは広告配信のためにGoogle AdSenseを利用します。
            また、必要に応じて匿名化されたアクセス解析情報を利用することがあります。
            ツール処理画面では広告を表示せず、説明ページ側のみに配置します。
          </p>
        </section>
      </div>
    </main>
  );
}
