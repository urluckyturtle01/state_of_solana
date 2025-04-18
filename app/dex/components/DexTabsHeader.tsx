"use client";

import { useState } from "react";
import Link from "next/link";

interface DexTabsHeaderProps {
  activeTab?: string;
}

export default function DexTabsHeader({ activeTab = "summary" }: DexTabsHeaderProps) {
  const tabs = [
    { 
      name: "Summary", 
      path: "/dex/summary",
      key: "summary",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Volume", 
      path: "/dex/volume",
      key: "volume",
      icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    },
    { 
      name: "TVL", 
      path: "/dex/tvl",
      key: "tvl",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    },
    { 
      name: "Traders", 
      path: "/dex/traders",
      key: "traders",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    },
    { 
      name: "DEX Aggregators", 
      path: "/dex/aggregators",
      key: "aggregators",
      icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    }
  ];
  
  return (
    <div>
      <div>
        <h1 className="text-lg font-medium text-gray-200">DEX</h1>
        <p className="text-gray-400 text-xs pb-2">Decentralized Exchange metrics for Solana</p>
        <div className="h-px bg-gradient-to-r from-gray-900 via-gray-800 to-transparent mb-3"></div>
      </div>
      
      <div className="pl-0">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-900/50 overflow-hidden inline-block">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              
              return (
                <Link
                  key={tab.name}
                  href={tab.path}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 whitespace-nowrap transition-all duration-200 ${
                    isActive 
                      ? "text-white bg-gray-900/40 border-b border-emerald-500" 
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-3.5 w-3.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  <span className="font-medium text-[13px]">{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
} 