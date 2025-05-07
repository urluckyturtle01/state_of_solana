"use client";

import React, { useState } from "react";
import CurrencyFilter from "../../components/shared/filters/CurrencyFilter";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import { CurrencyType } from '@/app/api/REV/issuance-burn/issuanceData';
import IssuanceChart, { getIssuanceChartColors, getIssuanceChartMetrics } from '@/app/components/charts/REV/issuance-burn/IssuanceChart';
import RewardsAndBurnChart, { getRewardsAndBurnColors, getRewardsAndBurnChartMetrics } from '@/app/components/charts/REV/issuance-burn/RewardsAndBurnChart';
import IssuanceBreakdownChart, { getIssuanceBreakdownColors, getIssuanceBreakdownChartMetrics } from '@/app/components/charts/REV/issuance-burn/IssuanceBreakdownChart';
import BurnRatioChart, { getBurnRatioColors, getBurnRatioChartMetrics } from '@/app/components/charts/REV/issuance-burn/BurnRatioChart';
import SolBurnChart, { getSolBurnChartColors, getSolBurnChartMetrics } from '@/app/components/charts/REV/issuance-burn/SolBurnChart';

// Get colors from charts for use in UI elements
const issuanceColors = getIssuanceChartColors();
const rewardsAndBurnColors = getRewardsAndBurnColors();
const issuanceBreakdownColors = getIssuanceBreakdownColors();
const burnRatioColors = getBurnRatioColors();
const solBurnColors = getSolBurnChartColors();

// Get metrics/legends from charts
const issuanceMetrics = getIssuanceChartMetrics(issuanceColors);
const rewardsAndBurnMetrics = getRewardsAndBurnChartMetrics(rewardsAndBurnColors);
const issuanceBreakdownMetrics = getIssuanceBreakdownChartMetrics(issuanceBreakdownColors);
const burnRatioMetrics = getBurnRatioChartMetrics(burnRatioColors);
const solBurnMetrics = getSolBurnChartMetrics(solBurnColors);

