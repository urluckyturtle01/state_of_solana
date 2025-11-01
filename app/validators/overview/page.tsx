"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Counter from '@/app/components/shared/Counter';
import ChartCard from '@/app/components/shared/ChartCard';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import LadderChart, { LadderChartData } from '@/app/admin/components/charts/LadderChart';

interface ValidatorPerformanceData {
  vote_account: string;
  total_stakers: number;
  total_stake: number;
  total_commission_collected: number;
  total_rewards_distributed: number;
  block_rewards_sol: number;
  top_01pct_concentration: number;
  top_1pct_concentration: number;
  top_5pct_concentration: number;
  top_10pct_concentration: number;
  epoch: number;
  [key: string]: any;
}

interface CumulativePercentageData {
  cumulative_pct_stakers: number;
  cumulative_pct_stake: number;
  epoch: number;
  vote_account: string;
}

function ValidatorsOverviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get vote account from URL params or use default
  const defaultVoteAccount = 'xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v';
  const voteAccountFromUrl = searchParams.get('voteAccount');
  
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    voteAccountFromUrl || defaultVoteAccount
  );
  const [data, setData] = useState<ValidatorPerformanceData[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativePercentageData[]>([]);
  const [selectedCumulativeEpoch, setSelectedCumulativeEpoch] = useState<number>(870);
  const [selectedLadderEpoch, setSelectedLadderEpoch] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCumulativeLoading, setIsCumulativeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cumulativeError, setCumulativeError] = useState<string | null>(null);

  // Fetch validator data
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
        // Sort data by epoch descending to get latest first
        const sortedData = result.data.sort((a: ValidatorPerformanceData, b: ValidatorPerformanceData) => b.epoch - a.epoch);
        setData(sortedData);
        
        // Set the latest epoch for ladder chart if not already set
        if (!selectedLadderEpoch && sortedData.length > 0) {
          setSelectedLadderEpoch(sortedData[0].epoch);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching validator data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLadderEpoch]);

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

  // Set default vote account in URL on initial load if not present
  useEffect(() => {
    const voteAccountParam = searchParams.get('voteAccount');
    if (!voteAccountParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('voteAccount', defaultVoteAccount);
      router.replace(`/validators/overview?${params.toString()}`, { scroll: false });
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
      fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch);
    }
  }, [selectedVoteAccount, fetchValidatorData, fetchCumulativeData, selectedCumulativeEpoch]);

  // Fetch cumulative data when epoch changes
  useEffect(() => {
    if (selectedVoteAccount && selectedCumulativeEpoch) {
      fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch);
    }
  }, [selectedCumulativeEpoch, selectedVoteAccount, fetchCumulativeData]);

  // Get latest epoch data
  const latestData = data.length > 0 ? data[0] : null;

  // Get available epochs for ladder chart
  const availableEpochs = useMemo(() => {
    return data.map(d => d.epoch).sort((a, b) => b - a);
  }, [data]);

  // Convert data to ladder chart format for selected epoch
  const ladderChartData: LadderChartData[] = useMemo(() => {
    if (!selectedLadderEpoch || !data.length) return [];
    
    const epochData = data.find(d => d.epoch === selectedLadderEpoch);
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
  }, [data, selectedLadderEpoch]);

  // Chart configurations
  const cumulativeChartConfig = {
    id: 'validator-cumulative-chart',
    title: 'Cumulative Stake Distribution',
    subtitle: `Epoch ${selectedCumulativeEpoch} - Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-overview' as const,
    chartType: 'line' as const,
    apiEndpoint: '/api/validators/cumulative',
    dataMapping: {
      xAxis: 'cumulative_pct_stakers',
      yAxis: { field: 'cumulative_pct_stake', type: 'line' as const, unit: '%' },
      yAxisUnit: '%'
    },
    additionalOptions: {
      showTooltipTotal: false,
      enableTimeAggregation: false
    }
  };

  const ladderChartConfig = {
    id: 'validator-ladder-chart',
    title: 'Concentration Ladder Chart',
    subtitle: `Epoch ${selectedLadderEpoch || 'N/A'} - Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
    page: 'validators-overview' as const,
    chartType: 'bar' as const,
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

      {/* Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Counter
          title="Total Stakers"
          value={isLoading ? "Loading..." : latestData ? latestData.total_stakers.toLocaleString() : "0"}
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          variant="blue"
          isLoading={isLoading}
        />

        <Counter
          title="Total Stake"
          value={isLoading ? "Loading..." : latestData ? `${(latestData.total_stake / 1000000).toFixed(2)}M SOL` : "0 SOL"}
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          variant="emerald"
          isLoading={isLoading}
        />

        <Counter
          title="Inflation Rewards"
          value={isLoading ? "Loading..." : latestData ? `${(latestData.total_commission_collected + latestData.total_rewards_distributed).toFixed(2)} SOL` : "0 SOL"}
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          variant="purple"
          isLoading={isLoading}
        />

        <Counter
          title="Block Rewards"
          value={isLoading ? "Loading..." : latestData ? `${latestData.block_rewards_sol.toFixed(2)} SOL` : "0 SOL"}
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          variant="amber"
          isLoading={isLoading}
        />
      </div>

      

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

      {/* Charts Row: Cumulative Distribution & Concentration Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Cumulative Stake Distribution Chart */}
        <ChartCard
          title={cumulativeChartConfig.title}
          description={`Cumulative stake distribution showing percentage relationship for epoch ${selectedCumulativeEpoch}`}
          isLoading={isCumulativeLoading}
          chart={cumulativeChartConfig}
          chartData={cumulativeData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-regular text-gray-600">Epoch</label>
                <input
                  type="number"
                  value={selectedCumulativeEpoch}
                  onChange={(e) => setSelectedCumulativeEpoch(Number(e.target.value))}
                  className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-sm text-sm text-gray-400 focus:outline-none w-16"
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

        {/* Concentration Ladder Chart */}
        <ChartCard
          title="Concentration Ladder Chart"
          description={`Horizontal bar chart showing concentration levels for epoch ${selectedLadderEpoch || 'N/A'}. Validator: ${selectedVoteAccount.slice(0, 8)}...`}
          isLoading={isLoading}
          chart={ladderChartConfig}
          chartData={ladderChartData}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
              <label className="text-xs font-regular text-gray-600">Epoch</label>
                <input
                  type="number"
                  value={selectedLadderEpoch || ''}
                  onChange={(e) => setSelectedLadderEpoch(Number(e.target.value))}
                  className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-sm text-sm text-gray-400 focus:outline-none w-16"
                />
              </div>
        </div>
          }
        >
          <LadderChart
            chartConfig={ladderChartConfig}
            data={ladderChartData}
            height={300}
            yAxisUnit="%"
            selectedEpoch={selectedLadderEpoch || undefined}
          />
        </ChartCard>
        </div>
    </div>
  );
}

export default function ValidatorsOverviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <ValidatorsOverviewContent />
    </Suspense>
  );
}
