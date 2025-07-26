'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  isHero?: boolean;
  company?: {
    name: string;
    handle: string;
  };
}

export default function BlogManager() {
  const router = useRouter();
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/blogs/list');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      } else {
        console.error('Failed to fetch articles');
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (slug: string) => {
    setDeleting(slug);
    try {
      const response = await fetch('/api/blogs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      });

      if (response.ok) {
        setArticles(prev => prev.filter(article => article.slug !== slug));
        setDeleteConfirm(null);
        alert('Article deleted successfully!');
      } else {
        const error = await response.json();
        alert('Failed to delete article: ' + error.message);
      }
    } catch (error) {
      alert('Error deleting article: ' + (error as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  const toggleHero = async (slug: string, isHero: boolean) => {
    try {
      const response = await fetch('/api/blogs/toggle-hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, isHero })
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(prev => prev.map(article => ({
          ...article,
          isHero: article.slug === slug ? isHero : (isHero ? false : article.isHero)
        })));
        alert(data.message);
      } else {
        const error = await response.json();
        alert('Failed to toggle hero status: ' + error.message);
      }
    } catch (error) {
      alert('Error toggling hero status: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Admin
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Blog Manager</h1>
          </div>
          
          <Link 
            href="/admin/blog-editor"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Article
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{articles.length}</h3>
              <p className="text-gray-600">Total Articles</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-600">
                {articles.filter(a => a.category === 'depin').length}
              </h3>
              <p className="text-gray-600">DePIN Articles</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600">
                {articles.filter(a => a.category === 'defi').length}
              </h3>
              <p className="text-gray-600">DeFi Articles</p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Articles</h2>
          </div>

          {articles.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No articles found</p>
              <Link 
                href="/admin/blog-editor"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create your first article
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {articles.map((article) => (
                <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                          <Link href={`/blogs/${article.slug}`}>
                            {article.title}
                          </Link>
                        </h3>
                        {article.isHero && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                            ★ Hero
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          getCategoryColor(article.category)
                        }`}>
                          {article.category}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>By {article.author}</span>
                        <span>•</span>
                        <span>{article.date}</span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                        {article.company?.name && (
                          <>
                            <span>•</span>
                            <span>{article.company.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-6">
                      <Link
                        href={`/blogs/${article.slug}`}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        View
                      </Link>
                      
                      <Link
                        href={`/admin/blog-editor?edit=${article.slug}`}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => toggleHero(article.slug, !article.isHero)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          article.isHero 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {article.isHero ? '★ Hero' : 'Make Hero'}
                      </button>
                      
                      <button
                        onClick={() => setDeleteConfirm(article.slug)}
                        disabled={deleting === article.slug}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {deleting === article.slug ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Article</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteArticle(deleteConfirm)}
                disabled={deleting === deleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting === deleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'depin': 'bg-blue-100 text-blue-800',
    'defi': 'bg-green-100 text-green-800',
    'nft': 'bg-purple-100 text-purple-800',
    'infrastructure': 'bg-gray-100 text-gray-800',
    'analysis': 'bg-yellow-100 text-yellow-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
} 