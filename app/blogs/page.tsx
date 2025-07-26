"use client";

import { useState, useMemo, useEffect } from 'react';
import BlogHero from './components/BlogHero';
import BlogCard from './components/BlogCard';
import TabsNavigation from '@/app/components/shared/TabsNavigation';
import PrettyLoader from '@/app/components/shared/PrettyLoader';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  slug: string;
  readTime?: string;
  isHero?: boolean;
  company?: {
    name: string;
    handle: string;
  };
}

const filters = [
  { name: 'All', path: '/blogs', key: 'all', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { name: 'DePIN', path: '/blogs', key: 'depin', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
];

export default function BlogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch blog posts from S3 on component mount
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch('/api/blogs/list');
        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }
        const data = await response.json();
        setBlogPosts(data.articles || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blog posts');
        console.error('Error fetching blog posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  const handleTabClick = (e: React.MouseEvent, tabKey: string) => {
    e.preventDefault();
    setActiveFilter(tabKey);
  };

  // Filter and search logic
  const filteredPosts = useMemo(() => {
    let posts = blogPosts;

    // Apply category filter
    if (activeFilter !== 'all') {
      posts = posts.filter((post: BlogPost) => post.category === activeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      posts = posts.filter((post: BlogPost) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.author.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower)
      );
    }

    return posts;
  }, [searchTerm, activeFilter, blogPosts]);

  // Get featured post (hero post if available, otherwise first/latest post)
  const featuredPost = useMemo(() => {
    const heroPost = blogPosts.find((post: BlogPost) => post.isHero);
    return heroPost || (blogPosts.length > 0 ? blogPosts[0] : null);
  }, [blogPosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <PrettyLoader size="md" />
      </div>
    </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="text-red-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-400 mb-2">Error Loading Blog Posts</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="py-12">
      {/* Hero Section */}
      {featuredPost && (
        <div className="mb-12">
          <BlogHero featuredPost={featuredPost} />
        </div>
      )}

      {/* Navigation with Search and Filters */}
      <div className="mb-8">
        <TabsNavigation
          title="Latest Articles"
          description="Analytics‑Driven Stories Shaping the Solana Ecosystem."
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