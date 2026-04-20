export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>登記サクッと変換</div>
        <nav style={styles.nav}>
          <Link href="/tool" style={styles.navLink}>ツール</Link>
          <Link href="/terms" style={styles.navLink}>利用規約</Link>
          <Link href="/privacy" style={styles.navLink}>プライバシー</Link>
        </nav>
      </header>

      <section style={styles.hero}>
        <h1 style={styles.title}>登記簿PDFを、見やすく整理してすぐ使える形へ。</h1>
        <p style={styles.lead}>
          PDFを入れるだけで、持ち主・面積・所在地を整理して確認できます。
          そのままExcelにまとめることもできます。
        </p>

        <div style={styles.buttonRow}>
          <Link href="/tool" style={styles.primaryButton}>
            PDFを入れて変換する
          </Link>
        </div>
      </section>

      <section style={styles.infoGrid}>
        <div style={styles.infoCard}>
          <h2 style={styles.infoTitle}>このツールでできること</h2>
          <ul style={styles.infoList}>
            <li>PDFの中の必要な情報を自動で読み取る</li>
            <li>持ち主や面積を見やすく整理する</li>
            <li>読み取った内容を画面ですぐ確認できる</li>
            <li>そのままExcelにまとめられる</li>
          </ul>
        </div>

        <div style={styles.infoCard}>
          <h2 style={styles.infoTitle}>安心して使えるポイント</h2>
          <ul style={styles.infoList}>
            <li>やることはPDFを入れるだけ</li>
            <li>結果は画面でその場で確認できる</li>
            <li>必要なときだけExcelで保存できる</li>
            <li>難しい専門用語なしで使える</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #08112b 0%, #0b173d 100%)',
    color: '#f8fafc',
    padding: '24px 20px 72px',
  },
  header: {
    maxWidth: 1100,
    margin: '0 auto 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontSize: 24,
    fontWeight: 800,
  },
  nav: {
    display: 'flex',
    gap: 20,
  },
  navLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: 15,
  },
  hero: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '40px 0 20px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(32px, 5vw, 72px)',
    lineHeight: 1.08,
    letterSpacing: '-0.03em',
  },
  lead: {
    marginTop: 18,
    maxWidth: 760,
    color: '#cbd5e1',
    fontSize: 18,
    lineHeight: 1.8,
  },
  buttonRow: {
    marginTop: 28,
    display: 'flex',
    gap: 14,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 22px',
    borderRadius: 999,
    background: '#8b5cf6',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 700,
  },
  infoGrid: {
    maxWidth: 1100,
    margin: '36px auto 0',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  infoCard: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 24,
  },
  infoTitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 24,
  },
  infoList: {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.9,
    color: '#e2e8f0',
  },
};
