"use client";

import { BlogPost } from '../data/sampleData';

interface ArticleHeaderProps {
  post: BlogPost;
}

export default function ArticleHeader({ post }: ArticleHeaderProps) {
  const getCategoryColor = (category: string) => {
    const colors = {
      depin: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
      research: 'text-purple-400 bg-purple-500/10 ring-purple-500/20',
      fundamentals: 'text-green-400 bg-green-500/10 ring-green-500/20',
      updates: 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/20',
      culture: 'text-red-400 bg-red-500/10 ring-red-500/20',
    };
    return colors[category as keyof typeof colors] || 'text-gray-400 bg-gray-500/10 ring-gray-500/20';
  };

  return (
    <header className="mb-12">
      {/* Category and Company Badges */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${getCategoryColor(post.category)}`}>
          {post.category.toUpperCase()}
        </span>
        
        {/* post.company && (
          <a
            href={`https://x.com/${post.company.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-0 bg-gray-900/50 border border-gray-700/50 rounded-full hover:bg-gray-800/50 hover:border-gray-600/50 transition-all duration-200 group"
          >
            
            <span className="text-white font-medium">{post.company.name}</span>
            <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-blue-400 text-sm group-hover:text-blue-300 transition-colors">@{post.company.handle}</span>
          </a>
        )*/}
      </div>
      
      {/* Title */}
      <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
        {post.title}
      </h1>
      
      {/* Excerpt */}
      <p className="text-xl text-gray-300 leading-relaxed mb-8 max-w-3xl">
        {post.excerpt}
      </p>
      
      {/* Author and Meta Info */}
      <div className="flex items-center justify-between border-t border-b border-gray-800 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-white">
              {post.author.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{post.author}</p>
            <p className="text-gray-400 text-sm">Product, Top Ledger</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-gray-400 text-sm">{post.date}</p>
          {post.readTime && (
            <p className="text-gray-500 text-sm">{post.readTime}</p>
          )}
        </div>
      </div>
    </header>
  );
} 