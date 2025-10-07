"use client";

import React, { useState, useCallback, useMemo } from 'react';
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import MultiSeriesLineBarChart from "@/app/admin/components/charts/MultiSeriesLineBarChart";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import { ChartConfig } from "@/app/admin/types";
import { getColorByIndex } from '@/app/utils/chartColors';
import { formatNumber } from '@/app/utils/formatters';

// Create a loading component for chart
const ChartLoading = () => (
  <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
);

// Filter components
const VoteAccountFilter = ({ value, onChange, onSubmit, isLoading }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
        Vote Account:
      </label>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="Enter vote account address"
        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isLoading}
      />
      <input
        type="text"
        value="850"
        readOnly
        className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 text-center"
        title="Epoch (fixed at 850)"
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Loading...</span>
          </>
        ) : (
          <span>Load Distribution</span>
        )}
      </button>
    </div>
  );
};

// Helper function to format field names for display
const formatFieldName = (fieldName: string): string => {
  if (!fieldName) return '';
  
  // Convert snake_case or kebab-case to space-separated
  const spaceSeparated = fieldName.replace(/[_-]/g, ' ');
  
  // Always capitalize the first letter of the entire string
  if (spaceSeparated.length === 0) return '';
  
  // Split into words and capitalize each word
  return spaceSeparated
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Function to truncate text with ellipsis
const truncateLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
};

