"use client";

import { useState, useMemo } from 'react';
import BlogHero from './components/BlogHero';
import BlogCard from './components/BlogCard';
import TabsNavigation from '@/app/components/shared/TabsNavigation';
import { sampleBlogPosts, featuredPost, BlogPost } from './data/sampleData';

const filters = [
  { name: 'All', path: '/blogs', key: 'all', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { name: 'DePIN', path: '/blogs', key: 'depin', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
];

export default function BlogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const handleTabClick = (e: React.MouseEvent, tabKey: string) => {
    e.preventDefault();
    setActiveFilter(tabKey);
  };

  // Filter and search logic
  const filteredPosts = useMemo(() => {
    let posts = sampleBlogPosts; // Include all posts, including featured post

    // Apply category filter
    if (activeFilter !== 'all') {
      posts = posts.filter(post => post.category === activeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.author.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower)
      );
    }

    return posts;
  }, [searchTerm, activeFilter]);

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="mb-12">
        <BlogHero featuredPost={featuredPost} />
      </div>

      {/* Navigation with Search and Filters */}
      <div className="mb-8">
        <TabsNavigation
          title="Latest Articles"
          description="Discover insights, development guides, and ecosystem updates from the Solana community"
          tabs={filters}
          activeTab={activeFilter}
          onTabClick={handleTabClick}
          search={{
            placeholder: "Search articles...",
            onSearch: setSearchTerm,
            initialValue: searchTerm
          }}
        />
      </div>

     

      {/* Blog Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <div className="mb-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No articles found</h3>
          <p className="text-gray-500 text-sm">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
} 