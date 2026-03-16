'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChartConfig } from '@/app/admin/types';

interface ShareButtonProps {
  chart: ChartConfig;
  filterValues?: Record<string, string>;
  className?: string;
}

export default function ShareButton({ chart, filterValues, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateShareUrl = () => {
    // Use actual chart ID: prefer chart.id, fallback to pathname when on share page
    let chartId = chart?.id;
    if (!chartId || chartId === 'uuid') {
      const match = pathname?.match(/^\/share\/chart\/([^/?#]+)/);
      chartId = match?.[1] || chartId || '';
    }

    // Use current origin so link works on whatever URL the user is on
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}` 
      : '';
    let shareUrl = `${baseUrl}/share/chart/${chartId}`;

    // Add filter values as query parameters if they exist
    if (filterValues) {
      const params = new URLSearchParams();
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      if (queryString) {
        shareUrl += `?${queryString}`;
      }
    }

    return shareUrl;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = generateShareUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts or older browsers
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => {
        setIsOpen(false);
        setCopied(false);
      }, 800);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      // Fallback when clipboard API fails (e.g. HTTP, no permissions)
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => { setIsOpen(false); setCopied(false); }, 800);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert(`Copy this link:\n${url}`);
      }
    }
  };

  const handleTwitterShare = () => {
    const url = generateShareUrl();
    const text = `Check out this chart: ${chart.title}${chart.subtitle ? ` - ${chart.subtitle}` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors ${className}`}
        title="Share Chart"
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
            />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 min-w-[180px] bg-gray-900/95 shadow-lg border border-gray-800 rounded-md p-2 z-50"
          style={{
            transform: 'translateY(0)'
          }}
        >
           
          {/* Menu Items */}
          <div className="space-y-0">
            {/* X (Twitter) Share */}
            <button
              type="button"
              className="flex items-center w-full px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-800/50 rounded transition-colors"
              onClick={handleTwitterShare}
              role="menuitem"
            >
              <svg 
                className="w-3 h-3 mr-2" 
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X
            </button>
            {/* Title */}
            <div className="text-gray-400 text-[10px] font-normal pb-1 mb-1 border-b border-gray-800">
              
            </div>
            {/* Copy Link */}
            <button
              type="button"
              className="flex items-center w-full px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-800/50 rounded transition-colors"
              onClick={handleCopyLink}
              role="menuitem"
            >
              <svg 
                className="w-3 h-3 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 