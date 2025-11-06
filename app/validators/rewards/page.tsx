'use client';

import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChartCard from '@/app/components/shared/ChartCard';
import SimpleBarChart from '@/app/admin/components/charts/SimpleBarChart';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import ChartRenderer from '@/app/admin/components/ChartRenderer';
import { GenericFilter, FilterOption } from '@/app/components/shared/filters/StakeTypeFilter';
import { ChartConfig, YAxisConfig } from '@/app/admin/types';
import LegendItem from '@/app/components/shared/LegendItem';
import { getColorByIndex } from '@/app/utils/chartColors';

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
  const [chartData, setChartData] = useState<ValidatorPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Legend state
  const [legends, setLegends] = useState<Record<string, Array<{label: string; color: string; value?: number; fieldId?: string}>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

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

  // Chart configuration for reward rate (multi-series)
  const rewardRateChartConfig: ChartConfig = {
    id: 'validator-reward-rate-chart',
    title: 'Reward Rate by Epoch',
    subtitle: `Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-performance',
    chartType: 'line',
    apiEndpoint: '/api/validators/performance',
    dataMapping: {
      xAxis: 'epoch',
      yAxis: [
        { field: 'avg_reward_rate_pct', type: 'line', unit: '%', label: 'Avg Rate' } as YAxisConfig,
        { field: 'median_reward_rate_pct', type: 'line', unit: '%', label: 'Median Rate' } as YAxisConfig,
        { field: 'max_reward_rate_pct', type: 'line', unit: '%', label: 'Max Rate' } as YAxisConfig
      ],
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

  // Update legends when data changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      // Block Rewards chart (single series)
      const blockRewardsTotal = chartData.reduce((sum, d) => sum + (Number(d.block_rewards_sol) || 0), 0);
      
      // Reward chart (single series based on tab)
      const rewardField = getRewardTabInfo(activeRewardTab).field;
      const rewardTotal = chartData.reduce((sum, d) => sum + (Number(d[rewardField]) || 0), 0);
      
      // Reward Rate chart (multi-series)
      const rewardRateFields = ['avg_reward_rate_pct', 'median_reward_rate_pct', 'max_reward_rate_pct'];
      const rewardRateLegends = rewardRateFields.map((field, index) => ({
        label: field === 'avg_reward_rate_pct' ? 'Avg Rate' :
               field === 'median_reward_rate_pct' ? 'Median Rate' : 'Max Rate',
        color: getColorByIndex(index),
        value: chartData.reduce((sum, d) => sum + (Number(d[field]) || 0), 0),
        fieldId: field
      }));
      
      // Rewards & Commission chart (stacked)
      const rewardsCommissionLegends = [
        {
          label: 'Total Rewards',
          color: getColorByIndex(0),
          value: chartData.reduce((sum, d) => sum + (Number(d.total_rewards_distributed) || 0), 0),
          fieldId: 'total_rewards_distributed'
        },
        {
          label: 'Total Commission',
          color: getColorByIndex(1),
          value: chartData.reduce((sum, d) => sum + (Number(d.total_commission_collected) || 0), 0),
          fieldId: 'total_commission_collected'
        }
      ];
      
      setLegends({
        'validator-block-rewards-chart': [{
          label: 'Block Rewards',
          color: getColorByIndex(0),
          value: blockRewardsTotal,
          fieldId: 'block_rewards_sol'
        }],
        'validator-reward-chart': [{
          label: getRewardTabInfo(activeRewardTab).title.replace(' by Epoch', '').replace(' Distributed', ''),
          color: getColorByIndex(0),
          value: rewardTotal,
          fieldId: rewardField
        }],
        'validator-reward-rate-chart': rewardRateLegends,
        'validator-rewards-commission-chart': rewardsCommissionLegends
      });
    }
  }, [chartData, activeRewardTab]);

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
        legend={
          <>
            {legends['validator-rewards-commission-chart']?.map(legend => (
              <LegendItem
                key={legend.label}
                label={legend.label}
                color={legend.color}
                shape="square"
                onClick={() => handleLegendClick('validator-rewards-commission-chart', legend.label)}
                onDoubleClick={() => handleLegendDoubleClick('validator-rewards-commission-chart', legend.label)}
                inactive={(hiddenSeries['validator-rewards-commission-chart'] || []).includes(legend.fieldId || legend.label)}
              />
            ))}
          </>
        }
        legendWidth="1/6"
      >
        <ChartRenderer
          chartConfig={rewardsCommissionChartConfig}
          preloadedData={chartData}
          hiddenSeries={hiddenSeries['validator-rewards-commission-chart'] || []}
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
        legend={
          <>
            {legends['validator-block-rewards-chart']?.map(legend => (
              <LegendItem
                key={legend.label}
                label={legend.label}
                color={legend.color}
                shape="square"
                onClick={() => handleLegendClick('validator-block-rewards-chart', legend.label)}
                onDoubleClick={() => handleLegendDoubleClick('validator-block-rewards-chart', legend.label)}
                inactive={(hiddenSeries['validator-block-rewards-chart'] || []).includes(legend.fieldId || legend.label)}
              />
            ))}
          </>
        }
        legendWidth="1/6"
      >
        <SimpleBarChart
          chartConfig={blockRewardsChartConfig}
          data={chartData}
          height={300}
          maxXAxisTicks={8}
          yAxisUnit="SOL"
          hiddenSeries={hiddenSeries['validator-block-rewards-chart'] || []}
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
          legend={
            <>
              {legends['validator-reward-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape={getRewardTabInfo(activeRewardTab).chartType === 'line' ? "circle" : "square"}
                  onClick={() => handleLegendClick('validator-reward-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-reward-chart', legend.label)}
                  inactive={(hiddenSeries['validator-reward-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          {getRewardTabInfo(activeRewardTab).chartType === 'line' ? (
            <MultiSeriesLineBarChart
              chartConfig={rewardChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getRewardTabInfo(activeRewardTab).unit}
              hiddenSeries={hiddenSeries['validator-reward-chart'] || []}
            />
          ) : (
            <SimpleBarChart
              chartConfig={rewardChartConfig}
              data={chartData}
              height={400}
              maxXAxisTicks={8}
              yAxisUnit={getRewardTabInfo(activeRewardTab).unit}
              hiddenSeries={hiddenSeries['validator-reward-chart'] || []}
            />
          )}
        </ChartCard>
        {/* Reward Rate Analysis Chart */}
        <ChartCard
          title="Reward Rate by Epoch"
          description="Average, median, and maximum percentage yield on staked SOL for this validator, per epoch."
          isLoading={isLoading}
          chart={rewardRateChartConfig}
          chartData={chartData}
          info={{
            title: 'Reward Rate by Epoch',
            description: 'Comparison of average, median, and maximum staking reward rates per epoch for delegators. Shows staking yield efficiency and variance.'
          }}
          legend={
            <>
              {legends['validator-reward-rate-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="circle"
                  onClick={() => handleLegendClick('validator-reward-rate-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-reward-rate-chart', legend.label)}
                  inactive={(hiddenSeries['validator-reward-rate-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <MultiSeriesLineBarChart
            chartConfig={rewardRateChartConfig}
            data={chartData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit="%"
            hiddenSeries={hiddenSeries['validator-reward-rate-chart'] || []}
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
