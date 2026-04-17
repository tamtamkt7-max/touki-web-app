import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="header">
      <nav className="nav">
        <Link href="/" style={{ fontWeight: 800 }}>登記ひろい機</Link>
        <div className="navlinks">
          <Link href="/tool">ツール</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシー</Link>
        </div>
      </nav>
    </header>
  );
}
