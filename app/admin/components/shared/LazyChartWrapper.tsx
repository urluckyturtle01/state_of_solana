import React, { lazy, Suspense, ComponentType } from 'react';

// Simple loading fallback
const ChartLoading = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
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