export default function IssuanceInflationPage() {
  // Individual currency state for each chart
  const [issuanceCurrency, setIssuanceCurrency] = useState<CurrencyType>('USD');
  const [rewardsCurrency, setRewardsCurrency] = useState<CurrencyType>('USD');
  const [breakdownCurrency, setBreakdownCurrency] = useState<CurrencyType>('USD');
  const [burnRatioCurrency, setBurnRatioCurrency] = useState<CurrencyType>('USD');
  const [solBurnCurrency, setSolBurnCurrency] = useState<CurrencyType>('USD');
  
  // Modal states
  const [issuanceModalOpen, setIssuanceModalOpen] = useState(false);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [burnRatioModalOpen, setBurnRatioModalOpen] = useState(false);
  const [solBurnModalOpen, setSolBurnModalOpen] = useState(false);
  
  // Download state tracking
  const [isDownloading, setIsDownloading] = useState({
    issuance: false,
    rewards: false,
    breakdown: false,
    burnRatio: false,
    solBurn: false
  });
  
  // Function to download CSV data
  const downloadCSV = (chartType: string) => {
    // Set the specific chart's downloading state to true
    setIsDownloading(prev => ({ ...prev, [chartType]: true }));
    
    try {
      console.log(`Downloading ${chartType} data as CSV`);
      // Implementation would go here
      
      // Simulate a download delay
      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, [chartType]: false }));
      }, 1000);
    } catch (error) {
      console.error(`Error downloading ${chartType} data:`, error);
      setIsDownloading(prev => ({ ...prev, [chartType]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Charts grid - 2x2 on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* SOL Issuance Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">SOL Issuance</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Gross and net SOL issuance over time</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors ${isDownloading.issuance ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => downloadCSV('issuance')}
                title="Download CSV"
                disabled={isDownloading.issuance}
              >
                {isDownloading.issuance ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
                onClick={() => setIssuanceModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <CurrencyFilter
              currency={issuanceCurrency}
              onChange={(value) => setIssuanceCurrency(value)}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <IssuanceChart 
                currency={issuanceCurrency} 
                isModalOpen={issuanceModalOpen} 
                onModalClose={() => setIssuanceModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                {issuanceMetrics.map(metric => (
                  <div key={metric.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                      style={{ background: metric.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{metric.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SOL Rewards & Burns Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">SOL Rewards & Burns</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Staking rewards, voting rewards, and burns</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors ${isDownloading.rewards ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => downloadCSV('rewards')}
                title="Download CSV"
                disabled={isDownloading.rewards}
              >
                {isDownloading.rewards ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
                onClick={() => setRewardsModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <CurrencyFilter
              currency={rewardsCurrency}
              onChange={(value) => setRewardsCurrency(value)}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <RewardsAndBurnChart 
                currency={rewardsCurrency} 
                isModalOpen={rewardsModalOpen} 
                onModalClose={() => setRewardsModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                {rewardsAndBurnMetrics.map(metric => (
                  <div key={metric.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                      style={{ background: metric.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{metric.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SOL Issuance Breakdown Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-green-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">SOL Issuance Breakdown</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Breakdown of different components of issuance</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors ${isDownloading.breakdown ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => downloadCSV('breakdown')}
                title="Download CSV"
                disabled={isDownloading.breakdown}
              >
                {isDownloading.breakdown ? (
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-green-500/10 rounded-md text-green-400 hover:bg-green-500/20 transition-colors"
                onClick={() => setBreakdownModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <CurrencyFilter
              currency={breakdownCurrency}
              onChange={(value) => setBreakdownCurrency(value)}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <IssuanceBreakdownChart 
                currency={breakdownCurrency} 
                isModalOpen={breakdownModalOpen} 
                onModalClose={() => setBreakdownModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0 overflow-x-auto lg:overflow-x-visible">
                <div className="flex items-start">
                  <div 
                    className="w-2 h-2 mr-2 rounded-sm mt-0.5"
                    style={{ background: issuanceBreakdownColors.jito }}
                  ></div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">Jito Commission</span>
                </div>
                <div className="flex items-start">
                  <div 
                    className="w-2 h-2 mr-2 rounded-sm mt-0.5"
                    style={{ background: issuanceBreakdownColors.staking }}
                  ></div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">Staking Rewards</span>
                </div>
                <div className="flex items-start">
                  <div 
                    className="w-2 h-2 mr-2 rounded-sm mt-0.5"
                    style={{ background: issuanceBreakdownColors.voting }}
                  ></div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">Voting Rewards</span>
                </div>
                <div className="flex items-start">
                  <div 
                    className="w-2 h-2 mr-2 rounded-sm mt-0.5"
                    style={{ background: issuanceBreakdownColors.gross }}
                  ></div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">Gross Issuance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SOL Burn Ratio Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-red-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">SOL Burn Ratio</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Percentage of SOL burned relative to issuance</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500/20 transition-colors ${isDownloading.burnRatio ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => downloadCSV('burnRatio')}
                title="Download CSV"
                disabled={isDownloading.burnRatio}
              >
                {isDownloading.burnRatio ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
                onClick={() => setBurnRatioModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <CurrencyFilter
              currency={burnRatioCurrency}
              onChange={(value) => setBurnRatioCurrency(value)}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <BurnRatioChart 
                currency={burnRatioCurrency} 
                isModalOpen={burnRatioModalOpen} 
                onModalClose={() => setBurnRatioModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                {burnRatioMetrics.map(metric => (
                  <div key={metric.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                      style={{ background: metric.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{metric.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SOL Burn Chart Container */}
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-red-900/20 transition-all duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="-mt-1">
              <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">SOL Burn Trends</h2>
              <p className="text-gray-500 text-[10px] tracking-wide">Daily SOL burn and cumulative burn amount</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500/20 transition-colors ${isDownloading.solBurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => downloadCSV('solBurn')}
                title="Download CSV"
                disabled={isDownloading.solBurn}
              >
                {isDownloading.solBurn ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
              <button 
                className="p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500/20 transition-colors"
                onClick={() => setSolBurnModalOpen(true)}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* First Divider */}
          <div className="h-px bg-gray-900 w-full"></div>
          
          {/* Filter Space */}
          <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
            <CurrencyFilter
              currency={solBurnCurrency}
              onChange={(value) => setSolBurnCurrency(value)}
              isCompact={true}
            />
          </div>
          
          {/* Second Divider */}
          <div className="h-px bg-gray-900 w-full mb-3"></div>
          
          {/* Content Area - Split into columns */}
          <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
            {/* Chart Area */}
            <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
              <SolBurnChart 
                currency={solBurnCurrency} 
                isModalOpen={solBurnModalOpen} 
                onModalClose={() => setSolBurnModalOpen(false)}
              />
            </div>
            
            {/* Legend area */}
            <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
                {solBurnMetrics.map(metric => (
                  <div key={metric.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 ${metric.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5`}
                      style={{ background: metric.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{metric.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 