"use client";

//import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';

import { useRouter } from "next/navigation";
import { useEffect } from "react";


// SEO Structured Data
//const structuredData = generateStructuredData('/dflow/app-stats');

export default function AppStatsIndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Immediate redirect without waiting
    router.replace("/dflow/app-stats/sol-usdc-pair");
  }, [router]);
  
  // Show minimal loading spinner during redirect
  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
      <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
      </div>
    </div>
    </div>
  );
}



//export const metadata = generateNextMetadata('/dflow/app-stats');