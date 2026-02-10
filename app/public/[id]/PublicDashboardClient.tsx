"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ChartCard from "@/app/components/shared/ChartCard";
import TextboxCard from "../../dashboards/components/TextboxCard";

interface SavedChart {
  id: string;
  name: string;
  type: 'bar' | 'stacked' | 'dual' | 'line';
  description?: string;
  createdAt: Date;
  configuration: any;
  chartConfig: any;
  chartData: any[];
  order?: number;
}

interface DashboardTextbox {
  id: string;
  content: string;
  width: 'half' | 'full';
  height?: number;
  createdAt: Date;
  order?: number;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: Date;
  lastModified: Date;
  charts: SavedChart[];
  textboxes: DashboardTextbox[];
  createdBy?: string;
}

interface PublicDashboardClientProps {
  initialDashboard: Dashboard;
}

export default function PublicDashboardClient({ initialDashboard }: PublicDashboardClientProps) {
  const [dashboard] = useState<Dashboard>(initialDashboard);

  // Create combined items array for rendering - sort by order field
  const allItems = useMemo(() => {
    if (!dashboard) return [];
    
    // Combine and sort by order field
    const combined = [
      ...dashboard.charts.map((chart: SavedChart) => ({ ...chart, itemType: 'chart' as const })),
      ...dashboard.textboxes.map((textbox: DashboardTextbox) => ({ ...textbox, itemType: 'textbox' as const }))
    ];
    
    // Sort by order field, with fallback to creation date for items without order
    return combined.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : new Date(a.createdAt).getTime();
      const orderB = b.order !== undefined ? b.order : new Date(b.createdAt).getTime();
      return orderA - orderB;
    });
  }, [dashboard]);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-black text-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-400">Dashboard Not Found</h1>
          <p className="text-gray-400 mt-2">The dashboard you're looking for doesn't exist or is not publicly accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-gray-400 mt-2">{dashboard.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>Created by {dashboard.createdBy || 'Anonymous'}</span>
                <span>•</span>
                <span>Last updated {formatDate(dashboard.lastModified)}</span>
                <span>•</span>
                <span>{dashboard.charts.length} charts, {dashboard.textboxes.length} text blocks</span>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">This dashboard is empty.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {allItems.map((item) => {
              if (item.itemType === 'chart') {
                const chart = item as SavedChart;
                return (
                  <div key={chart.id} className="mb-8">
                                         <ChartCard
                       title={chart.name}
                       description={chart.description}
                       className="bg-gray-900/50 border border-gray-700/50"
                     >
                      <div className="h-96 flex items-center justify-center text-gray-400">
                        Chart rendering placeholder - {chart.type} chart
                      </div>
                    </ChartCard>
                  </div>
                );
              } else {
                const textbox = item as DashboardTextbox;
                return (
                  <div key={textbox.id} className="mb-6">
                    <TextboxCard
                      id={textbox.id}
                      content={textbox.content}
                      width={textbox.width}
                      height={textbox.height}
                    />
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
} 