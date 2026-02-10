"use client";

import Link from 'next/link';
import { BlogPost } from '../data/sampleData';

interface RelatedArticlesProps {
  posts: BlogPost[];
}

export default function RelatedArticles({ posts }: RelatedArticlesProps) {
  const getCategoryColor = (category: string) => {
    const colors = {
      development: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
      research: 'text-purple-400 bg-purple-500/10 ring-purple-500/20',
      fundamentals: 'text-green-400 bg-green-500/10 ring-green-500/20',
      updates: 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/20',
      culture: 'text-red-400 bg-red-500/10 ring-red-500/20',
    };
    return colors[category as keyof typeof colors] || 'text-gray-400 bg-gray-500/10 ring-gray-500/20';
  };

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-8">Related Articles</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link key={post.id} href={`/blogs/${post.slug}`}>
            <article className="bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-gray-800 transition-all duration-300 hover:bg-black/80 hover:border-gray-700 group">
              {/* Category Badge */}
              <div className="mb-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getCategoryColor(post.category)}`}>
                  {post.category.toUpperCase()}
                </span>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-gray-100 transition-colors">
                {post.title}
              </h3>
              
              {/* Excerpt */}
              <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                {post.excerpt}
              </p>
              
              {/* Author and Date */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {post.author.charAt(0)}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{post.author}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <time dateTime={post.date}>{post.date}</time>
                  {post.readTime && (
                    <>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </>
                  )}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
} 