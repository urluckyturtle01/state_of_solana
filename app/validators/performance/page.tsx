'use client';

import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import BoxChart, { BoxPlotData, BoxChartLegend } from '@/app/admin/components/charts/BoxChart';
import LadderChart, { LadderChartData } from '@/app/admin/components/charts/LadderChart';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import StakeTypeFilter, { StakeType, GenericFilter, MetricType, METRIC_TYPE_OPTIONS, FilterOption } from '@/app/components/shared/filters/StakeTypeFilter';
import DisplayModeFilter, { DisplayMode } from '@/app/components/shared/filters/DisplayModeFilter';
import LegendItem from '@/app/components/shared/LegendItem';
import { getColorByIndex } from '@/app/utils/chartColors';

// Concentration type definition (internal to component)
type ConcentrationType = 'top_01pct' | 'top_1pct' | 'top_5pct' | 'top_10pct';

const CONCENTRATION_TYPE_OPTIONS = [
  { value: 'top_01pct' as ConcentrationType, label: 'Top 0.1% Concentration', description: 'Concentration among top 0.1% of stakers' },
  { value: 'top_1pct' as ConcentrationType, label: 'Top 1% Concentration', description: 'Concentration among top 1% of stakers' },
  { value: 'top_5pct' as ConcentrationType, label: 'Top 5% Concentration', description: 'Concentration among top 5% of stakers' },
  { value: 'top_10pct' as ConcentrationType, label: 'Top 10% Concentration', description: 'Concentration among top 10% of stakers' },
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
  top_01pct: number;
  top_1pct: number;
  top_5pct: number;
  top_10pct: number;
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

function ValidatorsPerformanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get vote account from URL params or use default
  const defaultVoteAccount = 'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v';
  const voteAccountFromUrl = searchParams.get('voteAccount');
  
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    voteAccountFromUrl || defaultVoteAccount
  );
  const [selectedStakeType, setSelectedStakeType] = useState<StakeType>('total_stake');
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType>('gini_coefficient');
  const [selectedConcentrationType, setSelectedConcentrationType] = useState<ConcentrationType>('top_1pct');
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
  
  // Legend state
  const [legends, setLegends] = useState<Record<string, Array<{label: string; color: string; value?: number; fieldId?: string}>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

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
        return { 
          title: 'Total Staked SOL per Epoch', 
          unit: 'SOL',
          info: {
            title: 'Total Stake',
            description: 'Total SOL staked to the validator per epoch.'
          }
        };
      case 'mean_stake':
        return { 
          title: 'Mean Staked SOL per EPOCH', 
          unit: 'SOL',
          info: {
            title: 'Mean Stake',
            description: 'Average stake per staker. Heavily influenced by large outliers and whale stakers.'
          }
        };
      case 'median_stake':
        return { 
          title: 'Median Staked SOL per Epoch', 
          unit: 'SOL',
          info: {
            title: 'Median Stake',
            description: 'Middle value of stake amounts. Better represents typical staker, less affected by outliers.'
          }
        };
      default:
        return { title: 'Stake by Epoch', unit: 'SOL', info: { title: '', description: '' } };
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
          title: 'Stake Gini Index by Epoch', 
          description: 'Stake distribution inequality for this validator across recent Solana epochs.',
          unit: '',
          hasNetworkMedian: true,
          networkMedianField: 'network_gini_coefficient',
          info: {
            title: 'Gini Coefficient',
            description: 'Measure of stake inequality among validators. 0 = equal distribution; 1 = full concentration.'
          }
        };
      case 'hhi_index':
        return { 
          title: 'Stake HHI Index by Epoch', 
          description: 'Herfindahl-Hirschman Index of stake concentration for this validator across recent epochs.',
          unit: '',
          hasNetworkMedian: true,
          networkMedianField: 'network_hhi_index',
          info: {
            title: 'HHI Index',
            description: 'Summarizes stake concentration across validators. Lower = decentralized; higher = centralized.'
          }
        };
      case 'nakamoto_coeff_33':
        return { 
          title: 'Nakamoto Coefficient by Epoch', 
          description: 'Minimum number of validators needed to control 33% of stake across recent epochs.',
          unit: 'stakers',
          hasNetworkMedian: true,
          networkMedianField: 'network_nakamoto_coeff_33',
          info: {
            title: 'Nakamoto Coefficient',
            description: 'Minimum number of entities controlling 33% of stake. Higher = stronger decentralization and security.'
          }
        };
      case 'skewness':
        return { 
          title: 'Stake Skewness by Epoch', 
          description: 'Distribution asymmetry of validator’s staked SOL across epochs.',
          unit: '',
          info: {
            title: 'Skewness',
            description: 'Degree of asymmetry in stake or rewards data. Positive = right-tailed; negative = left-tailed distribution.'
          }
        };
      case 'kurtosis':
        return { 
          title: 'Stake Kurtosis by Epoch', 
          description: 'Tail risk and outlier intensity in validator’s staked SOL per epoch.',
          unit: '',
          info: {
            title: 'Kurtosis',
            description: 'Measures tail extremity of data distribution. High kurtosis highlights frequent outliers and risk.'
          }
        };
      default:
        return { title: 'Distribution Metric by Epoch', unit: '', info: { title: '', description: '' } };
    }
  };

  // Get concentration type display info
  const getConcentrationTypeInfo = (concentrationType: ConcentrationType) => {
    switch (concentrationType) {
      case 'top_01pct':
        return { 
          title: 'Top 0.1% Stake Concentration by Epoch', 
          description: 'Share of total network stake held by the largest 0.1% of validators per epoch.',
          unit: '%',
          info: {
            title: 'Top 0.1% Stake Concentration by Epoch',
            description: '% of total stake held by the top 0.1% validators each epoch. Higher values suggest centralization risk.'
          }
        };
      case 'top_1pct':
        return { 
          title: 'Top 1% Stake Concentration by Epoch', 
          description: 'Share of total network stake held by the largest 1% of validators per epoch.',
          unit: '%',
          info: {
            title: 'Top 1% Stake Concentration by Epoch',
            description: '% of total stake held by the top 1% validators each epoch. Higher values suggest centralization risk.'
          }
        };
      case 'top_5pct':
        return { 
          title: 'Top 5% Stake Concentration by Epoch', 
          description: 'Share of total network stake held by the largest 5% of validators per epoch.',
          unit: '%',
          info: {
            title: 'Top 5% Stake Concentration by Epoch',
            description: '% of total stake held by the top 5% validators each epoch. Higher values suggest centralization risk.'
          }
        };
      case 'top_10pct':
        return { 
          title: 'Top 10% Stake Concentration by Epoch', 
          description: 'Share of total network stake held by the largest 10% of validators per epoch.',
          unit: '%',
          info: {
            title: 'Top 10% Stake Concentration by Epoch',
            description: '% of total stake held by the top 10% validators each epoch. Higher values suggest centralization risk.'
          }
        };
      default:
        return { title: 'Concentration by Epoch', unit: '%', info: { title: '', description: '' } };
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
          chartType: 'bar' as const,
          info: {
            title: 'Total Rewards Distribution by Epoch',
            description: 'Total SOL rewards earned by validator and stakers each epoch. Indicates performance.'
          }
        };
      case 'average':
        return { 
          title: 'Average Reward per Staker by Epoch', 
          field: 'avg_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const,
          info: {
            title: 'Average Reward',
            description: 'Mean reward per staker. Heavily influenced by whale stakers with large stakes.'
          }
        };
      case 'median':
        return { 
          title: 'Median Reward per Staker by Epoch', 
          field: 'median_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const,
          info: {
            title: 'Median Reward',
            description: 'Middle value of staker rewards. Better represents typical staker experience, less affected by outliers.'
          }
        };
      case 'gini':
        return { 
          title: 'Reward Gini Coefficient by Epoch', 
          field: 'reward_gini_coefficient',
          unit: '',
          chartType: 'line' as const,
          info: {
            title: 'Reward Gini',
            description: 'Reward inequality measure. 0 = equal rewards, 1 = extremely unequal distribution.'
          }
        };
      default:
        return { 
          title: 'Reward Metrics by Epoch', 
          field: 'total_rewards_distributed',
          unit: 'SOL',
          chartType: 'bar' as const,
          info: { title: '', description: '' }
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
          unit: '%',
          info: {
            title: 'Average Reward Rate by Epoch',
            description: 'Average staking reward rate per epoch for delegators. Shows staking yield efficiency.'
          }
        };
      case 'median_rate':
        return { 
          title: 'Median Reward Rate by Epoch', 
          field: 'median_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Median Rate',
            description: 'Middle reward rate value. Better represents typical staker experience, less affected by outliers.'
          }
        };
      case 'min_rate':
        return { 
          title: 'Minimum Reward Rate by Epoch', 
          field: 'min_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Minimum Rate',
            description: 'Lowest reward rate earned. Can indicate late staking or validator performance issues.'
          }
        };
      case 'max_rate':
        return { 
          title: 'Maximum Reward Rate by Epoch', 
          field: 'max_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Maximum Rate',
            description: 'Highest reward rate earned. May indicate early staking or full epoch participation.'
          }
        };
      default:
        return { 
          title: 'Reward Rate by Epoch', 
          field: 'avg_reward_rate_pct',
          unit: '%',
          info: { title: '', description: '' }
        };
    }
  };

  // Get staker tier tab display info
  const getStakerTierTabInfo = (tabType: StakerTierTabType) => {
    switch (tabType) {
      case 'staker_count':
        return { 
          title: 'Staker Count Distribution by Tier', 
          description: 'Number of stakers per delegation size tier for this validator across epochs.',
          field: 'validator_staker_count',
          unit: '',
          info: {
            title: 'Staker Count by Tier',
            description: 'Counts of stakers grouped by delegation size tiers. Reveals delegator diversity.'
          }
        };
      case 'total_stake':
        return { 
          title: 'Total Stake Distribution by Tier', 
          description: "Validator's staked SOL by delegation size tier across epochs.",
          field: 'validator_total_stake_in_tier',
          unit: 'SOL',
          info: {
            title: 'Total Stake',
            description: 'Amount of stake (in SOL)  grouped by delegation size tiers. Reveals delegator diversity.'
          }
        };
      default:
        return { 
          title: 'Staker Count by Tier', 
          field: 'validator_staker_count',
          unit: '',
          info: { title: '', description: '' }
        };
    }
  };

  // Get network tier tab display info
  const getNetworkTierTabInfo = (tabType: NetworkTierTabType) => {
    switch (tabType) {
      case 'staker_count':
        return { 
          title: 'Network Staker Count by Tier', 
          description: 'Number of stakers per delegation size tier across all Solana validators, per epoch.',
          field: 'network_staker_count',
          unit: '',
          info: {
            title: 'Network Staker Count by Tier',
            description: 'Counts of all network stakers segmented by stake tiers. Indicates network-wide stake profile.'
          }
        };
      case 'total_stake':
        return { 
          title: 'Network Total Stake Distribution by Tier.', 
          description: 'Total staked SOL per delegation size tier across all Solana validators, per epoch.',
          field: 'network_total_stake_in_tier',
          unit: 'SOL',
          info: {
            title: 'Network Total Stake',
            description: 'Amount of stake (in SOL) of all network stakers segmented by stake tiers. Indicates network-wide stake profile.'
          }
        };
      default:
        return { 
          title: 'Network Staker Count by Tier', 
          field: 'network_staker_count',
          unit: '',
          info: { title: '', description: '' }
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
        category: 'top_01pct',
        value: epochData.top_01pct,
        label: 'Top 0.1% Concentration'
      },
      {
        category: 'top_1pct',
        value: epochData.top_1pct,
        label: 'Top 1% Concentration'
      },
      {
        category: 'top_5pct',
        value: epochData.top_5pct,
        label: 'Top 5% Concentration'
      },
      {
        category: 'top_10pct',
        value: epochData.top_10pct,
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

  // Set default vote account in URL on initial load if not present
  useEffect(() => {
    const voteAccountParam = searchParams.get('voteAccount');
    if (!voteAccountParam) {
      // No vote account in URL, set the default one
      const params = new URLSearchParams(searchParams.toString());
      params.set('voteAccount', defaultVoteAccount);
      router.replace(`/validators/performance?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, defaultVoteAccount]);

  // Update vote account when URL params change
  useEffect(() => {
    const voteAccountParam = searchParams.get('voteAccount');
    if (voteAccountParam && voteAccountParam !== selectedVoteAccount) {
      setSelectedVoteAccount(voteAccountParam);
    }
  }, [searchParams, selectedVoteAccount]);

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

  // Update legends when data changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      // Stakers chart (single series)
      const stakersTotal = chartData.reduce((sum, d) => sum + (Number(d.total_stakers) || 0), 0);
      
      // Stake chart (single series)
      const stakeField = selectedStakeType;
      const stakeTotal = chartData.reduce((sum, d) => sum + (Number(d[stakeField as keyof ValidatorPerformanceData]) || 0), 0);
      
      // Concentration chart (single series)
      const concentrationField = selectedConcentrationType;
      const concentrationTotal = chartData.reduce((sum, d) => sum + (Number(d[concentrationField as keyof ValidatorPerformanceData]) || 0), 0);
      
      // Distribution chart (validator + network median)
      if (getMetricTypeInfo(selectedMetricType).hasNetworkMedian) {
        const validatorField = selectedMetricType;
        const networkField = getMetricTypeInfo(selectedMetricType).networkMedianField!;
        
        setLegends(prev => ({
          ...prev,
          'validator-stakers-chart': [{
            label: 'Total Stakers',
            color: getColorByIndex(0),
            value: stakersTotal,
            fieldId: 'total_stakers'
          }],
          'validator-stake-chart': [{
            label: getStakeTypeInfo(selectedStakeType).title.replace(' per Epoch', '').replace(' per EPOCH', ''),
            color: getColorByIndex(0),
            value: stakeTotal,
            fieldId: stakeField
          }],
          'validator-concentration-chart': [{
            label: getConcentrationTypeInfo(selectedConcentrationType).title.replace(' by Epoch', ''),
            color: getColorByIndex(0),
            value: concentrationTotal,
            fieldId: concentrationField
          }],
          'validator-distribution-chart': [
            {
              label: 'Validator',
              color: getColorByIndex(0),
              value: chartData.reduce((sum, d) => sum + (Number(d[validatorField as keyof ValidatorPerformanceData]) || 0), 0),
              fieldId: validatorField
            },
            {
              label: 'Network Median',
              color: getColorByIndex(1),
              value: chartData.reduce((sum, d) => sum + (Number(d[networkField as keyof ValidatorPerformanceData]) || 0), 0),
              fieldId: networkField
            }
          ]
        }));
      } else {
        // Distribution chart (single series - no network median)
        const metricField = selectedMetricType;
        const metricTotal = chartData.reduce((sum, d) => sum + (Number(d[metricField as keyof ValidatorPerformanceData]) || 0), 0);
        
        setLegends(prev => ({
          ...prev,
          'validator-stakers-chart': [{
            label: 'Total Stakers',
            color: getColorByIndex(0),
            value: stakersTotal,
            fieldId: 'total_stakers'
          }],
          'validator-stake-chart': [{
            label: getStakeTypeInfo(selectedStakeType).title.replace(' per Epoch', '').replace(' per EPOCH', ''),
            color: getColorByIndex(0),
            value: stakeTotal,
            fieldId: stakeField
          }],
          'validator-concentration-chart': [{
            label: getConcentrationTypeInfo(selectedConcentrationType).title.replace(' by Epoch', ''),
            color: getColorByIndex(0),
            value: concentrationTotal,
            fieldId: concentrationField
          }],
          'validator-distribution-chart': [{
            label: getMetricTypeInfo(selectedMetricType).title.replace(' by Epoch', ''),
            color: getColorByIndex(0),
            value: metricTotal,
            fieldId: metricField
          }]
        }));
      }
    }
    
    // Cumulative chart
    if (cumulativeData && cumulativeData.length > 0) {
      const total = cumulativeData.reduce((sum, d) => sum + (Number(d.cumulative_pct_stake) || 0), 0);
      setLegends(prev => ({
        ...prev,
        'validator-cumulative-chart': [{
          label: 'Cumulative Pct Stake',
          color: getColorByIndex(0),
          value: total,
          fieldId: 'cumulative_pct_stake'
        }]
      }));
    }
  }, [chartData, cumulativeData, selectedMetricType, selectedStakeType, selectedConcentrationType]);

  // Update staker tier legends when data changes
  useEffect(() => {
    if (stakerTierData && stakerTierData.length > 0) {
      const uniqueTiers = Array.from(new Set(stakerTierData.map(d => d.tier_name)));
      const currentField = getStakerTierTabInfo(activeStakerTierTab).field as keyof ValidatorStakerTierData;
      
      const stakerTierLegends = uniqueTiers.map((tier, index) => {
        const total = stakerTierData
          .filter(d => d.tier_name === tier)
          .reduce((sum, d) => sum + (Number(d[currentField]) || 0), 0);
        
        return {
          label: tier,
          color: getColorByIndex(index),
          value: total,
          fieldId: tier  // For stacked charts, the field ID is the tier name
        };
      }).sort((a, b) => b.value - a.value);
      
      setLegends(prev => ({
        ...prev,
        'validator-staker-tier-chart': stakerTierLegends
      }));
    }
  }, [stakerTierData, activeStakerTierTab]);

  // Update network tier legends when data changes
  useEffect(() => {
    if (networkTierData && networkTierData.length > 0) {
      const uniqueTiers = Array.from(new Set(networkTierData.map(d => d.tier_name)));
      const currentField = getNetworkTierTabInfo(activeNetworkTierTab).field as keyof NetworkStakerTierData;
      
      const networkTierLegends = uniqueTiers.map((tier, index) => {
        const total = networkTierData
          .filter(d => d.tier_name === tier)
          .reduce((sum, d) => sum + (Number(d[currentField]) || 0), 0);
        
        return {
          label: tier,
          color: getColorByIndex(index),
          value: total,
          fieldId: tier  // For stacked charts, the field ID is the tier name
        };
      }).sort((a, b) => b.value - a.value);
      
      setLegends(prev => ({
        ...prev,
        'network-staker-tier-chart': networkTierLegends
      }));
    }
  }, [networkTierData, activeNetworkTierTab]);

  // Legend click handlers
  const handleLegendClick = useCallback((chartId: string, label: string) => {
    const legendItem = legends[chartId]?.find(l => l.label === label);
    const fieldId = legendItem?.fieldId || label;
    
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
  }, [legends]);

  const handleLegendDoubleClick = useCallback((chartId: string, label: string) => {
    const legendItem = legends[chartId]?.find(l => l.label === label);
    const fieldId = legendItem?.fieldId || label;
    const allFieldIds = legends[chartId]?.map(l => l.fieldId || l.label) || [];
    
    setHiddenSeries(prev => {
      const currentHidden = prev[chartId] || [];
      if (allFieldIds.length === 0) return prev;

      if (currentHidden.length === allFieldIds.length - 1 && !currentHidden.includes(fieldId)) {
        // Restore all
        return { ...prev, [chartId]: [] };
      } else {
        // Isolate this series
        return { ...prev, [chartId]: allFieldIds.filter(f => f !== fieldId) };
      }
    });
  }, [legends]);

  return (
    <div className="space-y-6">
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
          title="Unique Stakers per Epoch"
          description={`Number of unique delegators to this validator over recent epochs.`}
          isLoading={isLoading}
          chart={stakersChartConfig}
          chartData={chartData}
          info={{
            title: 'Total Stakers by Epoch',
            description: 'Unique staker accounts delegating to this validator each epoch. Growing count indicates rising popularity.'
          }}
          legend={
            <>
              {legends['validator-stakers-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="square"
                  onClick={() => handleLegendClick('validator-stakers-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-stakers-chart', legend.label)}
                  inactive={(hiddenSeries['validator-stakers-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <SimpleBarChart
            chartConfig={stakersChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            hiddenSeries={hiddenSeries['validator-stakers-chart'] || []}
          />
        </ChartCard>

        {/* Stake Chart with Filter */}
        <ChartCard
          title={getStakeTypeInfo(selectedStakeType).title}
          description={`Validator's staked amount across recent Solana epochs.`}
          isLoading={isLoading}
          chart={stakeChartConfig}
          chartData={chartData}
          info={getStakeTypeInfo(selectedStakeType).info}
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
          legend={
            <>
              {legends['validator-stake-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape={shouldUseLineChart(selectedStakeType) ? "circle" : "square"}
                  onClick={() => handleLegendClick('validator-stake-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-stake-chart', legend.label)}
                  inactive={(hiddenSeries['validator-stake-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          {shouldUseLineChart(selectedStakeType) ? (
            <MultiSeriesLineBarChart
              chartConfig={stakeChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getStakeTypeInfo(selectedStakeType).unit}
              hiddenSeries={hiddenSeries['validator-stake-chart'] || []}
            />
          ) : (
            <SimpleBarChart
              chartConfig={stakeChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getStakeTypeInfo(selectedStakeType).unit}
              hiddenSeries={hiddenSeries['validator-stake-chart'] || []}
            />
          )}
        </ChartCard>
      </div>

      {/* Row 2: Distribution Metrics & Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Distribution Metrics Chart */}
        <ChartCard
          title={getMetricTypeInfo(selectedMetricType).title}
          description={getMetricTypeInfo(selectedMetricType).description}
          isLoading={isLoading}
          chart={distributionChartConfig}
          chartData={chartData}
          info={getMetricTypeInfo(selectedMetricType).info}
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
          legend={
            <>
              {legends['validator-distribution-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="circle"
                  onClick={() => handleLegendClick('validator-distribution-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-distribution-chart', legend.label)}
                  inactive={(hiddenSeries['validator-distribution-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <MultiSeriesLineBarChart
            chartConfig={distributionChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit={getMetricTypeInfo(selectedMetricType).unit}
            hiddenSeries={hiddenSeries['validator-distribution-chart'] || []}
          />
        </ChartCard>

        {/* Concentration Chart */}
        <ChartCard
          title={getConcentrationTypeInfo(selectedConcentrationType).title}
          description={getConcentrationTypeInfo(selectedConcentrationType).description}
          isLoading={isLoading}
          chart={concentrationChartConfig}
          chartData={chartData}
          info={getConcentrationTypeInfo(selectedConcentrationType).info}
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
          legend={
            <>
              {legends['validator-concentration-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="square"
                  onClick={() => handleLegendClick('validator-concentration-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-concentration-chart', legend.label)}
                  inactive={(hiddenSeries['validator-concentration-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <SimpleBarChart
            chartConfig={concentrationChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit={getConcentrationTypeInfo(selectedConcentrationType).unit}
            hiddenSeries={hiddenSeries['validator-concentration-chart'] || []}
          />
        </ChartCard>
      </div>

      {/* Row 3: Ladder Chart & Box Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        

        {/* Box Plot Chart */}
        <ChartCard
          title="Stake Distribution per Epoch (Log Scale)"
          description={`Box plot of validator’s delegated stake quartiles over last 10 epochs.`}
          isLoading={isLoading}
          chart={boxPlotChartConfig}
          chartData={boxPlotData}
          legend={<BoxChartLegend />}
          legendWidth="1/6"
          info={{
            title: 'Stake Distribution (Box Plot - Log Scale)',
            description: 'Distribution of staked SOL per delegator using box plot on log scale. Shows median, IQR, and outliers.'
          }}
        >
          <BoxChart
            chartConfig={boxPlotChartConfig}
            data={boxPlotData}
            height={400}
            maxXAxisTicks={10}
            yAxisUnit="SOL"
          />
        </ChartCard>


        {/* Validator Staker Tier Chart */}
        <ChartCard
          title={stakerTierChartConfig.title}
          description={getStakerTierTabInfo(activeStakerTierTab).description}
          isLoading={isStakerTierLoading}
          chart={stakerTierChartConfig}
          chartData={stakerTierData}
          info={getStakerTierTabInfo(activeStakerTierTab).info}
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
          legend={
            <>
              {legends['validator-staker-tier-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="square"
                  onClick={() => handleLegendClick('validator-staker-tier-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-staker-tier-chart', legend.label)}
                  inactive={(hiddenSeries['validator-staker-tier-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
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
            hiddenSeries={hiddenSeries['validator-staker-tier-chart'] || []}
          />
        </ChartCard>
      </div>

      {/* Network Staker Tier Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title={networkTierChartConfig.title}
          description={getNetworkTierTabInfo(activeNetworkTierTab).description}
          isLoading={isNetworkTierLoading}
          chart={networkTierChartConfig}
          chartData={networkTierData}
          info={getNetworkTierTabInfo(activeNetworkTierTab).info}
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
          legend={
            <>
              {legends['network-staker-tier-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="square"
                  onClick={() => handleLegendClick('network-staker-tier-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('network-staker-tier-chart', legend.label)}
                  inactive={(hiddenSeries['network-staker-tier-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
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
            hiddenSeries={hiddenSeries['network-staker-tier-chart'] || []}
          />
        </ChartCard>
      </div>

      
    </div>
  );
}

export default function ValidatorsPerformancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <ValidatorsPerformanceContent />
    </Suspense>
  );
}
