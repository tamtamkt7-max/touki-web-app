'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
};

export default function AdSlot({
  slot,
  format = 'auto',
  className = ''
}: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense未読込や再描画時の失敗は無視
    }
  }, [client]);

  if (!client) {
    return (
      <div className={`ad-box ${className}`}>
        AdSense をここに設置
      </div>
    );
  }

  return (
    <>
      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
      />
      <ins
        className={`adsbygoogle ${className}`}
        style={{
          display: 'block',
          minHeight: format === 'horizontal' ? '120px' : '180px'
        }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </>
  );
}
