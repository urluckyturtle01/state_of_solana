import { useCallback, useState } from 'react';

interface DownloadOptions {
  filename: string;
  data: any[];
  chartTitle?: string;
  columns?: string[]; // Optional: specify which columns to include
}

export function useChartDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCSV = useCallback(({ filename, data, chartTitle, columns }: DownloadOptions) => {
    if (!data || data.length === 0) {
      console.warn('No data available to download');
      return;
    }

    setIsDownloading(true);

    try {
      // Get all unique keys from the data
      const allHeaders = Array.from(
        new Set(
          data.flatMap(item => Object.keys(item))
        )
      );

      // Filter to only requested columns if specified, otherwise use all
      const headers = columns && columns.length > 0 
        ? columns.filter(col => allHeaders.includes(col)) // Only include columns that exist in data
        : allHeaders;

      // Create CSV content
      const csvContent = [
        // Header row
        headers.join(','),
        // Data rows
        ...data.map(item =>
          headers.map(header => {
            const value = item[header];
            // Handle null/undefined
            if (value == null) return '';
            // Handle strings with commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.href = url;
      link.download = `${sanitizedFilename}_${timestamp}.csv`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded: ${link.download}`);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { downloadCSV, isDownloading };
}

