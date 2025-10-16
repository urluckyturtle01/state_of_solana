'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import BoxChart, { BoxPlotData, BoxChartLegend } from '@/app/admin/components/charts/BoxChart';
import LadderChart, { LadderChartData } from '@/app/admin/components/charts/LadderChart';
import VoteAccountFilter from '@/app/components/shared/filters/VoteAccountFilter';
import StakeTypeFilter, { StakeType, GenericFilter, MetricType, METRIC_TYPE_OPTIONS } from '@/app/components/shared/filters/StakeTypeFilter';

// Concentration type definition (internal to component)
type ConcentrationType = 'top_01pct_concentration' | 'top_1pct_concentration' | 'top_5pct_concentration' | 'top_10pct_concentration';

const CONCENTRATION_TYPE_OPTIONS = [
  { value: 'top_01pct_concentration' as ConcentrationType, label: 'Top 0.1% Concentration', description: 'Concentration among top 0.1% of stakers' },
  { value: 'top_1pct_concentration' as ConcentrationType, label: 'Top 1% Concentration', description: 'Concentration among top 1% of stakers' },
  { value: 'top_5pct_concentration' as ConcentrationType, label: 'Top 5% Concentration', description: 'Concentration among top 5% of stakers' },
  { value: 'top_10pct_concentration' as ConcentrationType, label: 'Top 10% Concentration', description: 'Concentration among top 10% of stakers' },
];
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
  // Distribution metrics
  gini_coefficient: number;
  hhi_index: number;
  nakamoto_coeff_33: number;
  skewness: number;
  kurtosis: number;
  // Network median values
  network_median_gini: number;
  network_median_nakamoto: number;
  // Percentile data for box plots
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  // Concentration metrics
  top_01pct_concentration: number;
  top_1pct_concentration: number;
  top_5pct_concentration: number;
  top_10pct_concentration: number;
}

