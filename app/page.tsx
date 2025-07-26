"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PrettyLoader from "@/app/components/shared/PrettyLoader";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/protocol-revenue');
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <PrettyLoader size="md" />
      </div>
    </div>
  );
} 