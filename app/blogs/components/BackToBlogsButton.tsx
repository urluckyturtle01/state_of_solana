"use client";

import Link from 'next/link';

export default function BackToBlogsButton() {
  return (
    <div className="mb-8">
      <Link 
        href="/blogs"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm">Back to all articles</span>
      </Link>
    </div>
  );
} 