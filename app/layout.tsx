import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: '登記サクッと変換',
  description:
    '登記簿PDFを入れるだけで、所在地・地番・面積・最新の持ち主を見やすく整理。画面で確認して、そのままCSVやExcelで保存できます。'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Script
          id="adsense-script"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5461809032953003"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}
