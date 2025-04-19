"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Detect if we're in a production environment (with basePath)
    const isProd = process.env.NODE_ENV === 'production';
    const basePath = isProd ? '/state_of_solana' : '';
    
    // Redirect to the overview page with appropriate base path
    router.replace("/");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      <div className="text-center">
        <h1 className="text-xl mb-2">State of Solana Dashboard</h1>
        <p>Loading...</p>
      </div>
    </div>
  );
} 