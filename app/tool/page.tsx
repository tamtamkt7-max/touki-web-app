export const dynamic = 'force-dynamic';

'use client';

import { ToolClient } from '@/components/ToolClient';

export default function ToolPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
      }}
    >
      <ToolClient />
    </main>
  );
}
