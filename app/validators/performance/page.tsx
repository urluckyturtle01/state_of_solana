'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import BoxChart, { BoxPlotData, BoxChartLegend } from '@/app/admin/components/charts/BoxChart';
import LadderChart, { LadderChartData } from '@/app/admin/components/charts/LadderChart';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import VoteAccountFilter from '@/app/components/shared/filters/VoteAccountFilter';
import StakeTypeFilter, { StakeType, GenericFilter, MetricType, METRIC_TYPE_OPTIONS, FilterOption } from '@/app/components/shared/filters/StakeTypeFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';

// Concentration type definition (internal to component)
type ConcentrationType = 'top_01pct_concentration' | 'top_1pct_concentration' | 'top_5pct_concentration' | 'top_10pct_concentration';

const CONCENTRATION_TYPE_OPTIONS = [
  { value: 'top_01pct_concentration' as ConcentrationType, label: 'Top 0.1% Concentration', description: 'Concentration among top 0.1% of stakers' },
  { value: 'top_1pct_concentration' as ConcentrationType, label: 'Top 1% Concentration', description: 'Concentration among top 1% of stakers' },
  { value: 'top_5pct_concentration' as ConcentrationType, label: 'Top 5% Concentration', description: 'Concentration among top 5% of stakers' },
  { value: 'top_10pct_concentration' as ConcentrationType, label: 'Top 10% Concentration', description: 'Concentration among top 10% of stakers' },
];

// Reward tab type definition
type RewardTabType = 'total' | 'average' | 'median' | 'gini';

const REWARD_TAB_OPTIONS: FilterOption<RewardTabType>[] = [
  { 
    value: 'total', 
    label: 'Total Rewards', 
    description: 'Total rewards distributed by epoch',
  },
  { 
    value: 'average', 
    label: 'Avg per Staker', 
    description: 'Average reward per staker by epoch',
  },
  { 
    value: 'median', 
    label: 'Median per Staker', 
    description: 'Median reward per staker by epoch',
  },
  { 
    value: 'gini', 
    label: 'Reward Gini', 
    description: 'Reward Gini coefficient by epoch',
  },
];

// Reward rate tab type definition
type RewardRateTabType = 'avg_rate' | 'median_rate' | 'min_rate' | 'max_rate';

const REWARD_RATE_TAB_OPTIONS: FilterOption<RewardRateTabType>[] = [
  { 
    value: 'avg_rate', 
    label: 'Avg Rate', 
    description: 'Average reward rate percentage by epoch',
  },
  { 
    value: 'median_rate', 
    label: 'Median Rate', 
    description: 'Median reward rate percentage by epoch',
  },
  { 
    value: 'min_rate', 
    label: 'Min Rate', 
    description: 'Minimum reward rate percentage by epoch',
  },
  { 
    value: 'max_rate', 
    label: 'Max Rate', 
    description: 'Maximum reward rate percentage by epoch',
  },
];

// Staker tier tab type definition
type StakerTierTabType = 'staker_count' | 'total_stake';

const STAKER_TIER_TAB_OPTIONS: FilterOption<StakerTierTabType>[] = [
  { 
    value: 'staker_count', 
    label: 'Staker Count', 
    description: 'Number of stakers by tier',
  },
  { 
    value: 'total_stake', 
    label: 'Total Stake', 
    description: 'Total stake amount by tier',
  },
];

// Network tier tab type definition (same structure but for network data)  
type NetworkTierTabType = 'staker_count' | 'total_stake';

