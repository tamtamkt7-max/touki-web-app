export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <main className="doc-page">
      <div className="doc-inner">
        <h1 className="doc-title">利用規約</h1>

        <section className="doc-section">
          <p>
            このサービスは、適法に取得した登記関連PDFから必要項目を抽出し、
            CSVおよびExcel出力を補助する目的で提供されます。
          </p>
        </section>

        <section className="doc-section">
          <h2>1. 利用者の責任</h2>
          <p>
            利用者は、アップロードするPDFについて必要な権限を有していることを保証するものとします。
            取得元サービスの規約に反する自動取得・再配布・再販売目的での利用は禁止します。
          </p>
        </section>

        <section className="doc-section">
          <h2>2. 正確性</h2>
          <p>
            本サービスは抽出結果の正確性、完全性、最新性を保証しません。
            最終判断および外部送信前の確認は、必ず原本照合のうえ利用者自身で行ってください。
          </p>
        </section>

        <section className="doc-section">
          <h2>3. アップロードデータ</h2>
          <p>
            本サービスはPDFの恒久保存を前提としません。
            運用上保存が生じる場合には、別途プライバシーポリシーに記載します。
          </p>
        </section>

        <section className="doc-section">
          <h2>4. 免責</h2>
          <p>
            本サービス利用により生じた損害、逸失利益、第三者との紛争について、
            提供者は故意または重過失を除き責任を負いません。
          </p>
        </section>
      </div>
    </main>
  );
}
