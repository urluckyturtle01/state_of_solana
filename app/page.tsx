"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PrettyLoader from "@/app/components/shared/PrettyLoader";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/protocol-revenue');
  }, [router]);

  return (
    <div className="w-full h-[500px] flex items-center justify-center">
    <PrettyLoader size="sm" />
  </div>
  );
} 