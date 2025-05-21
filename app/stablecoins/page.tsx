"use client";

/*export default function StablecoinsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-gray-900 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Stablecoins Overview</h2>
        <div className="h-80 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <p className="text-gray-400">Stablecoin metrics will appear here</p>
        </div>
      </div>
    </div>
  );
} */





import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StablecoinsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/stablecoins/stablecoin-usage");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      Redirecting to DEX Summary...
    </div>
  );
} 