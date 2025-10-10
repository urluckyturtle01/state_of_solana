'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import VoteAccountFilter from '@/app/components/shared/filters/VoteAccountFilter';
import StakeTypeFilter, { StakeType } from '@/app/components/shared/filters/StakeTypeFilter';
import { ChartConfig, YAxisConfig } from '@/app/admin/types';

interface ValidatorPerformanceData {
  vote_account: string;
  calculation_timestamp: string;
  total_stakers: number;
  total_stake: number;
  mean_stake: number;
  median_stake: number;
  mean_median_ratio: number;
  std_dev: number;
  coefficient_of_variation: number;
  iqr: number;
  min_reward_rate_pct: number;
  max_reward_rate_pct: number;
  total_commission_collected: number;
  avg_commission_per_staker: number;
  validator_commission_pct: number;
  epoch: number;
}

export default function ValidatorsPerformancePage() {
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v'
  );
  const [selectedStakeType, setSelectedStakeType] = useState<StakeType>('total_stake');
  const [chartData, setChartData] = useState<ValidatorPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chart configuration for total stakers vs epoch
  const stakersChartConfig: ChartConfig = {
    id: 'validator-stakers-chart',
    title: 'Total Stakers by Epoch',
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: 'total_stakers'
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Get stake type display info
  const getStakeTypeInfo = (stakeType: StakeType) => {
    switch (stakeType) {
      case 'total_stake':
        return { title: 'Total Stake by Epoch', unit: 'SOL' };
      case 'mean_stake':
        return { title: 'Mean Stake by Epoch', unit: 'SOL' };
      case 'median_stake':
        return { title: 'Median Stake by Epoch', unit: 'SOL' };
      default:
        return { title: 'Stake by Epoch', unit: 'SOL' };
    }
  };

  // Determine if we should use line chart based on stake type
  const shouldUseLineChart = (stakeType: StakeType) => {
    return stakeType === 'mean_stake' || stakeType === 'median_stake';
  };

  // Chart configuration for stake vs epoch  
  const stakeChartConfig: ChartConfig = {
    id: 'validator-stake-chart',
    title: getStakeTypeInfo(selectedStakeType).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: shouldUseLineChart(selectedStakeType) ? 'line' : 'bar',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: shouldUseLineChart(selectedStakeType) 
        ? { field: selectedStakeType, type: 'line', unit: getStakeTypeInfo(selectedStakeType).unit } as YAxisConfig
        : selectedStakeType,
      yAxisUnit: getStakeTypeInfo(selectedStakeType).unit
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Fetch validator performance data
  const fetchValidatorData = useCallback(async (voteAccount: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/validators/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vote_account: voteAccount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Sort data by epoch for proper visualization
        const sortedData = result.data.sort((a: ValidatorPerformanceData, b: ValidatorPerformanceData) => a.epoch - b.epoch);
        setChartData(sortedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching validator data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle vote account change
  const handleVoteAccountChange = useCallback((newVoteAccount: string) => {
    setSelectedVoteAccount(newVoteAccount);
  }, []);

  // Handle stake type change
  const handleStakeTypeChange = useCallback((newStakeType: StakeType) => {
    setSelectedStakeType(newStakeType);
  }, []);

  // Fetch data when vote account changes
  useEffect(() => {
    if (selectedVoteAccount) {
      fetchValidatorData(selectedVoteAccount);
    }
  }, [selectedVoteAccount, fetchValidatorData]);

  // Load initial data
  useEffect(() => {
    fetchValidatorData(selectedVoteAccount);
  }, []);

  return (
    <div className="space-y-6">
      

      {/* Vote Account Filter */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <VoteAccountFilter
          value={selectedVoteAccount}
          onChange={handleVoteAccountChange}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400">Error: {error}</p>
          <button
            onClick={() => fetchValidatorData(selectedVoteAccount)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Charts Display - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Stakers Chart */}
        <ChartCard
          title="Total Stakers by Epoch"
          description={`Performance metrics for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={stakersChartConfig}
          chartData={chartData}
        >
          <SimpleBarChart
            chartConfig={stakersChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
          />
        </ChartCard>

        {/* Stake Chart with Filter */}
        <ChartCard
          title={getStakeTypeInfo(selectedStakeType).title}
          description={`Stake distribution for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={stakeChartConfig}
          chartData={chartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                
                <StakeTypeFilter 
                  value={selectedStakeType}
                  onChange={handleStakeTypeChange}
                />
              </div>
            </div>
          }
        >
          {shouldUseLineChart(selectedStakeType) ? (
            <MultiSeriesLineBarChart
              chartConfig={stakeChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getStakeTypeInfo(selectedStakeType).unit}
            />
          ) : (
            <SimpleBarChart
              chartConfig={stakeChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getStakeTypeInfo(selectedStakeType).unit}
            />
          )}
        </ChartCard>
      </div>

      {/* Data Summary */}
      {chartData.length > 0 && !isLoading && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Records:</span>
              <span className="ml-2 text-gray-200">{chartData.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Epoch Range:</span>
              <span className="ml-2 text-gray-200">
                {Math.min(...chartData.map(d => d.epoch))} - {Math.max(...chartData.map(d => d.epoch))}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Max Stakers:</span>
              <span className="ml-2 text-gray-200">
                {Math.max(...chartData.map(d => d.total_stakers)).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg Stakers:</span>
              <span className="ml-2 text-gray-200">
                {Math.round(chartData.reduce((sum, d) => sum + d.total_stakers, 0) / chartData.length).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Max Total Stake:</span>
              <span className="ml-2 text-gray-200">
                {Math.max(...chartData.map(d => d.total_stake)).toFixed(2)} SOL
              </span>
            </div>
            <div>
              <span className="text-gray-400">Current {getStakeTypeInfo(selectedStakeType).title.split(' ')[0]}:</span>
              <span className="ml-2 text-gray-200">
                {chartData.length > 0 ? chartData[chartData.length - 1][selectedStakeType].toFixed(2) : '0'} SOL
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
