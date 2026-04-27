'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot: string;
  className?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
};

export default function AdSlot({
  slot,
  className = '',
  format = 'auto'
}: AdSlotProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{
        display: 'block',
        minHeight: format === 'horizontal' ? '120px' : '180px'
      }}
      data-ad-client="ca-pub-5461809032953003"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
