"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Properly handle the router path - remove the route group from URL
    router.replace("/");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      Loading State of Solana Dashboard...
    </div>
  );
} 