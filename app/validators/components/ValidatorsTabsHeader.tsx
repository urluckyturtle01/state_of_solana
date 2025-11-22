"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TabsNavigation, { Tab } from "@/app/components/shared/TabsNavigation";

interface ValidatorsTabsHeaderProps {
  activeTab?: string;
}

interface ValidatorInfo {
  validator_name?: string;
}

interface ValidatorPerformanceData {
  epoch?: number;
  validator_commission_pct?: number;
}

export default function ValidatorsTabsHeader({ activeTab = "overview" }: ValidatorsTabsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [validatorInfo, setValidatorInfo] = useState<ValidatorInfo | null>(null);
  const [performanceData, setPerformanceData] = useState<ValidatorPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const tabs: Tab[] = [
    { 
      name: "Overview", 
      path: "/validators/overview",
      key: "overview",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    },
    { 
      name: "Performance", 
      path: "/validators/performance",
      key: "performance",
      icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    },
    { 
      name: "Rewards & Economics", 
      path: "/validators/rewards",
      key: "rewards",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    },
    { 
      name: "APIs", 
      path: "/validators/apis",
      key: "apis",
      icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    }
  ];

  // Get current vote account from URL params
  const currentVoteAccount = searchParams.get('voteAccount') || '';

  // Fetch validator data when vote account changes
  useEffect(() => {
    const fetchValidatorData = async () => {
      if (!currentVoteAccount) {
        setValidatorInfo(null);
        setPerformanceData(null);
        return;
      }

      setLoading(true);
      try {
        // Fetch validator name from info API
        const infoResponse = await fetch('/api/validators/info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vote_account: currentVoteAccount,
          }),
        });

        if (infoResponse.ok) {
          const infoResult = await infoResponse.json();
          if (infoResult.success && infoResult.data) {
            setValidatorInfo(infoResult.data);
          }
        }

        // Fetch epoch and commission from performance API
        const performanceResponse = await fetch('/api/validators/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vote_account: currentVoteAccount,
          }),
        });

        if (performanceResponse.ok) {
          const performanceResult = await performanceResponse.json();
          // Sort by epoch descending to get the latest epoch first
          if (performanceResult.success && performanceResult.data && performanceResult.data.length > 0) {
            const sortedData = [...performanceResult.data].sort((a: ValidatorPerformanceData, b: ValidatorPerformanceData) => 
              (b.epoch || 0) - (a.epoch || 0)
            );
            setPerformanceData(sortedData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching validator data:', error);
        setValidatorInfo(null);
        setPerformanceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchValidatorData();
  }, [currentVoteAccount]);

  // Handler for vote account search - triggers on every change
  const handleVoteAccountSearch = (voteAccount: string) => {
    // Update URL with vote account parameter
    const params = new URLSearchParams(searchParams.toString());
    const currentPath = window.location.pathname;
    
    if (voteAccount.trim()) {
      params.set('voteAccount', voteAccount.trim());
      // Stay on current page with the vote account param
      router.push(`${currentPath}?${params.toString()}`);
    } else {
      // Clear the parameter if search is empty, but stay on current page
      params.delete('voteAccount');
      const queryString = params.toString();
      router.push(`${currentPath}${queryString ? '?' + queryString : ''}`);
    }
  };
  
  return (
    <TabsNavigation 
      tabs={tabs} 
      activeTab={activeTab}
      title="Validators"
      description="Solana validator network performance, rewards, and economics"
      showDivider={true}
      voteAccountSearch={{
        placeholder: "Enter vote account address...",
        onSearch: handleVoteAccountSearch,
        initialValue: currentVoteAccount
      }}
      validatorInfo={
        currentVoteAccount
          ? {
              validatorName: validatorInfo?.validator_name,
              epoch: performanceData?.epoch,
              commission: performanceData?.validator_commission_pct,
              loading: loading
            }
          : undefined
      }
    />
  );
}
