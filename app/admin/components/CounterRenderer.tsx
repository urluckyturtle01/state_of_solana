"use client";

import React, { useEffect, useState } from 'react';
import { CounterConfig, CounterVariant } from '../types';
import Counter from '../../components/shared/Counter';

// Define SVG icons for different counter types
const ICONS = {
  users: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  revenue: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  chart: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  ),
  percent: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 7h6m0 10H9m3-3H9m1.5-3.5h1a2 2 0 012 2v5.5M9 4.5A2.5 2.5 0 0111.5 2h1A2.5 2.5 0 0115 4.5m-3 0v12m-1.5-2.5H9a2 2 0 01-2-2v-5.5M13.5 19.5h1a2.5 2.5 0 002.5-2.5v-1a2.5 2.5 0 00-2.5-2.5h-1a2.5 2.5 0 00-2.5 2.5v1a2.5 2.5 0 002.5 2.5z"
      />
    </svg>
  ),
  fire: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
      />
    </svg>
  ),
  globe: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

interface CounterRendererProps {
  counterConfig: CounterConfig;
  isLoading?: boolean;
}

const CounterRenderer: React.FC<CounterRendererProps> = ({ 
  counterConfig,
  isLoading = false
}) => {
  const [value, setValue] = useState<string>("Loading...");
  const [trend, setTrend] = useState<{ value: number; label: string } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Get icon based on icon name in config
  const getIcon = () => {
    if (!counterConfig.icon || !ICONS[counterConfig.icon as keyof typeof ICONS]) {
      // Default to revenue icon if not specified or invalid
      return ICONS.chart;
    }
    return ICONS[counterConfig.icon as keyof typeof ICONS];
  };

  // Fetch data from API when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (isLoading) return;

      try {
        // Create URL with API key if provided
        let apiUrl;
        try {
          apiUrl = new URL(counterConfig.apiEndpoint);
          
          if (counterConfig.apiKey) {
            const apiKeyValue = counterConfig.apiKey.trim();
            
            // Check if the apiKey contains max_age parameter
            if (apiKeyValue.includes('&max_age=')) {
              // Split by &max_age= and add each part separately
              const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
              if (baseApiKey) {
                apiUrl.searchParams.append('api_key', baseApiKey.trim());
              }
              if (maxAgePart) {
                apiUrl.searchParams.append('max_age', maxAgePart.trim());
              }
            } else {
              // Just a regular API key
              apiUrl.searchParams.append('api_key', apiKeyValue);
            }
          }
        } catch (error) {
          throw new Error(`Invalid URL: ${counterConfig.apiEndpoint}`);
        }

        // Fetch data
        const response = await fetch(apiUrl.toString());
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Extract data based on API response format
        let data: any[] = [];
        if (result?.query_result?.data?.rows) {
          data = result.query_result.data.rows;
        } else if (Array.isArray(result)) {
          data = result;
        } else if (result?.data && Array.isArray(result.data)) {
          data = result.data;
        } else if (result?.rows && Array.isArray(result.rows)) {
          data = result.rows;
        } else if (result?.results && Array.isArray(result.results)) {
          data = result.results;
        } else {
          throw new Error('API response does not have a recognized structure');
        }

        if (data.length === 0) {
          throw new Error('No data returned from API');
        }

        // Get the row at the specified index (default to first row if out of bounds)
        const rowIndex = Math.min(counterConfig.rowIndex || 0, data.length - 1);
        const row = data[rowIndex];

        if (!row) {
          throw new Error(`No data found at row index ${counterConfig.rowIndex}`);
        }

        // Extract value
        const rawValue = row[counterConfig.valueField];
        if (rawValue === undefined || rawValue === null) {
          throw new Error(`Field "${counterConfig.valueField}" not found in response data`);
        }

        // Format value with prefix and suffix
        let formattedValue = String(rawValue);
        
        // Debug logging
        console.log('Counter data before formatting:', {
          title: counterConfig.title,
          rawValue,
          prefix: counterConfig.prefix,
          suffix: counterConfig.suffix
        });
        
        // Format number if it's a numeric value
        if (!isNaN(Number(rawValue))) {
          const num = Number(rawValue);
          
          // Check if prefix indicates currency
          const isCurrency = counterConfig.prefix === '$' || counterConfig.prefix === '€' || counterConfig.prefix === '£';
          // Check if suffix indicates percentage
          const isPercentage = counterConfig.suffix === '%';
          
          if (isPercentage) {
            // For percentages, show 1 decimal place
            formattedValue = num.toFixed(1);
          } else if (isCurrency || num >= 1000) {
            // For currencies and large numbers, use compact notation
            if (num >= 1000000000) {
              formattedValue = `${(num / 1000000000).toFixed(1)}B`;
            } else if (num >= 1000000) {
              formattedValue = `${(num / 1000000).toFixed(1)}M`;
            } else if (num >= 1000) {
              formattedValue = `${(num / 1000).toFixed(1)}K`;
            } else {
              // For smaller numbers
              formattedValue = isCurrency ? num.toFixed(2) : num.toFixed(1);
            }
          } else {
            // For small numbers that aren't currency or percentage
            formattedValue = num.toLocaleString('en-US', { maximumFractionDigits: 1 });
          }
        }

        // Apply prefix and suffix
        if (typeof counterConfig.prefix === 'string' && counterConfig.prefix !== '') {
          console.log('Adding prefix:', counterConfig.prefix);
          formattedValue = `${counterConfig.prefix}${formattedValue}`;
        }
        if (typeof counterConfig.suffix === 'string' && counterConfig.suffix !== '') {
          console.log('Adding suffix:', counterConfig.suffix);
          formattedValue = `${formattedValue} ${counterConfig.suffix}`;
        }
        
        // Debug logging
        console.log('Counter data after formatting:', {
          title: counterConfig.title,
          formattedValue
        });

        setValue(formattedValue);

        // Extract trend if configured
        if (counterConfig.trendConfig) {
          const trendValue = Number(row[counterConfig.trendConfig.valueField]);
          if (!isNaN(trendValue)) {
            setTrend({
              value: trendValue,
              label: counterConfig.trendConfig.label || 'vs. previous period'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching counter data:', error);
        setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
        setValue("Error");
      }
    };

    fetchData();
  }, [
    counterConfig.apiEndpoint,
    counterConfig.apiKey,
    counterConfig.valueField,
    counterConfig.rowIndex,
    counterConfig.prefix,
    counterConfig.suffix,
    counterConfig.trendConfig,
    isLoading
  ]);

  if (error) {
    return (
      <div className="bg-red-500/10 p-4 rounded-md border border-red-800/20">
        <h3 className="text-sm font-medium text-red-400">Error Loading Counter</h3>
        <p className="mt-1 text-xs text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <Counter
      title={counterConfig.title}
      value={value}
      trend={trend}
      icon={getIcon()}
      variant={counterConfig.variant || "blue"}
      isLoading={isLoading}
      className={counterConfig.width && counterConfig.width > 1 ? "h-full" : ""}
    />
  );
};

export default CounterRenderer; 