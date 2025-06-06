"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/protocol-revenue");
  }, [router]);
  
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black">
      <div className="relative w-24 h-24">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
        
        {/* Middle spinning ring - reverse direction */}
        <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        
        {/* Inner pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-teal-400 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Text below loader */}
      <p className="mt-8 text-gray-400 text-sm font-light tracking-wider animate-pulse">
        Top Ledger Research...
      </p>
    </div>
  );
} 