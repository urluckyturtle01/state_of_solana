"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Counter from '@/app/components/shared/Counter';
import ChartCard from '@/app/components/shared/ChartCard';
import MultiSeriesLineBarChart from '@/app/admin/components/charts/MultiSeriesLineBarChart';
import LadderChart, { LadderChartData } from '@/app/admin/components/charts/LadderChart';
import LegendItem from '@/app/components/shared/LegendItem';
import { getColorByIndex } from '@/app/utils/chartColors';
import { useChartDownload } from '@/app/validators/components/useChartDownload';

interface ValidatorPerformanceData {
  vote_account: string;
  total_stakers: number;
  total_stake: number;
  total_commission_collected: number;
 staking_reward: number;
  block_rewards_sol: number;
  top_01pct: number;
  top_1pct: number;
  top_5pct: number;
  top_10pct: number;
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
  const defaultVoteAccount = 'he1iusunGwqrNtafDtLdhsUQDFvo13z9sUa36PauBtk';
  const voteAccountFromUrl = searchParams.get('voteAccount');
  
  const [selectedVoteAccount, setSelectedVoteAccount] = useState<string>(
    voteAccountFromUrl || defaultVoteAccount
  );
  const [data, setData] = useState<ValidatorPerformanceData[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativePercentageData[]>([]);
  const [selectedCumulativeEpoch, setSelectedCumulativeEpoch] = useState<number | null>(null);
  const [selectedLadderEpoch, setSelectedLadderEpoch] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCumulativeLoading, setIsCumulativeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cumulativeError, setCumulativeError] = useState<string | null>(null);
  