export default function ValidatorsPerformancePage() {
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v'
  );
  const [selectedStakeType, setSelectedStakeType] = useState<StakeType>('total_stake');
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType>('gini_coefficient');
  const [selectedConcentrationType, setSelectedConcentrationType] = useState<ConcentrationType>('top_1pct_concentration');
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
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

  // Get metric type display info
  const getMetricTypeInfo = (metricType: MetricType) => {
    switch (metricType) {
      case 'gini_coefficient':
        return { 
          title: 'Gini Index by Epoch', 
          unit: '',
          hasNetworkMedian: true,
          networkMedianField: 'network_median_gini'
        };
      case 'hhi_index':
        return { title: 'HHI Index by Epoch', unit: '' };
      case 'nakamoto_coeff_33':
        return { 
          title: 'Nakamoto Coefficient by Epoch', 
          unit: 'validators',
          hasNetworkMedian: true,
          networkMedianField: 'network_median_nakamoto'
        };
      case 'skewness':
        return { title: 'Skewness by Epoch', unit: '' };
      case 'kurtosis':
        return { title: 'Kurtosis by Epoch', unit: '' };
      default:
        return { title: 'Distribution Metric by Epoch', unit: '' };
    }
  };

  // Get concentration type display info
  const getConcentrationTypeInfo = (concentrationType: ConcentrationType) => {
    switch (concentrationType) {
      case 'top_01pct_concentration':
        return { title: 'Top 0.1% Concentration by Epoch', unit: '%' };
      case 'top_1pct_concentration':
        return { title: 'Top 1% Concentration by Epoch', unit: '%' };
      case 'top_5pct_concentration':
        return { title: 'Top 5% Concentration by Epoch', unit: '%' };
      case 'top_10pct_concentration':
        return { title: 'Top 10% Concentration by Epoch', unit: '%' };
      default:
        return { title: 'Concentration by Epoch', unit: '%' };
    }
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

  // Chart configuration for distribution metrics vs epoch  
  const distributionChartConfig: ChartConfig = {
    id: 'validator-distribution-chart',
    title: getMetricTypeInfo(selectedMetricType).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'line',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: getMetricTypeInfo(selectedMetricType).hasNetworkMedian ? [
        { field: selectedMetricType, type: 'line', unit: getMetricTypeInfo(selectedMetricType).unit, label: 'Validator' } as YAxisConfig,
        { field: getMetricTypeInfo(selectedMetricType).networkMedianField!, type: 'line', unit: getMetricTypeInfo(selectedMetricType).unit, label: 'Network Median' } as YAxisConfig
      ] : { field: selectedMetricType, type: 'line', unit: getMetricTypeInfo(selectedMetricType).unit } as YAxisConfig,
      yAxisUnit: getMetricTypeInfo(selectedMetricType).unit
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for concentration metrics vs epoch  
  const concentrationChartConfig: ChartConfig = {
    id: 'validator-concentration-chart',
    title: getConcentrationTypeInfo(selectedConcentrationType).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: selectedConcentrationType,
      yAxisUnit: getConcentrationTypeInfo(selectedConcentrationType).unit
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for ladder chart (concentration by type for selected epoch)
  const ladderChartConfig: ChartConfig = {
    id: 'validator-ladder-chart',
    title: 'Concentration Ladder Chart',
    subtitle: `Epoch ${selectedEpoch || 'N/A'} - Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'value',
      yAxis: 'category',
      yAxisUnit: '%'
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for box plot (percentile distribution)
  const boxPlotChartConfig: ChartConfig = {
    id: 'validator-boxplot-chart',
    title: 'Stake Distribution (Box Plot - Log Scale)',
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'box',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: 'stake_percentiles',
      yAxisUnit: 'SOL'
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Get available epochs for filter
  const availableEpochs = useMemo(() => {
    return [...chartData].sort((a, b) => b.epoch - a.epoch).map(d => d.epoch);
  }, [chartData]);

  // Set default epoch to latest when data loads
  useEffect(() => {
    if (availableEpochs.length > 0 && selectedEpoch === null) {
      setSelectedEpoch(availableEpochs[0]);
    }
  }, [availableEpochs, selectedEpoch]);

  // Convert data to box plot format - only last 10 entries
  const boxPlotData: BoxPlotData[] = useMemo(() => {
    // Sort by epoch and take only the last 10 entries
    const sortedData = [...chartData].sort((a, b) => a.epoch - b.epoch);
    const last10Data = sortedData.slice(-10);
    
    return last10Data.map(datum => ({
      ...datum,
      category: datum.epoch.toString(),
      p5: datum.p5,
      p10: datum.p10,
      p25: datum.p25,
      p50: datum.p50,
      p75: datum.p75,
      p90: datum.p90,
      p95: datum.p95,
      p99: datum.p99
    }));
  }, [chartData]);

  // Convert data to ladder chart format for selected epoch
  const ladderChartData: LadderChartData[] = useMemo(() => {
    if (!selectedEpoch || !chartData.length) return [];
    
    const epochData = chartData.find(d => d.epoch === selectedEpoch);
    if (!epochData) return [];

    return [
      {
        category: 'top_01pct_concentration',
        value: epochData.top_01pct_concentration,
        label: 'Top 0.1% Concentration'
      },
      {
        category: 'top_1pct_concentration',
        value: epochData.top_1pct_concentration,
        label: 'Top 1% Concentration'
      },
      {
        category: 'top_5pct_concentration',
        value: epochData.top_5pct_concentration,
        label: 'Top 5% Concentration'
      },
      {
        category: 'top_10pct_concentration',
        value: epochData.top_10pct_concentration,
        label: 'Top 10% Concentration'
      }
    ];
  }, [chartData, selectedEpoch]);

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

  // Handle metric type change
  const handleMetricTypeChange = useCallback((newMetricType: MetricType) => {
    setSelectedMetricType(newMetricType);
  }, []);

  // Handle concentration type change
  const handleConcentrationTypeChange = useCallback((newConcentrationType: ConcentrationType) => {
    setSelectedConcentrationType(newConcentrationType);
  }, []);

  // Handle epoch change
  const handleEpochChange = useCallback((newEpoch: number) => {
    setSelectedEpoch(newEpoch);
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

      {/* Distribution Charts - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Distribution Metrics Chart */}
        <ChartCard
          title={getMetricTypeInfo(selectedMetricType).title}
          description={`Distribution metrics for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={distributionChartConfig}
          chartData={chartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={selectedMetricType}
                  onChange={handleMetricTypeChange}
                  options={METRIC_TYPE_OPTIONS}
                />
              </div>
            </div>
          }
        >
          <MultiSeriesLineBarChart
            chartConfig={distributionChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit={getMetricTypeInfo(selectedMetricType).unit}
          />
        </ChartCard>

        {/* Concentration Chart */}
        <ChartCard
          title={getConcentrationTypeInfo(selectedConcentrationType).title}
          description={`Concentration metrics for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={concentrationChartConfig}
          chartData={chartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={selectedConcentrationType}
                  onChange={handleConcentrationTypeChange}
                  options={CONCENTRATION_TYPE_OPTIONS}
                />
              </div>
            </div>
          }
        >
          <SimpleBarChart
            chartConfig={concentrationChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit={getConcentrationTypeInfo(selectedConcentrationType).unit}
          />
        </ChartCard>
      </div>

      {/* Ladder Chart and Box Plot Chart - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Ladder Chart */}
        <ChartCard
          title="Concentration Ladder Chart"
          description={`Horizontal bar chart showing concentration levels for epoch ${selectedEpoch || 'N/A'}. Validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={ladderChartConfig}
          chartData={ladderChartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-300">Epoch:</label>
                <select
                  value={selectedEpoch || ''}
                  onChange={(e) => handleEpochChange(Number(e.target.value))}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableEpochs.map(epoch => (
                    <option key={epoch} value={epoch}>
                      Epoch {epoch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
        >
          <LadderChart
            chartConfig={ladderChartConfig}
            data={ladderChartData}
            height={300}
            yAxisUnit="%"
            selectedEpoch={selectedEpoch || undefined}
          />
        </ChartCard>

        {/* Box Plot Chart */}
        <ChartCard
          title="Stake Distribution (Box Plot - Log Scale)"
          description={`Box plot showing stake distribution quartiles for the last 10 epochs. Validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={boxPlotChartConfig}
          chartData={boxPlotData}
          legend={<BoxChartLegend />}
          legendWidth="1/6"
        >
          <BoxChart
            chartConfig={boxPlotChartConfig}
            data={boxPlotData}
            height={400}
            maxXAxisTicks={10}
            yAxisUnit="SOL"
          />
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
            <div>
              <span className="text-gray-400">Current {getMetricTypeInfo(selectedMetricType).title.split(' ')[0]}:</span>
              <span className="ml-2 text-gray-200">
                {chartData.length > 0 ? chartData[chartData.length - 1][selectedMetricType].toFixed(4) : '0'} {getMetricTypeInfo(selectedMetricType).unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg {getMetricTypeInfo(selectedMetricType).title.split(' ')[0]}:</span>
              <span className="ml-2 text-gray-200">
                {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d[selectedMetricType], 0) / chartData.length).toFixed(4) : '0'} {getMetricTypeInfo(selectedMetricType).unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Current {getConcentrationTypeInfo(selectedConcentrationType).title.split(' ')[0]} {getConcentrationTypeInfo(selectedConcentrationType).title.split(' ')[1]}:</span>
              <span className="ml-2 text-gray-200">
                {chartData.length > 0 ? chartData[chartData.length - 1][selectedConcentrationType].toFixed(2) : '0'} {getConcentrationTypeInfo(selectedConcentrationType).unit}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Avg {getConcentrationTypeInfo(selectedConcentrationType).title.split(' ')[0]} {getConcentrationTypeInfo(selectedConcentrationType).title.split(' ')[1]}:</span>
              <span className="ml-2 text-gray-200">
                {chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d[selectedConcentrationType], 0) / chartData.length).toFixed(2) : '0'} {getConcentrationTypeInfo(selectedConcentrationType).unit}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
