import React, { lazy, Suspense, ComponentType } from 'react';
import PrettyLoader from '@/app/components/shared/PrettyLoader';

// Simple loading fallback
const ChartLoading = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <PrettyLoader size="sm" />
  </div>
);

// Higher-order component for lazy loading charts
export function withLazyLoading<T extends {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  const LazyComponent = lazy(importFn);
  
  return React.memo((props: T) => (
    <Suspense fallback={<ChartLoading />}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  ));
}

export default ChartLoading; 