  // Legend state
  const [legends, setLegends] = useState<Record<string, Array<{label: string; color: string; value?: number; fieldId?: string}>>>({});
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});

  // Download functionality
  const { downloadCSV, isDownloading } = useChartDownload();

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
        if (sortedData.length > 0) {
          setSelectedLadderEpoch((prev) => prev ?? sortedData[0].epoch);
        }
        
        // Set the latest epoch for cumulative chart if not already set
        if (sortedData.length > 0) {
          setSelectedCumulativeEpoch((prev) => prev ?? sortedData[0].epoch);
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

  // Fetch validator data when vote account changes
  useEffect(() => {
    if (selectedVoteAccount) {
      fetchValidatorData(selectedVoteAccount);
    }
  }, [selectedVoteAccount, fetchValidatorData]);

  // Fetch cumulative data when vote account or epoch changes
  useEffect(() => {
    if (selectedVoteAccount && selectedCumulativeEpoch !== null) {
      fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch);
    }
  }, [selectedCumulativeEpoch, selectedVoteAccount, fetchCumulativeData]);

  // Get latest epoch data
  const latestData = data.length > 0 ? data[0] : null;

  // Get available epochs for ladder chart
  const availableEpochs = useMemo(() => {
    return data.map(d => d.epoch).sort((a, b) => b - a);
  }, [data]);

  // Get max available epoch
  const maxEpoch = useMemo(() => {
    return availableEpochs.length > 0 ? availableEpochs[0] : null;
  }, [availableEpochs]);

  // Handler for cumulative epoch change with validation
  const handleCumulativeEpochChange = useCallback((value: string) => {
    const numValue = Number(value);
    if (value === '' || isNaN(numValue)) {
      setSelectedCumulativeEpoch(null);
      return;
    }
    if (maxEpoch !== null && numValue > maxEpoch) {
      setSelectedCumulativeEpoch(maxEpoch);
    } else {
      setSelectedCumulativeEpoch(numValue);
    }
  }, [maxEpoch]);

  // Handler for ladder epoch change with validation
  const handleLadderEpochChange = useCallback((value: string) => {
    const numValue = Number(value);
    if (value === '' || isNaN(numValue)) {
      setSelectedLadderEpoch(null);
      return;
    }
    if (maxEpoch !== null && numValue > maxEpoch) {
      setSelectedLadderEpoch(maxEpoch);
    } else {
      setSelectedLadderEpoch(numValue);
    }
  }, [maxEpoch]);

  // Convert data to ladder chart format for selected epoch
  const ladderChartData: LadderChartData[] = useMemo(() => {
    if (!selectedLadderEpoch || !data.length) return [];
    
    const epochData = data.find(d => Number(d.epoch) === Number(selectedLadderEpoch));
    if (!epochData) {
      //console.log('Epoch not found:', selectedLadderEpoch, 'Available epochs:', data.map(d => d.epoch));
      return [];
    }

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
  }, [data, selectedLadderEpoch]);

  // Update legends when data changes
  useEffect(() => {
    if (cumulativeData && cumulativeData.length > 0) {
      // Cumulative Stake Distribution (single series)
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

    // Ladder chart legends
    if (ladderChartData && ladderChartData.length > 0) {
      const ladderLegends = ladderChartData.map((item, index) => ({
        label: item.label || item.category,
        color: getColorByIndex(index),
        value: item.value,
        fieldId: item.label || item.category  // For ladder charts, use the label as the field ID
      }));
      
      setLegends(prev => ({
        ...prev,
        'validator-ladder-chart': ladderLegends
      }));
    }
  }, [cumulativeData, ladderChartData]);

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

  // Download handlers
  const handleDownloadCumulativeData = useCallback(() => {
    downloadCSV({
      filename: `cumulative_stake_distribution_epoch_${selectedCumulativeEpoch}`,
      data: cumulativeData,
      chartTitle: 'Cumulative Stake Distribution',
      columns: ['epoch', 'cumulative_pct_stakers', 'cumulative_pct_stake', 'vote_account']
    });
  }, [cumulativeData, selectedCumulativeEpoch, downloadCSV]);

  const handleDownloadLadderData = useCallback(() => {
    downloadCSV({
      filename: `stake_concentration_ladder_epoch_${selectedLadderEpoch}`,
      data: ladderChartData,
      chartTitle: 'Concentration Ladder Chart',
      columns: ['category', 'value', 'label']
    });
  }, [ladderChartData, selectedLadderEpoch, downloadCSV]);

  // Chart configurations
  const cumulativeChartConfig = {
    id: 'validator-cumulative-chart',
    title: 'Cumulative Stake Distribution',
    subtitle: `Epoch ${selectedCumulativeEpoch || 'N/A'} - Vote Account: ${selectedVoteAccount.slice(0, 8)}...`,
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
          value={isLoading ? "Loading..." : latestData ? Math.floor(latestData.total_stakers).toLocaleString() : "0"}
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
          value={isLoading ? "Loading..." : latestData ? `${(latestData.total_commission_collected + latestData.staking_reward).toFixed(2)} SOL` : "0 SOL"}
          icon={
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          {selectedCumulativeEpoch !== null && (
            <button
              onClick={() => fetchCumulativeData(selectedVoteAccount, selectedCumulativeEpoch)}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Charts Row: Cumulative Distribution & Concentration Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Cumulative Stake Distribution Chart */}
        <ChartCard
          title={cumulativeChartConfig.title}
          description={`This chart shows how a validator's active  stake is distributed across its stakers in epoch ${selectedCumulativeEpoch || 'N/A'}`}
          isLoading={isCumulativeLoading}
          chart={cumulativeChartConfig}
          chartData={cumulativeData}
          showSummarizeButton={false}
          onDownloadClick={handleDownloadCumulativeData}
          isDownloading={isDownloading}
          info={{
            title: 'Cumulative Stake Distribution',
            description: "For the selected validator, sort stake accounts from largest to smallest stake and plot the cumulative % of stakers (x-axis) against the cumulative % of that validator's total stake (y-axis)."
          }}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-regular text-gray-600">Epoch</label>
                <input
                  type="number"
                  value={selectedCumulativeEpoch || ''}
                  onChange={(e) => handleCumulativeEpochChange(e.target.value)}
                  max={maxEpoch || undefined}
                  className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-sm text-sm text-gray-400 focus:outline-none w-16"
                />
              </div>
        </div>
          }
          legend={
            <>
              {legends['validator-cumulative-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="circle"
                  onClick={() => handleLegendClick('validator-cumulative-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-cumulative-chart', legend.label)}
                  inactive={(hiddenSeries['validator-cumulative-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <MultiSeriesLineBarChart
            chartConfig={cumulativeChartConfig}
            data={cumulativeData}
            height={400}
            maxXAxisTicks={8}
            yAxisUnit="%"
            xAxisMax={100}
            yAxisMax={100}
            //xAxisLogarithmic={true}
            //yAxisLogarithmic={true}
            hiddenSeries={hiddenSeries['validator-cumulative-chart'] || []}
          />
        </ChartCard>

        {/* Concentration Ladder Chart */}
        <ChartCard
          title="Stake Concentration Ladder"
          description={`Distribution of staked SOL size concentration for a particular validator in epoch ${selectedLadderEpoch || 'N/A'}`}
          isLoading={isLoading}
          chart={ladderChartConfig}
          chartData={ladderChartData}
          showSummarizeButton={false}
          onDownloadClick={handleDownloadLadderData}
          isDownloading={isDownloading}
          info={{
            title: 'Concentration Ladder Chart',
            description: 'For the selected validator, rank accounts by stake and show what percentage of total stake is held by the top 0.1%, 1%, 5%, and 10% of stakers.'
          }}
          filterBar={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
              <label className="text-xs font-regular text-gray-600">Epoch</label>
                <input
                  type="number"
                  value={selectedLadderEpoch || ''}
                  onChange={(e) => handleLadderEpochChange(e.target.value)}
                  max={maxEpoch || undefined}
                  className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-sm text-sm text-gray-400 focus:outline-none w-16"
                />
              </div>
        </div>
          }
          legend={
            <>
              {legends['validator-ladder-chart']?.map(legend => (
                <LegendItem
                  key={legend.label}
                  label={legend.label}
                  color={legend.color}
                  shape="square"
                  onClick={() => handleLegendClick('validator-ladder-chart', legend.label)}
                  onDoubleClick={() => handleLegendDoubleClick('validator-ladder-chart', legend.label)}
                  inactive={(hiddenSeries['validator-ladder-chart'] || []).includes(legend.fieldId || legend.label)}
                />
              ))}
            </>
          }
          legendWidth="1/6"
        >
          <LadderChart
            chartConfig={ladderChartConfig}
            data={ladderChartData}
            height={300}
            yAxisUnit="%"
            selectedEpoch={selectedLadderEpoch || undefined}
            hiddenSeries={hiddenSeries['validator-ladder-chart'] || []}
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
