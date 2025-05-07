"use client";

import React, { useState, useEffect } from "react";
import CostCapacityChart, { costCapacityColors } from "../../components/charts/REV/cost-capacity/CostCapacityChart";
import TransactionMetricsChart, { transactionMetricsColors } from "../../components/charts/REV/cost-capacity/TransactionMetricsChart";
import { TimeFilter, CurrencyType, fetchCostCapacityData, formatDate, CostCapacityDataPoint } from "../../api/REV/cost-capacity";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import CurrencyFilter from "../../components/shared/filters/CurrencyFilter";
import DisplayModeFilter, { DisplayMode } from "../../components/shared/filters/DisplayModeFilter";

// Define fee types - MUST match stackKeys used in chart and data
const feeTypes = ['base_fee', 'priority_fee', 'jito_total_tips', 'vote_fees'];

// Define transaction metrics types
const transactionSuccessVolumeTypes = [
  { key: 'successful_transactions_perc', label: 'Success Rate', shape: 'circle', color: transactionMetricsColors.successful_transactions_perc },
  { key: 'successful_non_vote_transactions_perc', label: 'Non-Vote Success Rate', shape: 'circle', color: transactionMetricsColors.successful_non_vote_transactions_perc },
  { key: 'total_vote_transactions', label: 'Vote Transactions', shape: 'square', color: transactionMetricsColors.total_vote_transactions },
  { key: 'total_non_vote_transactions', label: 'Non-Vote Transactions', shape: 'square', color: transactionMetricsColors.total_non_vote_transactions }
];

// Define TPS metrics types
const tpsMetricsTypes = [
  { key: 'total_tps', label: 'Total TPS', shape: 'square', color: '#60a5fa' }, // blue
  { key: 'success_tps', label: 'Success TPS', shape: 'square', color: '#34d399' }, // green
  { key: 'failed_tps', label: 'Failed TPS', shape: 'square', color: '#f43f5e' }, // red
  { key: 'real_tps', label: 'Real TPS', shape: 'square', color: '#a78bfa' } // purple
];

export interface TransactionDataPoint {
  date: string;
  
  // Transaction counts
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_vote_transactions: number;
  total_non_vote_transactions: number;
  successful_vote_transactions: number;
  successful_non_vote_transactions: number;
  failed_vote_transactions: number;
  failed_non_vote_transactions: number;
  
  // Percentages
  successful_transactions_perc: number;
  non_vote_transactions_perc: number;
  successful_non_vote_transactions_perc: number;
  
  // TPS metrics
  total_tps: number;
  success_tps: number;
  failed_tps: number;
  real_tps: number;
  
  // Fee metrics
  total_fees: number;
  non_vote_transactions_fees: number;
  vote_transactions_fees: number;
  priority_fees: number;
}

