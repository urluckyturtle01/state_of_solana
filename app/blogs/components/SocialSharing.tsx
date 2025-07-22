"use client";

import { useState } from 'react';
import { BlogPost } from '../data/sampleData';

interface SocialSharingProps {
  post: BlogPost;
  position: 'top' | 'bottom' | 'floating' | 'mobile';
  url: string;
}

export default function SocialSharing({ post, position, url }: SocialSharingProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`${post.title}`);
    const shareUrl = encodeURIComponent(url);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const shareUrl = encodeURIComponent(url);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank');
  };

  const getContainerStyles = () => {
    switch (position) {
      case 'floating':
        return 'flex flex-col items-center gap-3 bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-lg p-3 shadow-lg';
      case 'mobile':
        return 'flex items-center gap-4 justify-start';
      case 'top':
        return 'flex items-center gap-4 justify-start';
      case 'bottom':
        return 'flex items-center gap-4 justify-center';
      default:
        return 'flex items-center gap-4 justify-start';
    }
  };

  const getButtonStyles = () => {
    if (position === 'floating') {
      return 'flex items-center justify-center w-10 h-10 rounded-lg border transition-colors';
    }
    return 'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors';
  };

  return (
    <div className={getContainerStyles()}>
      {position === 'floating' && (
        <div className="flex items-center gap-2 mb-1">
          
          <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wide">Share</span>
        </div>
      )}
      
      {position === 'bottom' && (
        <p className="text-gray-400 text-sm mr-4">Share this article:</p>
      )}
      
      <div className={`flex items-center ${position === 'floating' ? 'flex-col gap-3' : 'gap-3'}`}>
        {/* X (formerly Twitter) */}
        <button
          onClick={shareOnX}
          className={`${getButtonStyles()} bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20`}
          title="Share on X"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {(position === 'bottom' || position === 'mobile') && <span className="text-sm">X</span>}
        </button>

        {/* LinkedIn 
        <button
          onClick={shareOnLinkedIn}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20 hover:bg-blue-600/20 transition-colors"
          title="Share on LinkedIn"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          {position === 'bottom' && <span className="text-sm">LinkedIn</span>}
        </button> */}

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className={`${getButtonStyles()} ${
            copied 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20'
          }`}
          title="Copy link"
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          {(position === 'bottom' || position === 'mobile') && (
            <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
          )}
        </button>
      </div>
    </div>
  );
} 