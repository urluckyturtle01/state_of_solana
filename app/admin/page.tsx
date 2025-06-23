"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardRenderer from './components/dashboard-renderer';

// Performance monitoring component
const PerformanceMonitor = () => {
  useEffect(() => {
    // Track page load timing
    const pageStartTime = performance.now();
    console.log(`🏁 [Admin Page] Page component mounted at ${pageStartTime.toFixed(2)}ms`);
    
    // Track DOM ready state
    const trackDOMReady = () => {
      if (document.readyState === 'complete') {
        const domReadyTime = performance.now();
        console.log(`📄 [Admin Page] DOM fully loaded at ${domReadyTime.toFixed(2)}ms`);
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', trackDOMReady);
    } else {
      trackDOMReady();
    }
    
    // Track when all resources are loaded
    const handleLoad = () => {
      const loadCompleteTime = performance.now();
      console.log(`🎯 [Admin Page] All resources loaded at ${loadCompleteTime.toFixed(2)}ms`);
      
      // Navigation timing API for more detailed metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log(`📊 [Admin Page] DETAILED TIMING BREAKDOWN:`);
        console.log(`   🌐 DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
        console.log(`   🔗 TCP Connect: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
        console.log(`   📡 Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`);
        console.log(`   📥 Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`);
        console.log(`   📄 DOM Parse: ${(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toFixed(2)}ms`);
        console.log(`   🎨 Load Complete: ${(navigation.loadEventEnd - navigation.loadEventStart).toFixed(2)}ms`);
        console.log(`   🏁 Total Load Time: ${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms`);
      }
    };
    
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }
    
    return () => {
      document.removeEventListener('DOMContentLoaded', trackDOMReady);
      window.removeEventListener('load', handleLoad);
    };
  }, []);
  
  return null;
};

export default function AdminDashboard() {
  const [pageId] = useState('admin');
  const [mountTime] = useState(performance.now());
  
  useEffect(() => {
    console.log(`🚀 [Admin Page] AdminPage component initialized at ${mountTime.toFixed(2)}ms`);
    
    // Track when component finishes rendering
    const renderCompleteTime = performance.now();
    console.log(`✅ [Admin Page] Initial render complete at ${renderCompleteTime.toFixed(2)}ms (${(renderCompleteTime - mountTime).toFixed(2)}ms since mount)`);
  }, [mountTime]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PerformanceMonitor />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive analytics and insights for Solana ecosystem monitoring.
          </p>
        </div>
        
        <DashboardRenderer pageId={pageId} />
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  link: string;
  accentColor: string;
  icon: React.ReactNode;
}

function ActionCard({ title, description, link, accentColor, icon }: ActionCardProps) {
  const accentColorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
  };
  
  const gradientClass = accentColorMap[accentColor] || 'from-indigo-500 to-purple-500';
  
  return (
    <Link href={link}>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 transition-transform hover:scale-105 cursor-pointer h-full flex flex-col relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientClass} rounded-full filter blur-2xl opacity-20 -mr-10 -mt-10 transition-opacity group-hover:opacity-30`} />
        
        <div className="relative z-10">
          <div className={`text-${accentColor}-400 mb-4`}>
            {icon}
          </div>
          
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
          
          <div className="mt-6 text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
            <span>Get Started</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
}

function StatCard({ title, value, icon, accentColor }: StatCardProps) {
  const colorVariants = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    indigo: 'text-indigo-400',
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center">
        <span className="text-3xl mr-3">{icon}</span>
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-xl font-bold ${colorVariants[accentColor]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
} 