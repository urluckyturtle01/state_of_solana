"use client";

import React, { useState, useEffect } from "react";
import Counter from "../../components/shared/Counter";
import { VolumeIcon, TvlIcon, UsersIcon, ExpandIcon, DownloadIcon } from "../../components/shared/Icons";
import TimeFilterSelector from "../../components/shared/filters/TimeFilter";
import Loader from "../../components/shared/Loader";
import ProtocolRevenueChart from "../../components/charts/protocol-revenue/summary/ProtocolRevenueChart";
import PlatformRevenueChart from "../../components/charts/protocol-revenue/summary/PlatformRevenueChart";
import { getLatestProtocolRevenueStats } from "../../api/protocol-revenue/summary/chartData";
import { TimeFilter } from "../../api/protocol-revenue/summary/chartData";
import { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";

// Define colors for charts
const protocolRevenueColors = {
  base_fee: '#60a5fa', // blue
  priority_fee: '#a78bfa', // purple
  jito_total_tips: '#34d399', // green
  vote_fees: '#f97316', // orange
};

// Helper function to create consistent chart card styles
const ChartCardStyles = {
  container: "bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg transition-all duration-300",
  header: "flex justify-between items-center mb-3",
  titleContainer: "-mt-1",
  title: "text-[12px] font-normal text-gray-300 leading-tight mb-0.5",
  description: "text-gray-500 text-[10px] tracking-wide",
  buttonContainer: "flex space-x-2",
  button: "p-1.5 bg-blue-500/10 rounded-md text-blue-400 hover:bg-blue-500/20 transition-colors",
  divider: "h-px bg-gray-900 w-full",
  filterContainer: "flex items-center gap-3 pl-1 py-2 overflow-x-auto",
  chartContainer: "h-[400px] min-h-[300px] flex items-center justify-center bg-gray-900/20 rounded-lg",
  placeholderText: "text-gray-400"
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
};

export default function ProtocolRevenueSummaryPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [protocolRevenueChartModalOpen, setProtocolRevenueChartModalOpen] = useState(false);
  const [distributionChartModalOpen, setDistributionChartModalOpen] = useState(false);
  const [platformRevenueChartModalOpen, setPlatformRevenueChartModalOpen] = useState(false);
  
  // State for stats
  const [totalProtocolRevenueStats, setTotalProtocolRevenueStats] = useState({
    totalRevenue: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTotalProtocolRevenueLoading, setIsTotalProtocolRevenueLoading] = useState(true);
  
  const [totalSolanaRevenueStats, setTotalSolanaRevenueStats] = useState({
    totalRevenue: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isTotalSolanaRevenueLoading, setIsTotalSolanaRevenueLoading] = useState(true);
  
  const [userCountStats, setUserCountStats] = useState({
    userCount: 0,
    percentChange: 0,
    isPositive: true
  });
  const [isUserCountLoading, setIsUserCountLoading] = useState(true);
  
  // Add state for download button loading
  const [isRevenueDownloading, setIsRevenueDownloading] = useState(false);
  const [isDistributionDownloading, setIsDistributionDownloading] = useState(false);

  // Fetch data for counters
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsTotalProtocolRevenueLoading(true);
        setIsTotalSolanaRevenueLoading(true);
        
        const { 
          totalProtocolRevenue, 
          totalSolanaRevenue, 
          protocolRevenuePercentChange,
          solanaRevenuePercentChange,
          isProtocolRevenueIncreasing,
          isSolanaRevenueIncreasing
        } = await getLatestProtocolRevenueStats();
        
        // Set protocol revenue stats
        setTotalProtocolRevenueStats({
          totalRevenue: totalProtocolRevenue,
          percentChange: protocolRevenuePercentChange,
          isPositive: isProtocolRevenueIncreasing
        });
        setIsTotalProtocolRevenueLoading(false);
        
        // Set Solana revenue stats
        setTotalSolanaRevenueStats({
          totalRevenue: totalSolanaRevenue,
          percentChange: solanaRevenuePercentChange,
          isPositive: isSolanaRevenueIncreasing
        });
        setIsTotalSolanaRevenueLoading(false);
        
        // Set user count stats (can be replaced with real API data later)
        setUserCountStats({
          userCount: 142000,
          percentChange: 8.7,
          isPositive: true
        });
        setIsUserCountLoading(false);
      } catch (error) {
        console.error('Error fetching revenue stats:', error);
        setIsTotalProtocolRevenueLoading(false);
        setIsTotalSolanaRevenueLoading(false);
        setIsUserCountLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  // Format functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };
  
  const formatUserCount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Download functions - to be implemented
  const downloadRevenueCSV = async () => {
    if (isRevenueDownloading) return;
    setIsRevenueDownloading(true);
    
    try {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Downloading revenue data as CSV...');
      // TODO: Implement actual CSV download
      
      alert('CSV download functionality will be implemented soon.');
    } catch (error) {
      console.error('Error downloading revenue data:', error);
    } finally {
      setIsRevenueDownloading(false);
    }
  };
  
  const downloadDistributionCSV = async () => {
    if (isDistributionDownloading) return;
    setIsDistributionDownloading(true);
    
    try {
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Downloading distribution data as CSV...');
      // TODO: Implement actual CSV download
      
      alert('CSV download functionality will be implemented soon.');
    } catch (error) {
      console.error('Error downloading distribution data:', error);
    } finally {
      setIsDistributionDownloading(false);
    }
  };

  return (
    <main className="pb-12">
      <div className="space-y-4">
        {/* Stats Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Protocol Revenue Card */}
          <Counter
            title="Protocol Revenue (Since Jan'24)"
            value={formatCurrency(totalProtocolRevenueStats.totalRevenue)}
            icon={<VolumeIcon />}
            variant="blue"
            isLoading={isTotalProtocolRevenueLoading}
            trend={!isTotalProtocolRevenueLoading ? {
              value: totalProtocolRevenueStats.percentChange,
              label: "vs previous month"
            } : undefined}
          />

          {/* Total Solana Revenue Card */}
          <Counter
            title="Solana Revenue (Since Jan'24)"
            value={formatCurrency(totalSolanaRevenueStats.totalRevenue)}
            icon={<TvlIcon />}
            variant="purple"
            isLoading={isTotalSolanaRevenueLoading}
            trend={!isTotalSolanaRevenueLoading ? {
              value: totalSolanaRevenueStats.percentChange,
              label: "vs previous month"
            } : undefined}
          />

          {/* User Count Card */}
          <Counter
            title="Fee Payers"
            value={formatUserCount(userCountStats.userCount)}
            icon={<UsersIcon />}
            variant="emerald"
            isLoading={isUserCountLoading}
            trend={!isUserCountLoading ? {
              value: userCountStats.percentChange,
              label: "vs previous month"
            } : undefined}
          />
        </section>

        {/* Protocol Revenue Chart */}
        <section className="grid grid-cols-1 gap-4">
          <div className={ChartCardStyles.container + " hover:shadow-blue-900/20"}>
            <div className={ChartCardStyles.header}>
              <div className={ChartCardStyles.titleContainer}>
                <h2 className={ChartCardStyles.title}>Protocol Revenue vs Solana Revenue</h2>
                <p className={ChartCardStyles.description}>Comparison of Protocol Revenue and Solana Revenue over time</p>
              </div>
              <div className={ChartCardStyles.buttonContainer}>
                <button 
                  className={ChartCardStyles.button}
                  onClick={downloadRevenueCSV}
                  title="Download CSV"
                  disabled={isRevenueDownloading}
                >
                  {isRevenueDownloading ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <DownloadIcon className="w-4 h-4" />
                  )}
                </button>
                <button 
                  className={ChartCardStyles.button}
                  onClick={() => setProtocolRevenueChartModalOpen(true)}
                  title="Expand Chart"
                >
                  <ExpandIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* First Divider */}
            <div className={ChartCardStyles.divider}></div>
            
            {/* Filters Area */}
            
            
            {/* Second Divider */}
            
            
            {/* Chart Content */}
            <div className="h-96">
              <ProtocolRevenueChart 
                timeFilter={timeFilter} 
                isModalOpen={protocolRevenueChartModalOpen}
                onModalClose={() => setProtocolRevenueChartModalOpen(false)}
                onTimeFilterChange={setTimeFilter}
              />
            </div>
          </div>
        </section>
        
        {/* Additional Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Distribution Chart */}
          <div className={ChartCardStyles.container + " hover:shadow-purple-900/20"}>
            <div className={ChartCardStyles.header}>
              <div className={ChartCardStyles.titleContainer}>
                <h2 className={ChartCardStyles.title}>Revenue Distribution</h2>
                <p className={ChartCardStyles.description}>Breakdown of protocol revenue by fee type</p>
              </div>
              <div className={ChartCardStyles.buttonContainer}>
                <button 
                  className={ChartCardStyles.button}
                  onClick={downloadDistributionCSV}
                  title="Download CSV"
                  disabled={isDistributionDownloading}
                >
                  {isDistributionDownloading ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <DownloadIcon className="w-4 h-4" />
                  )}
                </button>
                <button 
                  className={ChartCardStyles.button}
                  onClick={() => setDistributionChartModalOpen(true)}
                  title="Expand Chart"
                >
                  <ExpandIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Divider */}
            <div className={ChartCardStyles.divider + " mb-3"}></div>
            
            {/* Chart Content */}
            <div className={ChartCardStyles.chartContainer}>
              <p className={ChartCardStyles.placeholderText}>Revenue distribution chart will be implemented soon</p>
            </div>
          </div>

          {/* Protocol Revenue by Platform Chart */}
          <div className={ChartCardStyles.container + " hover:shadow-emerald-900/20"}>
            <div className={ChartCardStyles.header}>
              <div className={ChartCardStyles.titleContainer}>
                <h2 className={ChartCardStyles.title}>Protocol Revenue by Platform</h2>
                <p className={ChartCardStyles.description}>Breakdown of protocol revenue by platform</p>
              </div>
              <div className={ChartCardStyles.buttonContainer}>
                <button 
                  className={ChartCardStyles.button}
                  onClick={() => setPlatformRevenueChartModalOpen(true)}
                  title="Expand Chart"
                >
                  <ExpandIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Divider */}
            <div className={ChartCardStyles.divider + " mb-3"}></div>
            
            {/* Chart Content */}
            <div className={ChartCardStyles.chartContainer}>
              <div className="h-full w-full">
                <PlatformRevenueChart 
                  timeFilter={timeFilter}
                  displayMode={displayMode}
                  isModalOpen={platformRevenueChartModalOpen}
                  onModalClose={() => setPlatformRevenueChartModalOpen(false)}
                  onTimeFilterChange={setTimeFilter}
                  onDisplayModeChange={setDisplayMode}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
} 