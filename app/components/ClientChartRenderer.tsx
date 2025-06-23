"use client";

import React, { useState, useMemo } from 'react';
import { ChartConfig, CounterConfig, TableConfig } from '@/app/admin/types';
import dynamic from 'next/dynamic';

// Dynamic imports for better performance
const DashboardRenderer = dynamic(() => import('../admin/components/dashboard-renderer'), {
  ssr: false,
  loading: () => <ChartLoadingFallback />
});

const CounterRenderer = dynamic(() => import('../admin/components/CounterRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/50 rounded-lg h-20 w-full"></div>
});

const TableRenderer = dynamic(() => import('../admin/components/TableRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-800/50 rounded-lg h-40 w-full"></div>
});

// Simple loading fallback
const ChartLoadingFallback = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <div className="w-6 h-6 border-2 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
  </div>
);

interface ClientChartRendererProps {
  pageId: string;
  initialCharts: ChartConfig[];
  initialCounters: CounterConfig[];
  initialTables: TableConfig[];
  enableCaching?: boolean;
  section?: string;
}

export default function ClientChartRenderer({
  pageId,
  initialCharts,
  initialCounters,
  initialTables,
  enableCaching = true,
  section
}: ClientChartRendererProps) {
  // State for managing the data
  const [charts] = useState<ChartConfig[]>(initialCharts);
  const [counters] = useState<CounterConfig[]>(initialCounters);
  const [tables] = useState<TableConfig[]>(initialTables);

  // Create combined items array for rendering - sort by order field
  const allItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'chart' | 'counter' | 'table';
      config: ChartConfig | CounterConfig | TableConfig;
      order?: number;
    }> = [];

    // Add charts
    charts.forEach((chart, index) => {
      items.push({
        id: chart.id,
        type: 'chart',
        config: chart,
        order: (chart as any).order || index
      });
    });

    // Add counters
    counters.forEach((counter, index) => {
      items.push({
        id: counter.id,
        type: 'counter',
        config: counter,
        order: (counter as any).order || index + 1000
      });
    });

    // Add tables
    tables.forEach((table, index) => {
      items.push({
        id: table.id,
        type: 'table',
        config: table,
        order: (table as any).order || index + 2000
      });
    });

    // Sort by order field
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [charts, counters, tables]);

  // Filter by section if specified
  const filteredItems = useMemo(() => {
    if (!section) return allItems;
    return allItems.filter(item => {
      // Add section filtering logic here if needed
      return true;
    });
  }, [allItems, section]);

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No content available for this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredItems.map((item) => {
        switch (item.type) {
          case 'chart':
            return (
              <div key={item.id}>
                <DashboardRenderer 
                  pageId={pageId}
                  overrideCharts={[item.config as ChartConfig]}
                  enableCaching={enableCaching}
                />
              </div>
            );
          case 'counter':
            return (
              <div key={item.id}>
                <CounterRenderer counterConfig={item.config as CounterConfig} />
              </div>
            );
          case 'table':
            return (
              <div key={item.id}>
                <TableRenderer tableConfig={item.config as TableConfig} />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
} 