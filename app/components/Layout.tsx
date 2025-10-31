"use client";

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import MobileNavbar from './MobileNavbar';
import { DashboardErrorBoundary } from './ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Effect to detect mobile viewport
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1100); // 768px is the standard md breakpoint
    };

    // Check on initial render
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black w-full">
       {/* Sidebar on desktop */}
       {!isMobile && (
        <div className="fixed left-0 top-0 h-full z-40">
          <Sidebar />
        </div>
      )}

      {/* Mobile nav on small screens */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <MobileNavbar />
        </div>
      )}

      {/* Main content - adjusted for mobile/desktop */}
      <main className={`flex-1 ${isMobile ? 'mt-18 p-4' : 'ml-48 p-8'} bg-gradient-to-br from-black to-gray-950 min-h-screen w-full`}>
        <div className="w-full mx-auto relative z-10">
          <DashboardErrorBoundary>
            {children}
          </DashboardErrorBoundary>
        </div>
      </main>
    </div>
  );
} 