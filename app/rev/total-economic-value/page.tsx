"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchEconomicValueData, EconomicValueDataPoint } from "../../api/REV/total-economic-value/economicValue";
import { fetchYearlyEconomicValueData, YearlyEconomicValueDataPoint } from "../../api/REV/total-economic-value/yearlyEconomicValue";
import CurrencyFilter from "../../components/shared/filters/CurrencyFilter";
import TimeFilter from "../../components/shared/filters/TimeFilter";
import { ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import Loader from "../../components/shared/Loader";
import EconomicValueChart, { stackKeys, getValueTypeDisplayName, getValueTypeColor } from "../../components/charts/REV/total-economic-value/EconomicValueChart";

type TimeView = 'Q' | 'Y';
type SortDirection = 'asc' | 'desc';
type SortColumn = 'year' | 'quarter' | 'base_fee' | 'priority_fee' | 'vote_fees' | 'total_jito_tips' | 'sol_issuance' | 'real_economic_value' | 'total_economic_value';

export default function TotalEconomicValuePage() {
  // Quarterly data state
  const [quarterlyData, setQuarterlyData] = useState<EconomicValueDataPoint[]>([]);
  const [quarterlyLoading, setQuarterlyLoading] = useState<boolean>(true);
  const [quarterlyError, setQuarterlyError] = useState<string | null>(null);
  
  // Yearly data state
  const [yearlyData, setYearlyData] = useState<YearlyEconomicValueDataPoint[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState<boolean>(true);
  const [yearlyError, setYearlyError] = useState<string | null>(null);
  
  // Shared state
  const [tableCurrency, setTableCurrency] = useState<'USD' | 'SOL'>('USD');
  const [chartCurrency, setChartCurrency] = useState<'USD' | 'SOL'>('USD');
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeView, setTimeView] = useState<TimeView>('Y');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('year');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Modal state for expanded chart
  const [chartModalOpen, setChartModalOpen] = useState(false);

  // Download function for Economic Value Chart data
  const downloadCSV = async () => {
    // Prevent multiple clicks
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Fetch data depending on which view is active
      const { fetchEconomicValueChartData } = await import('../../api/REV/total-economic-value/economicValueChart');
      const data = await fetchEconomicValueChartData();
      
      if (data.length === 0) {
        console.error('No economic value data available for download');
        alert('No data available to download.');
        return;
      }
      
      // Create CSV header
      const headers = [
        "Year", 
        "Real Economic Value (SOL)", 
        "Total Economic Value (SOL)",
        "Real Economic Value (USD)", 
        "Total Economic Value (USD)"
      ];
      
      // Convert data to CSV rows
      const csvRows = [
        headers.join(","), // CSV header row
        ...data.map((item) => {
          return [
            item.year,
            item.real_economic_value,
            item.total_economic_value,
            item.real_economic_value_usd,
            item.total_economic_value_usd
          ].join(",");
        })
      ];
      
      // Create the full CSV content
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      const fileName = `solana_economic_value_${chartCurrency}_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading economic value data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Fetch quarterly data
  useEffect(() => {
    async function loadQuarterlyData() {
      setQuarterlyLoading(true);
      setQuarterlyError(null);
      try {
        const economicData = await fetchEconomicValueData();
        setQuarterlyData(economicData);
      } catch (err) {
        console.error('Error loading quarterly economic value data:', err);
        setQuarterlyError('Failed to load quarterly economic value data');
      } finally {
        setQuarterlyLoading(false);
      }
    }

    loadQuarterlyData();
  }, []);

  // Fetch yearly data
  useEffect(() => {
    async function loadYearlyData() {
      setYearlyLoading(true);
      setYearlyError(null);
      try {
        const yearlyData = await fetchYearlyEconomicValueData();
        setYearlyData(yearlyData);
      } catch (err) {
        console.error('Error loading yearly economic value data:', err);
        setYearlyError('Failed to load yearly economic value data');
      } finally {
        setYearlyLoading(false);
      }
    }

    loadYearlyData();
  }, []);

  // Format large numbers with commas and limit decimal places
  const formatNumber = (value: number, isUSD = false) => {
    if (isUSD) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Determine if data is loading based on time view
  const isLoading = timeView === 'Y' ? yearlyLoading : quarterlyLoading;
  
  // Determine if there's an error based on time view
  const activeError = timeView === 'Y' ? yearlyError : quarterlyError;

  // Options for the TimeFilter
  const timeFilterOptions = [
    { value: 'Q', label: 'Q' },
    { value: 'Y', label: 'Y' }
  ];

  // Handle sort click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking on the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending for most columns, ascending for 'quarter'
      setSortColumn(column);
      setSortDirection(column === 'quarter' ? 'asc' : 'desc');
    }
  };

  // Get sorted data
  const sortedYearlyData = useMemo(() => {
    if (!yearlyData.length) return [];
    
    const sorted = [...yearlyData].sort((a, b) => {
      // Choose the correct property based on currency
      const propSuffix = tableCurrency === 'USD' ? '_usd' : '';
      const columnKey = sortColumn === 'quarter' ? sortColumn : 
        (sortColumn.includes('_') ? `${sortColumn}${propSuffix}` : sortColumn);
      
      // Get values to compare
      const aVal = a[columnKey as keyof YearlyEconomicValueDataPoint];
      const bVal = b[columnKey as keyof YearlyEconomicValueDataPoint];
      
      // Compare based on direction
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return sorted;
  }, [yearlyData, sortColumn, sortDirection, tableCurrency]);

  // Get sorted quarterly data
  const sortedQuarterlyData = useMemo(() => {
    if (!quarterlyData.length) return [];
    
    const sorted = [...quarterlyData].sort((a, b) => {
      // For year+quarter combined sorting
      if (sortColumn === 'year' && sortDirection === 'desc') {
        // First sort by year descending
        if (a.year !== b.year) {
          return b.year - a.year;
        }
        // Then by quarter descending
        return b.quarter - a.quarter;
      } else if (sortColumn === 'year' && sortDirection === 'asc') {
        // First sort by year ascending
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        // Then by quarter ascending
        return a.quarter - b.quarter;
      } else if (sortColumn === 'quarter') {
        // For quarter sorting, keep years grouped
        if (a.year !== b.year) {
          return sortDirection === 'desc' ? b.year - a.year : a.year - b.year;
        }
        return sortDirection === 'desc' ? b.quarter - a.quarter : a.quarter - b.quarter;
      }
      
      // For other columns
      const propSuffix = tableCurrency === 'USD' ? '_usd' : '';
      const columnKey = sortColumn.includes('_') ? `${sortColumn}${propSuffix}` : sortColumn;
      
      // Get values to compare
      const aVal = a[columnKey as keyof EconomicValueDataPoint];
      const bVal = b[columnKey as keyof EconomicValueDataPoint];
      
      // Compare based on direction
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return sorted;
  }, [quarterlyData, sortColumn, sortDirection, tableCurrency]);

  // Render sort indicator
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    
    return (
      <span className="ml-1 text-blue-400">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // The table headers with sorting
  const renderColumnHeader = (column: SortColumn, label: string, align: string = 'right') => (
    <th 
      className={`px-3 py-2 text-${align} text-[10px] font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors`}
      onClick={() => handleSort(column)}
    >
      {label}
      {renderSortIndicator(column)}
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Economic Value Chart */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Total Economic Value</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Yearly economic value of Solana</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors"
              onClick={downloadCSV}
              title="Download CSV"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
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
        
        {/* Filters Area */}
        <div className="flex items-center gap-3 pl-1 py-2 overflow-x-auto">
          <CurrencyFilter
            currency={chartCurrency}
            onChange={(value) => setChartCurrency(value)}
            isCompact={true}
          />
        </div>
        
        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>
        
        {/* Chart with Legend in flex layout */}
        <div className="flex flex-col lg:flex-row h-[360px] lg:h-80">
          {/* Chart container */}
          <div className="flex-grow lg:pr-3 lg:border-r lg:border-gray-900 h-80 lg:h-auto">
            <EconomicValueChart 
              currency={chartCurrency} 
              isModalOpen={chartModalOpen}
              onModalClose={() => setChartModalOpen(false)}
              onCurrencyChange={(value) => setChartCurrency(value)}
            />
          </div>
          
          {/* Legend */}
          <div className="w-full lg:w-1/5 mt-2 lg:mt-0 lg:pl-3 flex flex-row lg:flex-col">
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-3 pt-1 pb-2 lg:pb-0">
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-3">
                {/* Legend items */}
                {stackKeys.map((key) => (
                  <div key={key} className="flex items-start">
                    <div 
                      className="w-2 h-2 rounded-sm mr-2 mt-0.5" 
                      style={{ backgroundColor: getValueTypeColor(key, chartCurrency) }}
                    ></div>
                    <span className="text-xs text-gray-300">{getValueTypeDisplayName(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Economic Value Table with Time Filter */}
      <div className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg hover:shadow-blue-900/20 transition-all duration-300">
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">Total Economic Value Data</h2>
            <p className="text-gray-500 text-[10px] tracking-wide">Detailed analysis of Solana's economic value</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className={`p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={downloadCSV}
              title="Download CSV"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {/* First Divider */}
        <div className="h-px bg-gray-900 w-full"></div>
        
        {/* Filters Space */}
        <div className="flex items-center gap-3 pl-1 py-2 overflow-x-auto">
          <div className="flex items-center space-x-3">
            
            <TimeFilter
              value={timeView}
              onChange={(value) => setTimeView(value as TimeView)}
              options={timeFilterOptions}
            />
          </div>
          <CurrencyFilter
            currency={tableCurrency}
            onChange={(value) => setTableCurrency(value)}
            isCompact={true}
          />
        </div>
        
        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full mb-3"></div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader size="sm" />
          </div>
        ) : activeError ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-red-400 text-[12px]">{activeError}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {timeView === 'Y' ? (
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900/50">
                  <tr>
                    {renderColumnHeader('year', 'Year', 'left')}
                    {renderColumnHeader('base_fee', 'Base Fee')}
                    {renderColumnHeader('priority_fee', 'Priority Fee')}
                    {renderColumnHeader('vote_fees', 'Vote Fees')}
                    {renderColumnHeader('total_jito_tips', 'Jito Tips')}
                    {renderColumnHeader('sol_issuance', 'SOL Issuance')}
                    {renderColumnHeader('real_economic_value', 'Real Economic Value')}
                    {renderColumnHeader('total_economic_value', 'Total Economic Value')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {sortedYearlyData.map((row, idx) => (
                    <tr key={`yearly-${row.year}`} className={idx % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/10'}>
                      <td className="px-3 py-2 text-[11px] font-medium text-gray-300">{row.year}</td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.base_fee_usd, true) : formatNumber(row.base_fee)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.priority_fee_usd, true) : formatNumber(row.priority_fee)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.vote_fees_usd, true) : formatNumber(row.vote_fees)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.total_jito_tips_usd, true) : formatNumber(row.total_jito_tips)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.sol_issuance_usd, true) : formatNumber(row.sol_issuance)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.real_economic_value_usd, true) : formatNumber(row.real_economic_value)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right font-medium text-gray-100">
                        {tableCurrency === 'USD' ? formatNumber(row.total_economic_value_usd, true) : formatNumber(row.total_economic_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900/50">
                  <tr>
                    {renderColumnHeader('year', 'Year', 'left')}
                    {renderColumnHeader('quarter', 'Quarter', 'left')}
                    {renderColumnHeader('base_fee', 'Base Fee')}
                    {renderColumnHeader('priority_fee', 'Priority Fee')}
                    {renderColumnHeader('vote_fees', 'Vote Fees')}
                    {renderColumnHeader('total_jito_tips', 'Jito Tips')}
                    {renderColumnHeader('sol_issuance', 'SOL Issuance')}
                    {renderColumnHeader('real_economic_value', 'Real Economic Value')}
                    {renderColumnHeader('total_economic_value', 'Total Economic Value')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {sortedQuarterlyData.map((row, idx) => (
                    <tr key={`quarterly-${row.year}-${row.quarter}`} className={idx % 2 === 0 ? 'bg-black/30' : 'bg-gray-900/10'}>
                      <td className="px-3 py-2 text-[11px] font-medium text-gray-300">{row.year}</td>
                      <td className="px-3 py-2 text-[11px] text-gray-300">Q{row.quarter}</td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.base_fee_usd, true) : formatNumber(row.base_fee)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.priority_fee_usd, true) : formatNumber(row.priority_fee)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.vote_fees_usd, true) : formatNumber(row.vote_fees)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.total_jito_tips_usd, true) : formatNumber(row.total_jito_tips)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.sol_issuance_usd, true) : formatNumber(row.sol_issuance)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-gray-300">
                        {tableCurrency === 'USD' ? formatNumber(row.real_economic_value_usd, true) : formatNumber(row.real_economic_value)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right font-medium text-gray-100">
                        {tableCurrency === 'USD' ? formatNumber(row.total_economic_value_usd, true) : formatNumber(row.total_economic_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
