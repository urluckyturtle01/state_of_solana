'use client';

import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import { GenericFilter, FilterOption } from '@/app/components/shared/filters/StakeTypeFilter';
import { ChartConfig, YAxisConfig } from '@/app/admin/types';

// Reward tab type definition
type RewardTabType = 'average' | 'median' | 'gini';

const REWARD_TAB_OPTIONS: FilterOption<RewardTabType>[] = [
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

interface ValidatorPerformanceData {
  vote_account: string;
  epoch: number;
  total_rewards_distributed: number;
  avg_reward_per_staker: number;
  median_reward_per_staker: number;
  reward_gini_coefficient: number;
  avg_reward_rate_pct: number;
  median_reward_rate_pct: number;
  min_reward_rate_pct: number;
  max_reward_rate_pct: number;
  total_commission_collected: number;
  block_rewards_sol: number;
  [key: string]: any;
}

function ValidatorsRewardsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get vote account from URL params or use default
  const defaultVoteAccount = 'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v';
  const voteAccountFromUrl = searchParams.get('voteAccount');
  
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    voteAccountFromUrl || defaultVoteAccount
  );
  const [activeRewardTab, setActiveRewardTab] = useState<RewardTabType>('average');
  const [activeRewardRateTab, setActiveRewardRateTab] = useState<RewardRateTabType>('avg_rate');
  const [chartData, setChartData] = useState<ValidatorPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get reward tab display info
  const getRewardTabInfo = (tabType: RewardTabType) => {
    switch (tabType) {
      case 'average':
        return { 
          title: 'Average Rewards Distributed by Epoch', 
          description: 'Average SOL rewards earned by validator stakers per epoch.',
          field: 'avg_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const,
          info: {
            title: 'Average reward per staker by Epoch',
            description: 'Average SOL rewards earned by validator and stakers each epoch. Indicates performance.'
          }
        };
      case 'median':
        return { 
          title: 'Median Rewards Distributed by Epoch', 
          description: 'Median SOL rewards earned by validator stakers per epoch.',
          field: 'median_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const,
          info: {
            title: 'Median reward per staker by Epoch',
            description: 'Median SOL rewards earned by validator and stakers each epoch. Indicates performance.'
          }
        };
      case 'gini':
        return { 
          title: 'Gini coefficient of Rewards Distributed by Epoch', 
          description: 'Gini coefficient for SOL rewards earned by validator stakers per epoch.',
          field: 'reward_gini_coefficient',
          unit: '',
          chartType: 'line' as const,
          info: {
            title: 'Reward Gini Coefficient by Epoch',
            description: 'Gini coefficient of rewards earned by validator and stakers each epoch. Measures stake inequality.'
          }
        };
      default:
        return { 
          title: 'Reward Metrics by Epoch', 
          field: 'avg_reward_per_staker',
          unit: 'SOL',
          chartType: 'line' as const,
          info: { title: '', description: '' }
        };
    }
  };

  // Get reward rate tab display info
  const getRewardRateTabInfo = (tabType: RewardRateTabType) => {
    switch (tabType) {
      case 'avg_rate':
        return { 
          title: 'Average Reward Rate by Epoch', 
          description: 'Average percentage yield on staked SOL for this validator, per epoch.',
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
          description: 'Median percentage yield on staked SOL for this validator, per epoch.',
          field: 'median_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Median Reward Rate by Epoch',
            description: 'Median staking reward rate per epoch for delegators. Shows staking yield efficiency.'
          }
        };
      case 'min_rate':
        return { 
          title: 'Minimum Reward Rate by Epoch', 
          description: 'Minimum percentage yield on staked SOL for this validator, per epoch.',
          field: 'min_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Minimum Reward Rate by Epoch',
            description: 'Minimum staking reward rate per epoch for delegators.'
          }
        };
      case 'max_rate':
        return { 
          title: 'Maximum Reward Rate by Epoch', 
          description: 'Maximum percentage yield on staked SOL for this validator, per epoch.',
          field: 'max_reward_rate_pct',
          unit: '%',
          info: {
            title: 'Maximum Reward Rate by Epoch',
            description: 'Maximum staking reward rate per epoch for delegators.'
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

  // Chart configuration for block rewards
  const blockRewardsChartConfig: ChartConfig = {
    id: 'validator-block-rewards-chart',
    title: 'Block Rewards by Epoch',
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'bar',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: 'block_rewards_sol',
      yAxisUnit: 'SOL'
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

  // Set default vote account in URL on initial load if not present
  useEffect(() => {
    const voteAccountParam = searchParams.get('voteAccount');
    if (!voteAccountParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('voteAccount', defaultVoteAccount);
      router.replace(`/validators/rewards?${params.toString()}`, { scroll: false });
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
    }
  }, [selectedVoteAccount, fetchValidatorData]);

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

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Rewards & Commission Stacked Chart */}
      <ChartCard
        title={rewardsCommissionChartConfig.title}
        description={`Validator rewards split between stakers and commission, per epoch.`}
        isLoading={isLoading}
        chart={rewardsCommissionChartConfig}
        chartData={chartData}
        info={{
          title: 'Rewards & Commission Distribution by Epoch',
          description: 'Split of validator rewards between commission and stakers. Reflects income flow.'
        }}
      >
        <ChartRenderer
          chartConfig={rewardsCommissionChartConfig}
          preloadedData={chartData}
        />
      </ChartCard>

      {/* Block Rewards Chart */}
      <ChartCard
        title={blockRewardsChartConfig.title}
        description="Block production rewards earned by the validator per epoch."
        isLoading={isLoading}
        chart={blockRewardsChartConfig}
        chartData={chartData}
        info={{
          title: 'Block Rewards by Epoch',
          description: 'SOL rewards earned from block production. Reflects validator block production performance.'
        }}
      >
        <SimpleBarChart
          chartConfig={blockRewardsChartConfig}
          data={chartData}
          height={300}
          maxXAxisTicks={8}
          yAxisUnit="SOL"
        />
      </ChartCard>

      {/* Reward Analysis Chart */}
      <ChartCard
          title={getRewardTabInfo(activeRewardTab).title}
          description={getRewardTabInfo(activeRewardTab).description}
          isLoading={isLoading}
          chart={rewardChartConfig}
          chartData={chartData}
          info={getRewardTabInfo(activeRewardTab).info}
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
          description={getRewardRateTabInfo(activeRewardRateTab).description}
          isLoading={isLoading}
          chart={rewardRateChartConfig}
          chartData={chartData}
          info={getRewardRateTabInfo(activeRewardRateTab).info}
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

      {/* Reward Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        

        
      </div>
    </div>
  );
}

export default function ValidatorsRewardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <ValidatorsRewardsContent />
    </Suspense>
  );
}
