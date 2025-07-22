"use client";

import Link from 'next/link';

interface BlogHeroProps {
  featuredPost: {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    date: string;
    category: string;
    image: string;
    slug: string;
  };
}

export default function BlogHero({ featuredPost }: BlogHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-800">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="relative px-8 py-12 lg:px-12 lg:py-16">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Category Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
              {featuredPost.category.toUpperCase()}
            </span>
          </div>
          
          {/* Image Section - Mobile */}
          <div className="relative mb-6">
            {featuredPost.image ? (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            ) : (
              <div className="relative">
                {/* Placeholder with gradient and icon */}
                <div className="w-full h-48 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="text-gray-500 text-xs">{featuredPost.category}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Date */}
          <p className="text-sm text-gray-400 mb-4">
            {featuredPost.date}
          </p>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-white leading-tight mb-4">
            {featuredPost.title}
          </h1>
          
          {/* Excerpt */}
          <p className="text-base text-gray-300 leading-relaxed mb-6">
            {featuredPost.excerpt}
          </p>
          
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {featuredPost.author.charAt(0)}
              </span>
            </div>
            <span className="text-gray-300 text-sm">{featuredPost.author}</span>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content Section - Desktop */}
          <div className="max-w-2xl">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                {featuredPost.category.toUpperCase()}
              </span>
            </div>
            
            {/* Date */}
            <p className="text-sm text-gray-400 mb-4">
              {featuredPost.date}
            </p>
            
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
              {featuredPost.title}
            </h1>
            
            {/* Excerpt */}
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              {featuredPost.excerpt}
            </p>
            
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {featuredPost.author.charAt(0)}
                </span>
              </div>
              <span className="text-gray-300 text-sm">{featuredPost.author}</span>
            </div>
          </div>
          
          {/* Image Section - Desktop */}
          <div className="relative">
            {featuredPost.image ? (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-64 lg:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            ) : (
              <div className="relative">
                {/* Placeholder with gradient and icon */}
                <div className="w-full h-64 lg:h-80 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="text-gray-500 text-sm">{featuredPost.category}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-8 right-8 lg:top-12 lg:right-12 opacity-30">
          <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-full blur-2xl"></div>
        </div>
      </div>
      
      {/* Click overlay for navigation */}
      <Link href={`/blogs/${featuredPost.slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">Read {featuredPost.title}</span>
      </Link>
    </div>
  );
} 