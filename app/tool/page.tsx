export const dynamic = 'force-dynamic';

import { ToolClient } from '@/components/ToolClient';

export default function ToolPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08112b 0%, #0b173d 100%)',
      }}
    >
      <ToolClient />
    </main>
  );
}
