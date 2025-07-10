import React, { useState } from 'react';
import Button from './Button';
import { clearAllDashboardCaches } from '@/app/utils/cacheUtils';

interface BatchCleanupButtonProps {
  className?: string;
}

const BatchCleanupButton: React.FC<BatchCleanupButtonProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const handleCleanup = async () => {
    // Confirm before proceeding
    if (!confirm('Are you sure you want to delete all batch files? This will clear cached data but won\'t affect your actual configurations.')) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/delete-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete batch files');
      }

      // Clear localStorage caches using utility function
      const cacheStats = clearAllDashboardCaches();

      setResult({
        success: true,
        message: `${data.message || 'Successfully deleted batch files'}${cacheStats.clearedEntries > 0 ? ` and cleared ${cacheStats.clearedEntries} cache entries` : ''}`,
        details: {
          ...data.details,
          cacheCleared: cacheStats.clearedEntries,
          cachePatterns: cacheStats.cachePatterns
        },
      });
    } catch (error) {
      console.error('Error cleaning up batch files:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant="danger"
        onClick={handleCleanup}
        disabled={isLoading}
        className="flex items-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cleaning...
          </>
        ) : (
          'Clear Cached Data'
        )}
      </Button>

      {result && (
        <div className={`mt-3 p-3 rounded text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-medium">{result.message}</p>
          {result.details && (
            <div className="mt-2 text-xs">
              <p>Found: {result.details.found} batch files</p>
              <p>Deleted: {result.details.deleted} batch files</p>
              {result.details.failed > 0 && (
                <p className="text-red-600">Failed: {result.details.failed} batch files</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchCleanupButton; 