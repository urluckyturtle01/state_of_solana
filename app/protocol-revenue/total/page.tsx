"use client";

import React, { useState, useCallback } from "react";
import ChartCard from "@/app/components/shared/ChartCard";
import LegendItem from "@/app/components/shared/LegendItem";
import CumulativeRevenueChart from "@/app/components/charts/protocol-revenue/total/CumulativeRevenueChart";
import TopProtocolsRevenueChart from "@/app/components/charts/protocol-revenue/total/TopProtocolsRevenueChart";
import RevenueBySegmentChart from "@/app/components/charts/protocol-revenue/total/RevenueBySegmentChart";
import DappRevenueChart from "@/app/components/charts/protocol-revenue/total/DappRevenueChart";
import TimeFilterSelector from "@/app/components/shared/filters/TimeFilter";
import DisplayModeFilter from "@/app/components/shared/filters/DisplayModeFilter";
import { DisplayMode } from "@/app/components/shared/filters/DisplayModeFilter";
import { TimeFilter } from "@/app/api/protocol-revenue/total/revenueBySegmentData";
import { prepareCumulativeRevenueCSV } from "@/app/api/protocol-revenue/summary/chartData";
import { prepareTopProtocolsCSV } from "@/app/api/protocol-revenue/total/topProtocolsData";
import { prepareRevenueBySegmentCSV } from "@/app/api/protocol-revenue/total/revenueBySegmentData";
import { prepareDappRevenueCSV } from "@/app/api/protocol-revenue/total/dappRevenueData";
import { handleCSVDownload } from "@/app/utils/csvDownload";
import EnhancedDashboardRenderer from "@/app/admin/components/enhanced-dashboard-renderer";

// Ensure we only use the valid time filters for our specific component
type RevenueTimeFilter = 'W' | 'M' | 'Q' | 'Y';

export default function ProtocolRevenueTotalPage() {
  const [timeFilter, setTimeFilter] = useState<RevenueTimeFilter>('M');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');
  const [chartPlatforms, setChartPlatforms] = useState<{platform: string, color: string, revenue: number}[]>([]);
  
  // Chart legend state
  const [cumulativeChartLegends, setCumulativeChartLegends] = useState<{label: string, color: string, value?: number}[]>([
    { label: 'Protocol Revenue', color: '#60a5fa' },
    { label: 'Solana Revenue', color: '#a78bfa' }
  ]);
  
  // Top protocols chart legends
  const [topProtocolsLegends, setTopProtocolsLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Revenue by segment chart legends
  const [revenueBySegmentLegends, setRevenueBySegmentLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Dapp revenue chart legends
  const [dappRevenueLegends, setDappRevenueLegends] = useState<{label: string, color: string, value?: number}[]>([]);
  
  // Modal states
  const [chart1ModalOpen, setChart1ModalOpen] = useState(false);
  const [chart2ModalOpen, setChart2ModalOpen] = useState(false);
  const [chart3ModalOpen, setChart3ModalOpen] = useState(false);
  const [chart4ModalOpen, setChart4ModalOpen] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  // Add download loading state
  const [isCumulativeDownloading, setIsCumulativeDownloading] = useState(false);
  const [isTopProtocolsDownloading, setIsTopProtocolsDownloading] = useState(false);
  const [isRevenueBySegmentDownloading, setIsRevenueBySegmentDownloading] = useState(false);
  const [isDappRevenueDownloading, setIsDappRevenueDownloading] = useState(false);

  // Format currency values
  const formatCurrency = (value?: number) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  };

  // Handle time filter change
  const handleTimeFilterChange = (newFilter: string) => {
    // Ensure we only set valid time filters
    if (newFilter === 'W' || newFilter === 'M' || newFilter === 'Q' || newFilter === 'Y') {
      setTimeFilter(newFilter);
    }
  };

  // Add download function for cumulative revenue chart
  const downloadCumulativeRevenueCSV = async () => {
    if (isCumulativeDownloading) return;
    await handleCSVDownload(
      () => prepareCumulativeRevenueCSV(timeFilter as any), 
      `cumulative-revenue-${timeFilter.toLowerCase()}.csv`,
      setIsCumulativeDownloading
    );
  };

  // Add download function for top protocols revenue chart
  const downloadTopProtocolsCSV = async () => {
    if (isTopProtocolsDownloading) return;
    await handleCSVDownload(
      prepareTopProtocolsCSV,
      `top-protocols-revenue.csv`,
      setIsTopProtocolsDownloading
    );
  };

  // Add download function for revenue by segment chart
  const downloadRevenueBySegmentCSV = async () => {
    if (isRevenueBySegmentDownloading) return;
    await handleCSVDownload(
      () => prepareRevenueBySegmentCSV(timeFilter),
      `revenue-by-segment-${timeFilter.toLowerCase()}.csv`,
      setIsRevenueBySegmentDownloading
    );
  };

  // Add download function for dapp revenue chart
  const downloadDappRevenueCSV = async () => {
    if (isDappRevenueDownloading) return;
    await handleCSVDownload(
      prepareDappRevenueCSV,
      `dapp-revenue.csv`,
      setIsDappRevenueDownloading
    );
  };

  return (
    <main className="pb-12">
    <div className="space-y-4">
     
      <EnhancedDashboardRenderer pageId="total" />
     
      </div>
      {/* dynamic charts and counters from admin section */}
      
    </main>
    
  );
}
