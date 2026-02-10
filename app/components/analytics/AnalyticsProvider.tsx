"use client";

import { Suspense } from 'react';
import { AnalyticsTracker } from './AnalyticsTracker';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
};

export default AnalyticsProvider; 