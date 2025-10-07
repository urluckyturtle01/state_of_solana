"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PrettyLoader from "@/app/components/shared/PrettyLoader";
import VoteAccountFilter from "../components/VoteAccountFilter";
import MultiSeriesLineBarChart from "@/app/admin/components/charts/MultiSeriesLineBarChart";
import SimpleBarChart from "@/app/admin/components/charts/SimpleBarChart";
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

export default function ValidatorsOverviewPage() {
  const [voteAccount, setVoteAccount] = useState('');
  const [validatorData, setValidatorData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

  // Chart configurations
  const chartConfigs = useMemo(() => [
    // Line chart for inflation commission percentage
    {
      id: "inflation-commission-pct-chart",
      title: "Inflation Commission Percentage",
      subtitle: "Commission percentage over epochs",
      chartType: "line" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: {
          field: "inflation_commission_pct",
          type: "line" as const,
          unit: "%"
        },
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: MultiSeriesLineBarChart
    },
    // Bar chart for validator commission
    {
      id: "validator-commission-chart",
      title: "Validator Commission",
      subtitle: "Commission rewards over epochs",
      chartType: "bar" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: "validator_commission",
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: SimpleBarChart
    },
    // Bar chart for delegator staking reward
    {
      id: "delegator-staking-reward-chart",
      title: "Delegator Staking Rewards",
      subtitle: "Staking rewards over epochs",
      chartType: "bar" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: "delegator_staking_reward",
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: SimpleBarChart
    },
    // Bar chart for total inflation rewards
    {
      id: "total-inflation-rewards-chart",
      title: "Total Inflation Rewards",
      subtitle: "Total rewards over epochs",
      chartType: "bar" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: "total_inflation_rewards",
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: SimpleBarChart
    },
    // Line chart for active stake
    {
      id: "active-stake-chart",
      title: "Active Stake for Epoch",
      subtitle: "Active stake amount over epochs",
      chartType: "line" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: {
          field: "active_stake_for_epoch",
          type: "line" as const,
          unit: "SOL"
        },
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: MultiSeriesLineBarChart
    },
    // Line chart for block rewards
    {
      id: "block-rewards-chart",
      title: "Block Rewards",
      subtitle: "Block rewards over epochs",
      chartType: "line" as const,
      page: "validators-overview" as const,
      apiEndpoint: "/api/validators",
      dataMapping: {
        xAxis: "epoch",
        yAxis: {
          field: "block_rewards",
          type: "line" as const,
          unit: "SOL"
        },
        groupBy: ""
      },
      colorScheme: "default",
      isStacked: false,
      width: 1,
      additionalOptions: {
        showTooltipTotal: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      component: MultiSeriesLineBarChart
    }
  ], []);

  // Generate legends for each chart
  const generateLegends = useCallback((chartId: string, fieldName: string) => {
    if (!validatorData || validatorData.length === 0) return [];

    // Calculate total value for this field across all data points
    const total = validatorData.reduce((sum, item) => sum + (Number(item[fieldName]) || 0), 0);
    
    // Only show legend if there's data
    if (Math.abs(total) <= 0.001) return [];

    return [{
      id: fieldName,
      label: formatFieldName(fieldName),
      color: getColorByIndex(0),
      value: total,
      shape: chartId.includes('line') ? 'circle' as const : 'square' as const
    }];
  }, [validatorData]);

  const fetchValidatorData = useCallback(async () => {
    if (!voteAccount.trim()) {
      setError('Please enter a vote account address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/validators?vote_account=${encodeURIComponent(voteAccount.trim())}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch validator data');
      }

      if (result.success) {
        setValidatorData(result.data);
        if (result.data.length === 0) {
          setError('No data found for this vote account');
        }
      } else {
        throw new Error(result.error || 'Failed to fetch validator data');
      }
    } catch (err) {
      console.error('Error fetching validator data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setValidatorData([]);
    } finally {
      setIsLoading(false);
    }
  }, [voteAccount]);

  // Handle vote account change
  const handleVoteAccountChange = (value: string) => {
    setVoteAccount(value);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = () => {
    fetchValidatorData();
  };

  // Handle chart expansion
  const toggleChartExpanded = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Handle legend clicks for series visibility
  const handleLegendClick = useCallback((chartId: string, fieldId: string) => {
    setHiddenSeries(prev => {
      const chartHidden = prev[chartId] || [];
      const newHidden = chartHidden.includes(fieldId)
        ? chartHidden.filter(id => id !== fieldId)
        : [...chartHidden, fieldId];
      
      return {
        ...prev,
        [chartId]: newHidden
      };
    });
  }, []);

  // Handle legend double-click for isolation
  const handleLegendDoubleClick = useCallback((chartId: string, fieldId: string) => {
    const legends = generateLegends(chartId, fieldId);
    const allFields = legends.map(l => l.id);
    const currentHidden = hiddenSeries[chartId] || [];
    
    if (currentHidden.length === allFields.length - 1 && !currentHidden.includes(fieldId)) {
      // Restore all
      setHiddenSeries(prev => ({
        ...prev,
        [chartId]: []
      }));
    } else {
      // Isolate this series
      setHiddenSeries(prev => ({
        ...prev,
        [chartId]: allFields.filter(f => f !== fieldId)
      }));
    }
  }, [generateLegends, hiddenSeries]);

  // Render individual chart
  const renderChart = (config: ChartConfig & { component: any }) => {
    const ChartComponent = config.component;
    
    // Helper function to get field name and unit from yAxis config
    const getFieldInfo = (yAxis: any) => {
      if (typeof yAxis === 'string') {
        return { fieldName: yAxis, unit: undefined };
      } else if (yAxis && typeof yAxis === 'object' && yAxis.field) {
        return { fieldName: yAxis.field, unit: yAxis.unit };
      } else if (Array.isArray(yAxis) && yAxis.length > 0) {
        const firstAxis = yAxis[0];
        if (typeof firstAxis === 'string') {
          return { fieldName: firstAxis, unit: undefined };
        } else if (firstAxis && typeof firstAxis === 'object' && firstAxis.field) {
          return { fieldName: firstAxis.field, unit: firstAxis.unit };
        }
      }
      return { fieldName: '', unit: undefined };
    };

    const { fieldName, unit } = getFieldInfo(config.dataMapping.yAxis);
    const legends = generateLegends(config.id, fieldName);
    const colorMap = { [fieldName]: getColorByIndex(0) };

    return (
      <div key={config.id} className="md:col-span-1">
        <ChartCard
          title={config.title}
          description={config.subtitle}
          accentColor="blue"
          onExpandClick={() => toggleChartExpanded(config.id)}
          isLoading={isLoading}
          legendWidth="1/5"
          className="md:h-[400px] h-auto"
          id={`chart-card-${config.id}`}
          chart={config}
          chartData={validatorData}
          
          legend={
            <>
              {legends.length > 0 ? (
                legends.map(legend => (
                  <LegendItem 
                    key={legend.id}
                    label={truncateLabel(legend.label)} 
                    color={legend.color} 
                    shape={legend.shape}
                    tooltipText={legend.value ? formatNumber(legend.value) + (unit || '') : undefined}
                    onClick={() => handleLegendClick(config.id, legend.id)}
                    onDoubleClick={() => handleLegendDoubleClick(config.id, legend.id)}
                    inactive={(hiddenSeries[config.id] || []).includes(legend.id)}
                  />
                ))
              ) : null}
            </>
          }
        >
          <div className="h-[250px] md:h-[300px] relative">
            <ChartComponent
              chartConfig={config}
              data={validatorData}
              height={300}
              isExpanded={expandedCharts[config.id] || false}
              onCloseExpanded={() => toggleChartExpanded(config.id)}
              colorMap={colorMap}
              hiddenSeries={hiddenSeries[config.id] || []}
              yAxisUnit={unit}
              filterValues={{}}
              onFilterChange={() => {}}
              maxXAxisTicks={6}
            />
          </div>
        </ChartCard>
      </div>
    );
  };

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

      {/* Charts Grid */}
      {validatorData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chartConfigs.map(config => renderChart(config))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && <ChartLoading />}

      {/* Empty State */}
      {!isLoading && !error && validatorData.length === 0 && voteAccount && (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
          <div className="text-lg mb-2">No Data Available</div>
          <div className="text-sm">Enter a vote account address and click "Load Data" to view validator metrics</div>
        </div>
      )}

      {/* Initial State */}
      {!voteAccount && !isLoading && (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
          <div className="text-lg mb-2">Validator Overview</div>
          <div className="text-sm">Enter a vote account address above to view validator metrics across multiple charts</div>
        </div>
      )}
    </div>
  );
}
