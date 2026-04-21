export const dynamic = 'force-dynamic';

import { ToolClient } from '@/components/ToolClient';

export default function ToolPage() {
  return (
    <main className="tool-page">
      <div className="shell">
        <ToolClient />
      </div>
    </main>
  );
}
