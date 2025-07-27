"use client";

import { generateNextMetadata, generateStructuredData } from '../seo-metadata';



import { useEffect } from "react";
import { useRouter } from "next/navigation";


// SEO Structured Data
const structuredData = generateStructuredData('/sf-dashboards');

export default function SFDashboardsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/sf-dashboards/overview");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-[550px] bg-black text-gray-400">
      
      <div className="relative w-16 h-16">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
        
        {/* Middle spinning ring - reverse direction */}
        <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        
        {/* Inner pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    
    </div>
  );
} 

export const metadata = generateNextMetadata('/sf-dashboards');