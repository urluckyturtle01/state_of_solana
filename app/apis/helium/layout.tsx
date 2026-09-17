'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import HeliumApisTabsHeader from './components/HeliumApisTabsHeader';

export default function HeliumApisLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segments = pathname?.split('/') ?? [];
  const activeTab = segments[3] || 'delegation';

  return (
    <div className="space-y-0">
      <HeliumApisTabsHeader activeGroup={activeTab} />
      {children}
    </div>
  );
}
