import React, { Suspense } from 'react';
import ExplorerClient from './ExplorerClient';
import { apiCacheData } from '../data/api-cache';

// Create a loading component for Suspense fallback
const ExplorerLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
  </div>
);

export default function ExplorerPage() {
  // Use the imported data
  const initialApis = Array.isArray(apiCacheData) ? apiCacheData : [];

  return (
    <div className="space-y-4">
      <Suspense fallback={<ExplorerLoading />}>
        <ExplorerClient initialApis={initialApis} />
      </Suspense>
    </div>
  );
} 