export default function ValidatorsPerformancePage() {
  const [voteAccount, setVoteAccount] = useState('');
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  // Chart configuration for normal distribution
  const chartConfig: ChartConfig = useMemo(() => ({
    id: "token-balance-distribution-chart",
    title: "Token Balance Distribution",
    subtitle: "Normal distribution curve of token balances (Z-score vs Post Balance)",
    chartType: "line" as const,
    page: "validators-performance" as const,
    apiEndpoint: "/api/validators/distribution",
    dataMapping: {
      xAxis: "z_score",
      yAxis: {
        field: "post_balance",
        type: "line" as const,
        unit: "SOL"
      },
      groupBy: ""
    },
    colorScheme: "default",
    isStacked: false,
    width: 2,
    additionalOptions: {
      showTooltipTotal: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), []);

  // Calculate normal distribution data from raw API response
  const processDistributionData = useCallback((rawData: any[]) => {
    if (!rawData || rawData.length === 0) return [];

    // Extract post_balance values and convert from lamports to SOL
    const balances = rawData.map(item => Number(item.post_balance) / 1e9).filter(balance => balance > 0);
    
    if (balances.length === 0) return [];

    // Calculate mean (μ) and standard deviation (σ)
    const mean = balances.reduce((sum, balance) => sum + balance, 0) / balances.length;
    const variance = balances.reduce((sum, balance) => sum + Math.pow(balance - mean, 2), 0) / balances.length;
    const stdDev = Math.sqrt(variance);

    // Generate distribution curve points
    const distributionPoints: any[] = [];
    const numPoints = 100; // Number of points for smooth curve
    const zRange = 4; // Cover -4σ to +4σ

    for (let i = 0; i <= numPoints; i++) {
      const z = (-zRange + (2 * zRange * i) / numPoints); // Z-score from -4 to +4
      const x = mean + z * stdDev; // Convert Z-score back to actual value
      
      // Normal distribution probability density function
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow(z, 2));
      
      // Scale y-value for better visualization (multiply by a factor to make it visible)
      const scaledY = y * balances.length * stdDev * 10;

      distributionPoints.push({
        z_score: z,
        post_balance: scaledY,
        actual_balance: x,
        probability_density: y
      });
    }

    // Add actual data points as scatter overlay
    const actualDataPoints = balances.map(balance => {
      const z = (balance - mean) / stdDev;
      return {
        z_score: z,
        post_balance: 0.1, // Small value to show on x-axis
        actual_balance: balance,
        is_actual: true
      };
    });

    // Sort by z_score to ensure proper ordering (ascending from negative to positive)
    distributionPoints.sort((a, b) => a.z_score - b.z_score);

    console.log('Distribution stats:', {
      mean: mean.toFixed(4),
      stdDev: stdDev.toFixed(4),
      count: balances.length,
      distributionPoints: distributionPoints.length,
      zScoreRange: `${distributionPoints[0]?.z_score.toFixed(2)} to ${distributionPoints[distributionPoints.length - 1]?.z_score.toFixed(2)}`
    });

    return distributionPoints;
  }, []);

  // Generate legends based on chart data
  const legends = useMemo(() => {
    if (!distributionData || distributionData.length === 0) return [];

    return [{
      id: 'post_balance',
      label: 'Distribution Curve',
      color: getColorByIndex(0),
      value: distributionData.length,
      shape: 'circle' as const
    }];
  }, [distributionData]);

  // Create color map for the chart
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    legends.forEach((legend, index) => {
      map[legend.id] = legend.color;
    });
    return map;
  }, [legends]);

  const fetchDistributionData = useCallback(async () => {
    if (!voteAccount.trim()) {
      setError('Please enter a vote account address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://analytics.topledger.xyz/tl-research/api/queries/14257/results?api_key=IP4iCAbCDhh8yZzLdshdo7zCQ6fb3g0qGT0sFJuQ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: {
            epoch: "850",
            vote_account: voteAccount.trim()
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.query_result && result.query_result.data && result.query_result.data.rows) {
        const rawData = result.query_result.data.rows;
        const processedData = processDistributionData(rawData);
        
        setDistributionData(processedData);
        
        if (processedData.length === 0) {
          setError('No valid balance data found for this vote account');
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      console.error('Error fetching distribution data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setDistributionData([]);
    } finally {
      setIsLoading(false);
    }
  }, [voteAccount, processDistributionData]);

  // Handle vote account change
  const handleVoteAccountChange = (value: string) => {
    setVoteAccount(value);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    fetchDistributionData();
  };

  // Handle legend clicks for series visibility
  const handleLegendClick = useCallback((fieldId: string) => {
    setHiddenSeries(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  }, []);

  // Handle legend double-click for isolation
  const handleLegendDoubleClick = useCallback((fieldId: string) => {
    const allFields = legends.map(l => l.id);
    if (hiddenSeries.length === allFields.length - 1 && !hiddenSeries.includes(fieldId)) {
      // Restore all
      setHiddenSeries([]);
    } else {
      // Isolate this series
      setHiddenSeries(allFields.filter(f => f !== fieldId));
    }
  }, [legends, hiddenSeries]);

  return (
    <div className="space-y-6">
      {/* Vote Account Filter */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <VoteAccountFilter
          value={voteAccount}
          onChange={handleVoteAccountChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Distribution Chart */}
      {distributionData.length > 0 && (
        <div className="w-full">
          <ChartCard
            title={chartConfig.title}
            description={chartConfig.subtitle}
            accentColor="blue"
            onExpandClick={() => setIsExpanded(true)}
            isLoading={isLoading}
            legendWidth="1/5"
            className="md:h-[600px] h-auto"
            id={`chart-card-${chartConfig.id}`}
            chart={chartConfig}
            chartData={distributionData}
            
            legend={
              <>
                {legends.length > 0 ? (
                  legends.map(legend => (
                    <LegendItem 
                      key={legend.id}
                      label={truncateLabel(legend.label)} 
                      color={legend.color} 
                      shape={legend.shape}
                      tooltipText={legend.value ? `${formatNumber(legend.value)} points` : undefined}
                      onClick={() => handleLegendClick(legend.id)}
                      onDoubleClick={() => handleLegendDoubleClick(legend.id)}
                      inactive={hiddenSeries.includes(legend.id)}
                    />
                  ))
                ) : null}
              </>
            }
          >
            <div className="h-[400px] md:h-[500px] relative">
              <MultiSeriesLineBarChart
                chartConfig={chartConfig}
                data={distributionData}
                height={500}
                isExpanded={isExpanded}
                onCloseExpanded={() => setIsExpanded(false)}
                colorMap={colorMap}
                hiddenSeries={hiddenSeries}
                yAxisUnit="Density"
                filterValues={{}}
                onFilterChange={() => {}}
                maxXAxisTicks={8}
              />
            </div>
          </ChartCard>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <ChartLoading />}

      {/* Empty State */}
      {!isLoading && !error && distributionData.length === 0 && voteAccount && (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
          <div className="text-lg mb-2">No Distribution Data Available</div>
          <div className="text-sm">Enter a vote account address and click "Load Distribution" to view the token balance distribution</div>
        </div>
      )}

      {/* Initial State */}
      {!voteAccount && !isLoading && (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
          <div className="text-lg mb-2">Token Balance Distribution</div>
          <div className="text-sm">Enter a vote account address above to view the normal distribution curve of token balances</div>
        </div>
      )}
    </div>
  );
}
