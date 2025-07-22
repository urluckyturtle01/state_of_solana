"use client";

import Link from 'next/link';

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
}

interface BlogCardProps {
  post: BlogPost;
}

export default function BlogCard({ post }: BlogCardProps) {
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
    <Link href={`/blogs/${post.slug}`}>
      <article className="bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg transition-all duration-300 hover:shadow-gray-900/20 relative group">
        
         {/* Image Section */}
         <div className="mt-3 mb-3">
          <div className="relative h-[160px] bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden rounded-lg">
            {post.image ? (
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full opacity-20"></div>
              </div>
            )}
          </div>
        </div>
         

        {/* Header Section with Category and Date */}
        <div className="flex justify-between items-center mb-3">
          <div className="-mt-1">
            <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5 line-clamp-2">{post.title}</h2>
            {post.excerpt && <p className="text-gray-500 text-[10px] tracking-wide line-clamp-2">{post.excerpt}</p>}
          </div>
          
        </div>
        
       
        
       
        
        {/* Second Divider */}
        <div className="h-px bg-gray-900 w-full"></div>
        
        {/* Footer Section with Author and Date */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-semibold text-white">
                {post.author.charAt(0)}
              </span>
            </div>
            <span className="text-gray-400 text-[11px]">{post.author}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
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
  );
} 