export default function CostCapacityPage() {
  // State for Transaction Fees chart
  const [feeTimeFilter, setFeeTimeFilter] = useState<TimeFilter>('D');
  const [feeCurrencyFilter, setFeeCurrencyFilter] = useState<CurrencyType>('USD');
  const [feeDisplayMode, setFeeDisplayMode] = useState<DisplayMode>('absolute');
  const [chartModalOpen, setChartModalOpen] = useState(false);
  
  // State for Transaction Success & Volume chart
  const [successVolumeTimeFilter, setSuccessVolumeTimeFilter] = useState<TimeFilter>('M');
  const [successVolumeDisplayMode, setSuccessVolumeDisplayMode] = useState<DisplayMode>('absolute');
  const [successVolumeChartModalOpen, setSuccessVolumeChartModalOpen] = useState(false);
  const [isSuccessVolumeDownloading, setIsSuccessVolumeDownloading] = useState(false);
  
  // State for TPS Metrics chart
  const [tpsTimeFilter, setTpsTimeFilter] = useState<TimeFilter>('M');
  const [tpsDisplayMode, setTpsDisplayMode] = useState<DisplayMode>('absolute');
  const [tpsChartModalOpen, setTpsChartModalOpen] = useState(false);
  const [isTpsDownloading, setIsTpsDownloading] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);

  // Download function - would need to be implemented with actual data export functionality
  const downloadCostCapacityCSV = async () => {
    // Prevent multiple clicks
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Fetch data with current timeFilter and currencyFilter
      const costCapacityData = await fetchCostCapacityData(feeTimeFilter, feeCurrencyFilter);
      
      if (costCapacityData.length === 0) {
        console.error('No cost capacity data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with fee types
      const headers = ["Date", "Base Fee", "Priority Fee", "Jito MEV Tips", "Vote Fees"];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...costCapacityData.map((item: CostCapacityDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, feeTimeFilter);
          // Include all fee metrics in the CSV
          return [
            formattedDate,
            item.base_fee,
            item.priority_fee,
            item.jito_total_tips,
            item.vote_fees
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const currencyText = feeCurrencyFilter === 'USD' ? 'usd' : 'sol';
      const fileName = `solana_transaction_fees_${feeTimeFilter}_${currencyText}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Cost Capacity data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download function for Transaction Success & Volume data
  const downloadSuccessVolumeCSV = async () => {
    // Prevent multiple clicks
    if (isSuccessVolumeDownloading) return;
    
    setIsSuccessVolumeDownloading(true);
    
    try {
      // Import the fetchTransactionsData function
      const { fetchTransactionsData } = await import('../../api/REV/cost-capacity/transactionsData');
      
      // Fetch data with current timeFilter
      const transactionsData = await fetchTransactionsData(successVolumeTimeFilter);
      
      if (transactionsData.length === 0) {
        console.error('No transaction data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with transaction metrics types
      const headers = [
        "Date", 
        "Success Rate (%)", 
        "Non-Vote Success Rate (%)", 
        "Vote Transactions", 
        "Non-Vote Transactions"
      ];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...transactionsData.map((item: TransactionDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, successVolumeTimeFilter);
          // Include all relevant metrics in the CSV
          return [
            formattedDate,
            item.successful_transactions_perc.toFixed(2),
            item.successful_non_vote_transactions_perc.toFixed(2),
            item.total_vote_transactions,
            item.total_non_vote_transactions
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_transaction_volume_${successVolumeTimeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Transaction Success & Volume data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsSuccessVolumeDownloading(false);
    }
  };

  // Download function for TPS Metrics data
  const downloadTpsMetricsCSV = async () => {
    // Prevent multiple clicks
    if (isTpsDownloading) return;
    
    setIsTpsDownloading(true);
    
    try {
      // Import the fetchTransactionsData function
      const { fetchTransactionsData } = await import('../../api/REV/cost-capacity/transactionsData');
      
      // Fetch data with current timeFilter
      const transactionsData = await fetchTransactionsData(tpsTimeFilter);
      
      if (transactionsData.length === 0) {
        console.error('No TPS metrics data available for download');
        alert('No data available to download. Please try a different time range.');
        return;
      }
      
      // Create CSV header with TPS metrics types
      const headers = [
        "Date", 
        "Total TPS", 
        "Success TPS", 
        "Failed TPS", 
        "Real TPS"
      ];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...transactionsData.map((item: TransactionDataPoint) => {
          // Format the date according to the selected time filter
          const formattedDate = formatDate(item.date, tpsTimeFilter);
          // Include all relevant metrics in the CSV
          return [
            formattedDate,
            item.total_tps.toFixed(2),
            item.success_tps.toFixed(2),
            item.failed_tps.toFixed(2),
            item.real_tps.toFixed(2)
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_tps_metrics_${tpsTimeFilter}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading TPS Metrics data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsTpsDownloading(false);
    }
  };

  // Helper function to get display names for fee types
  const getFeeTypeDisplayName = (feeType: string) => {
    switch (feeType) {
      case 'base_fee':
        return 'Base Fee';
      case 'priority_fee':
        return 'Priority Fee';
      case 'jito_total_tips':
        return 'Jito MEV Tips';
      case 'vote_fees':
        return 'Vote Fees';
      default:
        return feeType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  return (
    
    <div className="space-y-6">
      {/* Transaction Fees Chart */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Transaction Fees</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Tracking different fee components in Solana ecosystem</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
              onClick={downloadCostCapacityCSV}
              disabled={isDownloading}
              title="Download Data"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
              onClick={() => setChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* First Divider */}
        <div className="h-px bg-gray-900 w-full"></div>
        {/* Filters */}
        <div className="flex items-center justify-start pl-1 py-2 overflow-x-auto">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Time filter */}
            <TimeFilterSelector 
              value={feeTimeFilter} 
              onChange={(val) => setFeeTimeFilter(val as TimeFilter)}
              options={[
                { value: 'D', label: 'D' },
                { value: 'W', label: 'W' },
                { value: 'M', label: 'M' },
                { value: 'Q', label: 'Q' },
                { value: 'Y', label: 'Y' }
              ]}
            />
            
            {/* Currency filter */}
            <CurrencyFilter 
              currency={feeCurrencyFilter} 
              onChange={(val) => setFeeCurrencyFilter(val)}
              isCompact={true}
            />
            
            {/* Display mode filter */}
            <DisplayModeFilter 
              mode={feeDisplayMode} 
              onChange={(val) => setFeeDisplayMode(val)}
              isCompact={true}
            />
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
        
        {/* Chart container */}
        <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
          <CostCapacityChart
            timeFilter={feeTimeFilter}
            currencyFilter={feeCurrencyFilter}
            displayMode={feeDisplayMode}
            isModalOpen={chartModalOpen}
            onModalClose={() => setChartModalOpen(false)}
            onTimeFilterChange={setFeeTimeFilter}
            onCurrencyChange={setFeeCurrencyFilter}
            onDisplayModeChange={setFeeDisplayMode}
          />
        </div>
        
        {/* Legend */}
        <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
          <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
              {feeTypes.map((key: string) => (
                <div key={key} className="flex items-start">
                  <div 
                    className="w-2 h-2 rounded-sm mr-2 mt-0.5" 
                    style={{ backgroundColor: costCapacityColors[key as keyof typeof costCapacityColors] || '#ccc' }}
                  ></div>
                  <span className="text-xs text-gray-300">{getFeeTypeDisplayName(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Transaction Success & Volume Chart */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Transaction Success & Volume</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Success rates and transaction volumes</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isSuccessVolumeDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'} rounded-md transition-colors`}
              onClick={downloadSuccessVolumeCSV}
              disabled={isSuccessVolumeDownloading}
              title="Download Data"
            >
              {isSuccessVolumeDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
              onClick={() => setSuccessVolumeChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          {/* Chart container */}
          <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
            <TransactionMetricsChart
              timeFilter={successVolumeTimeFilter}
              displayMode={successVolumeDisplayMode}
              isModalOpen={successVolumeChartModalOpen}
              onModalClose={() => setSuccessVolumeChartModalOpen(false)}
              onTimeFilterChange={setSuccessVolumeTimeFilter}
              onDisplayModeChange={setSuccessVolumeDisplayMode}
              chartType="success-volume"
            />
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                {transactionSuccessVolumeTypes.map((type) => (
                  <div key={type.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 mt-0.5 ${type.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`} 
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TPS Metrics Chart */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">TPS Metrics</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Transactions per second over time</p>
          </div>
          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Download button */}
            <button 
              className={`p-1.5 ${isTpsDownloading ? 'opacity-50 cursor-not-allowed' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'} rounded-md transition-colors`}
              onClick={downloadTpsMetricsCSV}
              disabled={isTpsDownloading}
              title="Download Data"
            >
              {isTpsDownloading ? (
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
            
            {/* Expand button */}
            <button 
              className="p-1.5 bg-purple-500/10 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors"
              onClick={() => setTpsChartModalOpen(true)}
              title="Expand Chart"
            >
              <ExpandIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          {/* Chart container */}
          <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
            <TransactionMetricsChart
              timeFilter={tpsTimeFilter}
              displayMode={tpsDisplayMode}
              isModalOpen={tpsChartModalOpen}
              onModalClose={() => setTpsChartModalOpen(false)}
              onTimeFilterChange={setTpsTimeFilter}
              onDisplayModeChange={setTpsDisplayMode}
              chartType="tps"
            />
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible">
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                {tpsMetricsTypes.map((type) => (
                  <div key={type.key} className="flex items-start">
                    <div 
                      className={`w-2 h-2 mr-2 mt-0.5 ${type.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`} 
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span className="text-xs text-gray-300">{type.label}</span>
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