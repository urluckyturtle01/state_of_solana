'use client';

import TabsNavigation from '@/app/components/shared/TabsNavigation';
import { groupLabel } from '@/lib/helium-queries/types';

interface HeliumApisTabsHeaderProps {
  activeGroup: string;
}

export default function HeliumApisTabsHeader({ activeGroup }: HeliumApisTabsHeaderProps) {
  return (
    <TabsNavigation
      title={groupLabel(activeGroup)}
      description="Trino-backed Helium Oracle APIs at /api/helium/{group}/{query}. Parameters, response shape, and request examples below."
      showDivider
    />
  );
}
