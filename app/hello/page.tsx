"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPagesForMenu } from "@/app/admin/config/menuPages";

export default function HelloIndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Get available pages for this menu
    const pages = getPagesForMenu('hello');
    
    // Redirect to the first available page, or show a message if no pages exist
    if (pages.length > 0) {
      const firstPage = pages[0];
      router.replace(firstPage.path);
    }
  }, [router]);
  
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-black text-gray-400">
      <h2 className="text-xl font-semibold mb-2">Welcome to hello</h2>
      <p>Loading available pages...</p>
    </div>
  );
}