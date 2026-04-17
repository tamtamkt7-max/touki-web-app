export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>プライバシーポリシー</h1>
        <div className="warning">登記関連PDFには個人情報が含まれうるため、広告タグや不要な計測コードを処理画面に設置しない運用を推奨します。</div>
        <h2>1. 取得する情報</h2>
        <p className="small">本サービスは、お問い合わせフォームで入力された情報と、障害解析や運用改善のための最小限の匿名イベントのみを扱う場合があります。</p>
        <h2>2. PDFデータの取扱い</h2>
        <p className="small">アップロードされたPDFは変換処理のために一時的に扱われます。恒久保存は行わない設計を推奨しています。</p>
        <h2>3. 第三者提供</h2>
        <p className="small">法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。</p>
        <h2>4. 広告と解析</h2>
        <p className="small">広告は説明ページ側のみに配置し、PDF処理画面には設置しないことを推奨します。解析ツールを使う場合も、個人を特定できる情報を送信しない設定としてください。</p>
      </div>
    </main>
  );
}
