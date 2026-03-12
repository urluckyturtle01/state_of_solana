"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ComputeUnitsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/compute-units/capacity");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-[550px] bg-black text-gray-400">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
