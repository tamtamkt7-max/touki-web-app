import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="doc-page">
      <div className="doc-inner">
        <header className="doc-header">
          <p className="doc-eyebrow">404</p>
          <h1 className="doc-title">ページが見つかりませんでした</h1>
          <p className="doc-lead">
            URLが変更されたか、入力に誤りがある可能性があります。トップページまたはツールページからご利用ください。
          </p>
        </header>

        <div className="doc-actions">
          <Link href="/" className="button button-primary">
            トップへ戻る
          </Link>
          <Link href="/tool" className="button button-secondary">
            ツールを開く
          </Link>
        </div>
      </div>
    </main>
  );
}
