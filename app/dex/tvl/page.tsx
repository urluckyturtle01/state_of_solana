"use client";

import Layout from "../../components/Layout";
import DexTabsHeader from "../components/DexTabsHeader";

export default function DexTvlPage() {
  return (
    
      <div className="space-y-6">
       
        
        <div className="bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-gray-900 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Total Value Locked (TVL)</h2>
          <div className="h-80 flex items-center justify-center bg-gray-900/50 rounded-lg">
            <p className="text-gray-400">TVL chart will appear here</p>
          </div>
        </div>
      </div>
    
  );
} 