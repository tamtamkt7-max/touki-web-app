import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登記サクッと変換',
  description:
    '登記簿PDFを入れるだけで、所在地・地番・面積・持ち主を見やすく整理。画面で確認して、そのままExcelで保存できます。'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
