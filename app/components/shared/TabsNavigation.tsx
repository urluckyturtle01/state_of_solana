"use client";

import Link from "next/link";
import React from "react";

export interface Tab {
  name: string;
  path: string;
  key: string;
  icon?: string;
}

export interface TabsNavigationProps {
  tabs: Tab[];
  activeTab: string;
  title?: string;
  description?: string;
  showDivider?: boolean;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({
  tabs,
  activeTab,
  title,
  description,
  showDivider = true,
}) => {
  return (
    <div>
      {(title || description) && (
        <div className="mt-0 mb-3">
          {title && <h1 className="text-lg font-medium text-gray-200">{title}</h1>}
          {description && <p className="text-gray-400 text-xs pb-2">{description}</p>}
          {showDivider && <div className="h-px bg-gradient-to-r from-gray-900 via-gray-800 to-transparent mb-1"></div>}
        </div>
      )}
      
      <div className="overflow-x-auto w-full">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-900/50 inline-block min-w-full">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              
              return (
                <Link
                  key={tab.key}
                  href={tab.path}
                  className={`flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap transition-all duration-200 ${
                    isActive 
                      ? "text-white bg-gray-900/40 border-b-2 border-emerald-500" 
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab.icon && (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                  )}
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
};

export default TabsNavigation; 