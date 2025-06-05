import React from 'react';
import ButtonSecondary from '@/app/components/shared/buttons/ButtonSecondary';
import PrettyLoader from '@/app/components/shared/PrettyLoader';

// Define RefreshIcon component
export const RefreshIcon = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  );
};

// Error state component
export const ChartError = ({ error, onRefresh }) => (
  <div className="flex flex-col justify-center items-center h-full">
    <div className="text-gray-400/80 text-xs mb-2">{error}</div>
    <ButtonSecondary onClick={onRefresh}>
      <div className="flex items-center gap-1.5">
        <RefreshIcon className="w-3.5 h-3.5" />
        <span>Refresh</span>
      </div>
    </ButtonSecondary>
  </div>
);

// Loading state component
export const ChartLoading = ({ message = "Loading..." }) => (
  <div className="flex flex-col justify-center items-center h-full">
    <PrettyLoader size="sm" />
    {message && (
      <div className="text-gray-400/80 text-xs mt-2">{message}</div>
    )}
  </div>
);

// Empty state component
export const ChartEmpty = ({ message = "No data available" }) => (
  <div className="flex justify-center items-center h-full">
    <div className="text-gray-400/80 text-xs">{message}</div>
  </div>
); 