const NETWORK_TIER_TAB_OPTIONS: FilterOption<NetworkTierTabType>[] = [
  { 
    value: 'staker_count', 
    label: 'Network Staker Count', 
    description: 'Number of stakers by tier across network',
  },
  { 
    value: 'total_stake', 
    label: 'Network Total Stake', 
    description: 'Total stake amount by tier across network',
  },
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
  // Reward metrics
  total_rewards_distributed: number;
  avg_reward_per_staker: number;
  median_reward_per_staker: number;
  reward_gini_coefficient: number;
  // Reward rate metrics (percentages)
  avg_reward_rate_pct: number;
  median_reward_rate_pct: number;
  // Distribution metrics
  gini_coefficient: number;
  hhi_index: number;
  nakamoto_coeff_33: number;
  skewness: number;
  kurtosis: number;
  // Network-level values
  network_gini_coefficient: number;
  network_hhi_index: number;
  network_nakamoto_coeff_33: number;
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

interface ValidatorStakerTierData {
  tier_name: string;
  validator_staker_count: number;
  validator_total_stake_in_tier: number;
  epoch: number;
  vote_account: string;
}

interface NetworkStakerTierData {
  tier_name: string;
  network_staker_count: number;
  network_total_stake_in_tier: number;
  epoch: number;
}

interface CumulativePercentageData {
  cumulative_pct_stakers: number;
  cumulative_pct_stake: number;
  epoch: number;
  vote_account: string;
}

export default function ValidatorsPerformancePage() {
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v'
  );
  const [selectedStakeType, setSelectedStakeType] = useState<StakeType>('total_stake');
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType>('gini_coefficient');
  const [selectedConcentrationType, setSelectedConcentrationType] = useState<ConcentrationType>('top_1pct_concentration');
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [activeRewardTab, setActiveRewardTab] = useState<RewardTabType>('total');
  const [activeRewardRateTab, setActiveRewardRateTab] = useState<RewardRateTabType>('avg_rate');
  const [activeStakerTierTab, setActiveStakerTierTab] = useState<StakerTierTabType>('staker_count');
  const [stakerTierDisplayMode, setStakerTierDisplayMode] = useState<DisplayMode>('absolute');
  const [activeNetworkTierTab, setActiveNetworkTierTab] = useState<NetworkTierTabType>('staker_count');
  const [networkTierDisplayMode, setNetworkTierDisplayMode] = useState<DisplayMode>('absolute');
  const [selectedCumulativeEpoch, setSelectedCumulativeEpoch] = useState<number>(864);
  const [chartData, setChartData] = useState<ValidatorPerformanceData[]>([]);
  const [stakerTierData, setStakerTierData] = useState<ValidatorStakerTierData[]>([]);
  const [networkTierData, setNetworkTierData] = useState<NetworkStakerTierData[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativePercentageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStakerTierLoading, setIsStakerTierLoading] = useState<boolean>(false);
  const [isNetworkTierLoading, setIsNetworkTierLoading] = useState<boolean>(false);
  const [isCumulativeLoading, setIsCumulativeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stakerTierError, setStakerTierError] = useState<string | null>(null);
  const [networkTierError, setNetworkTierError] = useState<string | null>(null);
  const [cumulativeError, setCumulativeError] = useState<string | null>(null);

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
          networkMedianField: 'network_gini_coefficient'
        };
      case 'hhi_index':
        return { 
          title: 'HHI Index by Epoch', 
          unit: '',
          hasNetworkMedian: true,
          networkMedianField: 'network_hhi_index'
        };
      case 'nakamoto_coeff_33':
        return { 
          title: 'Nakamoto Coefficient by Epoch', 
          unit: 'validators',
          hasNetworkMedian: true,
          networkMedianField: 'network_nakamoto_coeff_33'
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

  // Get reward tab display info
  const getRewardTabInfo = (tabType: RewardTabType) => {
    switch (tabType) {
      case 'total':
        return { 
          title: 'Total Rewards Distributed by Epoch', 
          field: 'total_rewards_distributed',
          unit: 'SOL',
          chartType: 'bar' as const
        };
      case 'average':
        return { 
          title: 'Average Reward per Staker by Epoch', 
          field: 'avg_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const
        };
      case 'median':
        return { 
          title: 'Median Reward per Staker by Epoch', 
          field: 'median_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const
        };
      case 'gini':
        return { 
          title: 'Reward Gini Coefficient by Epoch', 
          field: 'reward_gini_coefficient',
          unit: '',
          chartType: 'line' as const
        };
      default:
        return { 
          title: 'Reward Metrics by Epoch', 
          field: 'total_rewards_distributed',
          unit: 'SOL',
          chartType: 'bar' as const
        };
    }
  };

  // Chart configuration for reward tabs
  const rewardChartConfig: ChartConfig = {
    id: 'validator-reward-chart',
    title: getRewardTabInfo(activeRewardTab).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: getRewardTabInfo(activeRewardTab).chartType,
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: getRewardTabInfo(activeRewardTab).chartType === 'line' 
        ? { field: getRewardTabInfo(activeRewardTab).field, type: 'line', unit: getRewardTabInfo(activeRewardTab).unit } as YAxisConfig
        : getRewardTabInfo(activeRewardTab).field,
      yAxisUnit: getRewardTabInfo(activeRewardTab).unit
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Get reward rate tab display info
  const getRewardRateTabInfo = (tabType: RewardRateTabType) => {
    switch (tabType) {
      case 'avg_rate':
        return { 
          title: 'Average Reward Rate by Epoch', 
          field: 'avg_reward_rate_pct',
          unit: '%'
        };
      case 'median_rate':
        return { 
          title: 'Median Reward Rate by Epoch', 
          field: 'median_reward_rate_pct',
          unit: '%'
        };
      case 'min_rate':
        return { 
          title: 'Minimum Reward Rate by Epoch', 
          field: 'min_reward_rate_pct',
          unit: '%'
        };
      case 'max_rate':
        return { 
          title: 'Maximum Reward Rate by Epoch', 
          field: 'max_reward_rate_pct',
          unit: '%'
        };
      default:
        return { 
          title: 'Reward Rate by Epoch', 
          field: 'avg_reward_rate_pct',
          unit: '%'
        };
    }
  };

  // Get staker tier tab display info
  const getStakerTierTabInfo = (tabType: StakerTierTabType) => {
    switch (tabType) {
      case 'staker_count':
        return { 
          title: 'Staker Count by Tier', 
          field: 'validator_staker_count',
          unit: 'stakers'
        };
      case 'total_stake':
        return { 
          title: 'Total Stake by Tier', 
          field: 'validator_total_stake_in_tier',
          unit: 'SOL'
        };
      default:
        return { 
          title: 'Staker Count by Tier', 
          field: 'validator_staker_count',
          unit: 'stakers'
        };
    }
  };

  // Get network tier tab display info
  const getNetworkTierTabInfo = (tabType: NetworkTierTabType) => {
    switch (tabType) {
      case 'staker_count':
        return { 
          title: 'Network Staker Count by Tier', 
          field: 'network_staker_count',
          unit: 'stakers'
        };
      case 'total_stake':
        return { 
          title: 'Network Total Stake by Tier', 
          field: 'network_total_stake_in_tier',
          unit: 'SOL'
        };
      default:
        return { 
          title: 'Network Staker Count by Tier', 
          field: 'network_staker_count',
          unit: 'stakers'
        };
    }
  };

  // Chart configuration for reward rate tabs
  const rewardRateChartConfig: ChartConfig = {
    id: 'validator-reward-rate-chart',
    title: getRewardRateTabInfo(activeRewardRateTab).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'line',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: { field: getRewardRateTabInfo(activeRewardRateTab).field, type: 'line', unit: getRewardRateTabInfo(activeRewardRateTab).unit } as YAxisConfig,
      yAxisUnit: getRewardRateTabInfo(activeRewardRateTab).unit
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for staker tier stacked bar chart
  const stakerTierChartConfig: ChartConfig = {
    id: 'validator-staker-tier-chart',
    title: getStakerTierTabInfo(activeStakerTierTab).title,
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/staker-tiers',
    isStacked: true,
    dataMapping: {
      xAxis: 'epoch',
      yAxis: getStakerTierTabInfo(activeStakerTierTab).field,
      groupBy: 'tier_name',
      yAxisUnit: getStakerTierTabInfo(activeStakerTierTab).unit
    },
    additionalOptions: {
      showTooltipTotal: true,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for network tier stacked bar chart
  const networkTierChartConfig: ChartConfig = {
    id: 'network-staker-tier-chart',
    title: getNetworkTierTabInfo(activeNetworkTierTab).title,
    subtitle: 'Network-wide staker distribution by tier',
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/network/staker-tiers',
    isStacked: true,
    dataMapping: {
      xAxis: 'epoch',
      yAxis: getNetworkTierTabInfo(activeNetworkTierTab).field,
      groupBy: 'tier_name',
      yAxisUnit: getNetworkTierTabInfo(activeNetworkTierTab).unit
    },
    additionalOptions: {
      showTooltipTotal: true,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for cumulative percentage line chart
  const cumulativeChartConfig: ChartConfig = {
    id: 'validator-cumulative-chart',
    title: 'Cumulative Stake Distribution',
    subtitle: `Epoch ${selectedCumulativeEpoch} - Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'line',
    apiEndpoint: '/api/validators/cumulative',
    dataMapping: {
      xAxis: 'cumulative_pct_stakers',
      yAxis: { field: 'cumulative_pct_stake', type: 'line', unit: '%' } as YAxisConfig,
      yAxisUnit: '%'
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  // Chart configuration for rewards and commission stacked bar chart
  const rewardsCommissionChartConfig: ChartConfig = {
    id: 'validator-rewards-commission-chart',
    title: 'Rewards & Commission Distribution by Epoch',
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/performance',
    isStacked: true,
    dataMapping: {
      xAxis: 'epoch',
      yAxis: [
        { field: 'total_rewards_distributed', type: 'bar', unit: 'SOL', label: 'Total Rewards' } as YAxisConfig,
        { field: 'total_commission_collected', type: 'bar', unit: 'SOL', label: 'Total Commission' } as YAxisConfig
      ],
      yAxisUnit: 'SOL'
    },
    additionalOptions: {
      showTooltipTotal: true,
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

  // Check if staker tier data has negative values to determine if percentage mode should be disabled
  const stakerTierHasNegativeValues = useMemo(() => {
    if (!stakerTierData || stakerTierData.length === 0) return false;
    
    const currentField = getStakerTierTabInfo(activeStakerTierTab).field;
    return stakerTierData.some(d => {
      const value = Number(d[currentField as keyof ValidatorStakerTierData]) || 0;
      return value < 0;
    });
  }, [stakerTierData, activeStakerTierTab]);

  // Check if network tier data has negative values to determine if percentage mode should be disabled  
  const networkTierHasNegativeValues = useMemo(() => {
    if (!networkTierData || networkTierData.length === 0) return false;
    
    const currentField = getNetworkTierTabInfo(activeNetworkTierTab).field;
    return networkTierData.some(d => {
      const value = Number(d[currentField as keyof NetworkStakerTierData]) || 0;
      return value < 0;
    });
  }, [networkTierData, activeNetworkTierTab]);

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

  // Fetch validator staker tier data
  const fetchStakerTierData = useCallback(async (voteAccount: string) => {
    setIsStakerTierLoading(true);
    setStakerTierError(null);
    
    try {
      const response = await fetch('/api/validators/staker-tiers', {
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
        const sortedData = result.data.sort((a: ValidatorStakerTierData, b: ValidatorStakerTierData) => a.epoch - b.epoch);
        setStakerTierData(sortedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching staker tier data:', err);
      setStakerTierError(err instanceof Error ? err.message : 'Failed to fetch staker tier data');
      setStakerTierData([]);
    } finally {
      setIsStakerTierLoading(false);
    }
  }, []);

  // Fetch network staker tier data
  const fetchNetworkTierData = useCallback(async (voteAccount: string) => {
    setIsNetworkTierLoading(true);
    setNetworkTierError(null);
    
    try {
      const response = await fetch('/api/network/staker-tiers', {
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
        const sortedData = result.data.sort((a: NetworkStakerTierData, b: NetworkStakerTierData) => a.epoch - b.epoch);
        setNetworkTierData(sortedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching network tier data:', err);
      setNetworkTierError(err instanceof Error ? err.message : 'Failed to fetch network tier data');
      setNetworkTierData([]);
    } finally {
      setIsNetworkTierLoading(false);
    }
  }, []);

  // Fetch cumulative percentage data
  const fetchCumulativeData = useCallback(async (voteAccount: string, epoch: number) => {
    setIsCumulativeLoading(true);
    setCumulativeError(null);
    
    try {
      const response = await fetch('/api/validators/cumulative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vote_account: voteAccount,
          epoch: epoch.toString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Sort data by cumulative_pct_stakers for proper line visualization
        const sortedData = result.data.sort((a: CumulativePercentageData, b: CumulativePercentageData) => 
          a.cumulative_pct_stakers - b.cumulative_pct_stakers
        );
        setCumulativeData(sortedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching cumulative data:', err);
      setCumulativeError(err instanceof Error ? err.message : 'Failed to fetch cumulative data');
      setCumulativeData([]);
    } finally {
      setIsCumulativeLoading(false);
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

  // Handle cumulative epoch change
  const handleCumulativeEpochChange = useCallback((newEpoch: number) => {
    setSelectedCumulativeEpoch(newEpoch);
  }, []);

  // Fetch data when vote account changes
  useEffect(() => {
    if (selectedVoteAccount) {
      fetchValidatorData(selectedVoteAccount);
      fetchStakerTierData(selectedVoteAccount);
      fetchNetworkTierData(selectedVoteAccount);
      fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch);
    }
  }, [selectedVoteAccount, fetchValidatorData, fetchStakerTierData, fetchNetworkTierData, fetchCumulativeData, selectedCumulativeEpoch]);

  // Fetch cumulative data when epoch changes
  useEffect(() => {
    if (selectedVoteAccount && selectedCumulativeEpoch) {
      fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch);
    }
  }, [selectedCumulativeEpoch, selectedVoteAccount, fetchCumulativeData]);

  // Reset staker tier display mode to absolute if negative values are detected
  useEffect(() => {
    if (stakerTierHasNegativeValues && stakerTierDisplayMode === 'percent') {
      setStakerTierDisplayMode('absolute');
    }
  }, [stakerTierHasNegativeValues, stakerTierDisplayMode]);

  // Reset network tier display mode to absolute if negative values are detected
  useEffect(() => {
    if (networkTierHasNegativeValues && networkTierDisplayMode === 'percent') {
      setNetworkTierDisplayMode('absolute');
    }
  }, [networkTierHasNegativeValues, networkTierDisplayMode]);

  return (
    <div className="space-y-6">
      

      {/* Vote Account Filter */}
      <div className="mb-6 p-4 bg-gray-900/30 rounded-lg border border-gray-900">
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

      {/* Staker Tier Error Display */}
      {stakerTierError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400">Staker Tier Error: {stakerTierError}</p>
          <button
            onClick={() => fetchStakerTierData(selectedVoteAccount)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Network Tier Error Display */}
      {networkTierError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400">Network Tier Error: {networkTierError}</p>
          <button
            onClick={() => fetchNetworkTierData(selectedVoteAccount)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Cumulative Error Display */}
      {cumulativeError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-400">Cumulative Data Error: {cumulativeError}</p>
          <button
            onClick={() => fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Charts Display - All in Grid Layout with 2 Charts per Row */}
      
      {/* Row 1: Total Stakers & Stake Distribution */}
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

      {/* Row 2: Distribution Metrics & Concentration */}
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

      {/* Row 3: Ladder Chart & Box Plot */}
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

      {/* Row 4: Staker Tier Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Validator Staker Tier Chart */}
        <ChartCard
          title={stakerTierChartConfig.title}
          description={`Staker distribution by tier for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isStakerTierLoading}
          chart={stakerTierChartConfig}
          chartData={stakerTierData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={activeStakerTierTab}
                  onChange={setActiveStakerTierTab}
                  options={STAKER_TIER_TAB_OPTIONS}
                />
                <DisplayModeFilter
                  mode={stakerTierDisplayMode}
                  onChange={setStakerTierDisplayMode}
                  disabled={stakerTierHasNegativeValues}
                />
              </div>
            </div>
          }
        >
          <ChartRenderer
            chartConfig={stakerTierChartConfig}
            preloadedData={stakerTierData}
            filterValues={{ displayMode: stakerTierDisplayMode }}
            onFilterChange={(filterType, value) => {
              if (filterType === 'displayMode') {
                setStakerTierDisplayMode(value as DisplayMode);
              }
            }}
          />
        </ChartCard>

        {/* Network Staker Tier Chart */}
        <ChartCard
          title={networkTierChartConfig.title}
          description="Network-wide staker distribution by tier across all validators"
          isLoading={isNetworkTierLoading}
          chart={networkTierChartConfig}
          chartData={networkTierData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={activeNetworkTierTab}
                  onChange={setActiveNetworkTierTab}
                  options={NETWORK_TIER_TAB_OPTIONS}
                />
                <DisplayModeFilter
                  mode={networkTierDisplayMode}
                  onChange={setNetworkTierDisplayMode}
                  disabled={networkTierHasNegativeValues}
                />
              </div>
            </div>
          }
        >
          <ChartRenderer
            chartConfig={networkTierChartConfig}
            preloadedData={networkTierData}
            filterValues={{ displayMode: networkTierDisplayMode }}
            onFilterChange={(filterType, value) => {
              if (filterType === 'displayMode') {
                setNetworkTierDisplayMode(value as DisplayMode);
              }
            }}
          />
        </ChartCard>
      </div>

      {/* Row 5: Cumulative Distribution & Rewards/Commission Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Cumulative Percentage Chart */}
        <ChartCard
          title={cumulativeChartConfig.title}
          description={`Cumulative stake distribution showing percentage relationship for epoch ${selectedCumulativeEpoch}`}
          isLoading={isCumulativeLoading}
          chart={cumulativeChartConfig}
          chartData={cumulativeData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-300">Epoch:</label>
                <input
                  type="number"
                  value={selectedCumulativeEpoch}
                  onChange={(e) => handleCumulativeEpochChange(Number(e.target.value))}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          }
        >
          <MultiSeriesLineBarChart
            chartConfig={cumulativeChartConfig}
            data={cumulativeData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit="%"
          />
        </ChartCard>

        {/* Rewards & Commission Stacked Chart */}
        <ChartCard
          title={rewardsCommissionChartConfig.title}
          description={`Stacked view of total rewards distributed and commission collected by epoch for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={rewardsCommissionChartConfig}
          chartData={chartData}
        >
          <ChartRenderer
            chartConfig={rewardsCommissionChartConfig}
            preloadedData={chartData}
          />
        </ChartCard>
      </div>

      {/* Row 6: Reward Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Reward Analysis Chart */}
        <ChartCard
          title={getRewardTabInfo(activeRewardTab).title}
          description={`Reward analysis for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={rewardChartConfig}
          chartData={chartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={activeRewardTab}
                  onChange={setActiveRewardTab}
                  options={REWARD_TAB_OPTIONS}
                />
              </div>
            </div>
          }
        >
          {getRewardTabInfo(activeRewardTab).chartType === 'line' ? (
            <MultiSeriesLineBarChart
              chartConfig={rewardChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getRewardTabInfo(activeRewardTab).unit}
            />
          ) : (
            <SimpleBarChart
              chartConfig={rewardChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getRewardTabInfo(activeRewardTab).unit}
            />
          )}
        </ChartCard>

        {/* Reward Rate Analysis Chart */}
        <ChartCard
          title={getRewardRateTabInfo(activeRewardRateTab).title}
          description={`Reward rate analysis for validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={rewardRateChartConfig}
          chartData={chartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GenericFilter
                  value={activeRewardRateTab}
                  onChange={setActiveRewardRateTab}
                  options={REWARD_RATE_TAB_OPTIONS}
                />
              </div>
            </div>
          }
        >
          <MultiSeriesLineBarChart
            chartConfig={rewardRateChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit={getRewardRateTabInfo(activeRewardRateTab).unit}
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
