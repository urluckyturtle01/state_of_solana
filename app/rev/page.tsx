"use client";





import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RevPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/rev/cost-capacity");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      Redirecting to Cost & Capacity...
    </div>
  );
} 