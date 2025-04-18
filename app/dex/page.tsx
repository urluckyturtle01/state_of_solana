"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DexIndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/dex/summary");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      Redirecting to DEX Summary...
    </div>
  );
} 