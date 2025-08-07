'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  customAuthor?: string;
  status?: 'draft' | 'published';
  company?: {
    name: string;
    handle: string;
  };
}

interface BlogContent {
  type: 'paragraph' | 'heading' | 'quote' | 'list' | 'image' | 'divider' | 'chart';
  content?: string;
  level?: number;
  items?: ListItem[];
  src?: string;
  alt?: string;
  caption?: string;
  chartConfig?: {
    chartId: string;
    title: string;
    description?: string;
  };
}

interface ListItem {
  text: string;
  nested?: ListItem[];
}

export default function BlogEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('edit');
  const isEditMode = !!editSlug;
  
  const [blogPost, setBlogPost] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    author: '',
    category: 'depin',
    image: '',
    slug: '',
    readTime: '5 min read',
    isHero: false,
    customAuthor: '',
    status: 'draft',
    company: { name: '', handle: '' }
  });
  
  const [content, setContent] = useState<BlogContent[]>([
    { type: 'paragraph', content: '' }
  ]);
  
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Load existing article data when in edit mode
  useEffect(() => {
    if (isEditMode && editSlug) {
      const loadArticle = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/blogs/get/${editSlug}`);
          if (response.ok) {
            const data = await response.json();
            const articleData = data.article;
            setBlogPost(articleData.blogPost);
            
            // Normalize content - convert string list items to ListItem objects
            const normalizedContent = (articleData.content || []).map((block: BlogContent) => {
              if (block.type === 'list' && block.items) {
                const normalizedItems = block.items.map((item: string | ListItem) => {
                  if (typeof item === 'string') {
                    return { text: item, nested: [] };
                  }
                  return item;
                });
                return { ...block, items: normalizedItems };
              }
              return block;
            });
            
            setContent(normalizedContent.length > 0 ? normalizedContent : [{ type: 'paragraph', content: '' }]);
          } else {
            alert('Failed to load article for editing');
            router.push('/admin/blog-manager');
          }
        } catch (error) {
          console.error('Error loading article:', error);
          alert('Error loading article for editing');
          router.push('/admin/blog-manager');
        } finally {
          setIsLoading(false);
        }
      };
      loadArticle();
    }
  }, [isEditMode, editSlug, router]);

  // Auto-generate slug from title (only for new articles)
  useEffect(() => {
    if (blogPost.title && !isEditMode) {
      const slug = blogPost.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      setBlogPost(prev => ({ ...prev, slug }));
    }
  }, [blogPost.title, isEditMode]);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [blogPost.title]);

  const handleContentChange = (index: number, newContent: BlogContent) => {
    const newContentArray = [...content];
    newContentArray[index] = newContent;
    setContent(newContentArray);
  };

  const addContentBlock = (type: BlogContent['type'], afterIndex: number) => {
    const newBlock: BlogContent = { type, content: '' };
    if (type === 'heading') newBlock.level = 2;
    if (type === 'list') newBlock.items = [{ text: '', nested: [] }];
    if (type === 'image') { newBlock.src = ''; newBlock.caption = ''; }
    
    const newContent = [...content];
    newContent.splice(afterIndex + 1, 0, newBlock);
    setContent(newContent);
    setActiveContentIndex(afterIndex + 1);
  };

  const removeContentBlock = (index: number) => {
    if (content.length === 1) return;
    const newContent = content.filter((_, i) => i !== index);
    setContent(newContent);
    setActiveContentIndex(Math.max(0, index - 1));
  };

  const handleKeyPress = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content[index].type === 'paragraph' && !content[index].content?.trim()) {
        // Empty paragraph - show block type selector
        return;
      }
      addContentBlock('paragraph', index);
    }
  };

  const saveBlog = async (status: 'draft' | 'published' = 'published') => {
    const finalAuthor = blogPost.author === 'custom' ? blogPost.customAuthor : blogPost.author;
    
    // For drafts, only require title. For published, require all fields
    if (status === 'published' && (!blogPost.title || !blogPost.excerpt || !finalAuthor)) {
      alert('Please fill in all required fields (title, excerpt, author) before publishing');
      return;
    }
    
    if (!blogPost.title) {
      alert('Please enter a title to save the article');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/blogs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogPost: {
            ...blogPost,
            author: finalAuthor, // Use the final author name
            status,
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }).toUpperCase()
          },
          content
        })
      });

      if (response.ok) {
        const message = status === 'draft' ? 'Article saved as draft!' : 'Article published successfully!';
        alert(message);
        router.push('/admin');
      } else {
        throw new Error('Failed to save blog post');
      }
    } catch (error) {
      alert('Error saving blog post: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Admin
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Article' : 'Blog Editor'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {isPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => saveBlog('draft')}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => saveBlog('published')}
              disabled={isSaving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!isPreview ? (
          /* Editor Mode */
          <div className="space-y-8">
            {/* Blog Metadata */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Blog Post Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author *
                  </label>
                  <select
                    value={blogPost.author || ''}
                    onChange={(e) => setBlogPost(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select an author...</option>
                    <option value="Soham">Soham</option>
                    <option value="Decal">Decal</option>
                    <option value="Helius Team">Helius Team</option>
                    <option value="custom">Custom Author...</option>
                  </select>
                  
                  {/* Custom author input - shown when "custom" is selected */}
                  {blogPost.author === 'custom' && (
                    <input
                      type="text"
                      value={blogPost.customAuthor || ''}
                      onChange={(e) => setBlogPost(prev => ({ ...prev, customAuthor: e.target.value }))}
                      placeholder="Enter custom author name"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={blogPost.category || 'depin'}
                    onChange={(e) => setBlogPost(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="depin">DePIN</option>
                    <option value="defi">DeFi</option>
                    <option value="nft">NFT</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="analysis">Analysis</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={blogPost.isHero || false}
                      onChange={(e) => setBlogPost(prev => ({ ...prev, isHero: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ⭐ Mark as Hero Article
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Hero articles are featured prominently on the blog page
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={blogPost.company?.name || ''}
                    onChange={(e) => setBlogPost(prev => ({ 
                      ...prev, 
                      company: { ...prev.company, name: e.target.value, handle: prev.company?.handle || '' }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter Handle
                  </label>
                  <input
                    type="text"
                    value={blogPost.company?.handle || ''}
                    onChange={(e) => setBlogPost(prev => ({ 
                      ...prev, 
                      company: { name: prev.company?.name || '', handle: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="twitter_handle"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Featured Image URL
                  </label>
                  <input
                    type="url"
                    value={blogPost.image || ''}
                    onChange={(e) => setBlogPost(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={blogPost.slug || ''}
                    onChange={(e) => setBlogPost(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="url-friendly-slug"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <textarea
                ref={titleRef}
                value={blogPost.title || ''}
                onChange={(e) => setBlogPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Write your title here..."
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-400 border-none outline-none resize-none overflow-hidden"
                rows={1}
              />
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt *
              </label>
              <textarea
                value={blogPost.excerpt || ''}
                onChange={(e) => setBlogPost(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Write a brief excerpt that will appear in blog listings..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
              />
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content</h3>
              
              <div className="space-y-4">
                {content.map((block, index) => (
                  <ContentBlock
                    key={index}
                    block={block}
                    index={index}
                    isActive={activeContentIndex === index}
                    onChange={(newBlock) => handleContentChange(index, newBlock)}
                    onAddBlock={(type) => addContentBlock(type, index)}
                    onRemove={() => removeContentBlock(index)}
                    onFocus={() => setActiveContentIndex(index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <PreviewContent blogPost={blogPost} content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

// Content Block Component
interface ContentBlockProps {
  block: BlogContent;
  index: number;
  isActive: boolean;
  onChange: (block: BlogContent) => void;
  onAddBlock: (type: BlogContent['type']) => void;
  onRemove: () => void;
  onFocus: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

function ContentBlock({ 
  block, 
  index, 
  isActive, 
  onChange, 
  onAddBlock, 
  onRemove, 
  onFocus, 
  onKeyPress 
}: ContentBlockProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const blockTypes = [
    { type: 'paragraph' as const, label: 'Paragraph', icon: '¶' },
    { type: 'heading' as const, label: 'Heading', icon: 'H' },
    { type: 'quote' as const, label: 'Quote', icon: '"' },
    { type: 'list' as const, label: 'List', icon: '•' },
    { type: 'image' as const, label: 'Image', icon: '🖼️' },
    { type: 'chart' as const, label: 'Chart', icon: '📊' },
    { type: 'divider' as const, label: 'Divider', icon: '—' },
  ];

  return (
    <div className="relative group">
      {/* Block Controls */}
      <div className="absolute left-0 top-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity -ml-12">
        <button
          onClick={() => setShowTypeSelector(!showTypeSelector)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm"
          title="Add block"
        >
          +
        </button>
        {index > 0 && (
          <button
            onClick={onRemove}
            className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 text-sm"
            title="Remove block"
          >
            ×
          </button>
        )}
      </div>

      {/* Type Selector */}
      {showTypeSelector && (
        <div className="absolute top-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 -ml-4">
          <div className="grid grid-cols-1 gap-1">
            {blockTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => {
                  onAddBlock(type);
                  setShowTypeSelector(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
              >
                <span className="text-gray-400">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Block Content */}
      <div 
        className={`border-2 rounded-lg p-4 transition-colors ${
          isActive ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
        }`}
        onClick={onFocus}
      >
        {block.type === 'paragraph' && (
          <textarea
            value={block.content || ''}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            onKeyPress={onKeyPress}
            placeholder="Write your paragraph here..."
            className="w-full min-h-[60px] text-gray-900 placeholder-gray-400 border-none outline-none resize-none"
            rows={3}
          />
        )}

        {block.type === 'heading' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <select
                value={block.level || 2}
                onChange={(e) => onChange({ ...block, level: parseInt(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </div>
            <input
              type="text"
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Heading text..."
              className={`w-full font-bold text-gray-900 placeholder-gray-400 border-none outline-none ${
                block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl'
              }`}
            />
          </div>
        )}

        {block.type === 'quote' && (
          <div className="border-l-4 border-gray-300 pl-4">
            <textarea
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Quote text..."
              className="w-full italic text-gray-700 placeholder-gray-400 border-none outline-none resize-none"
              rows={2}
            />
          </div>
        )}

        {block.type === 'list' && (
          <ListEditor 
            items={block.items || [{ text: '', nested: [] }]}
            onChange={(newItems) => onChange({ ...block, items: newItems })}
          />
        )}

        {block.type === 'image' && (
          <div className="space-y-3">
            <input
              type="url"
              value={block.src || ''}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
              placeholder="Image URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-400 outline-none"
            />
            <input
              type="text"
              value={block.caption || ''}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              placeholder="Image caption (optional)..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-400 outline-none"
            />
            {block.src && (
              <div className="border border-gray-200 rounded p-2">
                <img src={block.src} alt={block.caption || ''} className="max-w-full h-auto" />
                {block.caption && (
                  <p className="text-sm text-gray-600 mt-2 italic">{block.caption}</p>
                )}
              </div>
            )}
          </div>
        )}

        {block.type === 'chart' && (
          <ChartSelector 
            selectedChart={block.chartConfig}
            onChange={(chartConfig) => onChange({ ...block, chartConfig })}
          />
        )}

        {block.type === 'divider' && (
          <hr className="border-gray-300" />
        )}
      </div>
    </div>
  );
}

// Preview Component
interface PreviewContentProps {
  blogPost: Partial<BlogPost>;
  content: BlogContent[];
}

function PreviewContent({ blogPost, content }: PreviewContentProps) {
  return (
    <div className="max-w-none">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{blogPost.title || 'Untitled'}</h1>
        <p className="text-xl text-gray-600 mb-6">{blogPost.excerpt}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>By {blogPost.author}</span>
          <span>•</span>
          <span>{blogPost.category}</span>
          <span>•</span>
          <span>{blogPost.readTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="prose max-w-none">
        {content.map((block, index) => (
          <div key={index} className="mb-6">
            {block.type === 'paragraph' && (
              <p className="text-gray-900 leading-relaxed">{block.content}</p>
            )}
            
            {block.type === 'heading' && (
              <div className={`font-bold text-gray-900 ${
                block.level === 1 ? 'text-3xl' : 
                block.level === 2 ? 'text-2xl' : 'text-xl'
              }`}>
                {block.content}
              </div>
            )}
            
            {block.type === 'quote' && (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
                {block.content}
              </blockquote>
            )}
            
            {block.type === 'list' && (
              <ul className="list-disc list-inside space-y-1">
                {(block.items || []).map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-900">
                    {typeof item === 'string' ? item : item.text}
                    {typeof item === 'object' && item.nested && item.nested.length > 0 && (
                      <ul className="list-disc list-inside ml-6 mt-1">
                        {item.nested.map((nestedItem, nestedIndex) => (
                          <li key={nestedIndex} className="text-gray-900">
                            {typeof nestedItem === 'string' ? nestedItem : nestedItem.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            
            {block.type === 'image' && block.src && (
              <div className="text-center">
                <img src={block.src} alt={block.caption || ''} className="max-w-full h-auto mx-auto rounded" />
                {block.caption && (
                  <p className="text-sm text-gray-500 mt-2 italic">{block.caption}</p>
                )}
              </div>
            )}
            
            {block.type === 'chart' && block.chartConfig && (
              <div className="bg-gray-100 border border-gray-300 rounded p-4 text-center">
                <h4 className="font-semibold text-gray-900">{block.chartConfig.title}</h4>
                {block.chartConfig.description && (
                  <p className="text-sm text-gray-600 mt-1">{block.chartConfig.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">Chart ID: {block.chartConfig.chartId}</p>
              </div>
            )}
            
            {block.type === 'divider' && (
              <hr className="border-gray-300 my-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// List Editor Component for nested lists
interface ListEditorProps {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
}

function ListEditor({ items, onChange }: ListEditorProps) {
  const updateItem = (index: number, newItem: ListItem) => {
    const newItems = [...items];
    newItems[index] = newItem;
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, { text: '', nested: [] }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const addNestedItem = (parentIndex: number) => {
    const newItems = [...items];
    if (!newItems[parentIndex].nested) {
      newItems[parentIndex].nested = [];
    }
    newItems[parentIndex].nested!.push({ text: '', nested: [] });
    onChange(newItems);
  };

  const updateNestedItem = (parentIndex: number, nestedIndex: number, text: string) => {
    const newItems = [...items];
    if (newItems[parentIndex].nested) {
      newItems[parentIndex].nested[nestedIndex] = { text, nested: [] };
      onChange(newItems);
    }
  };

  const removeNestedItem = (parentIndex: number, nestedIndex: number) => {
    const newItems = [...items];
    if (newItems[parentIndex].nested) {
      newItems[parentIndex].nested = newItems[parentIndex].nested!.filter((_, i) => i !== nestedIndex);
      onChange(newItems);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="space-y-2">
          {/* Main list item */}
          <div className="flex items-center space-x-2">
            <span>•</span>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(index, { ...item, text: e.target.value })}
              placeholder="List item..."
              className="flex-1 text-gray-900 placeholder-gray-400 border-none outline-none"
            />
            <button
              onClick={() => addNestedItem(index)}
              className="text-blue-500 hover:text-blue-700 text-sm px-2"
              title="Add nested item"
            >
              ↳
            </button>
            {index > 0 && (
              <button
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>

          {/* Nested items */}
          {item.nested && item.nested.length > 0 && (
            <div className="ml-6 space-y-1">
              {item.nested.map((nestedItem, nestedIndex) => (
                <div key={nestedIndex} className="flex items-center space-x-2">
                  <span>◦</span>
                  <input
                    type="text"
                    value={nestedItem.text}
                    onChange={(e) => updateNestedItem(index, nestedIndex, e.target.value)}
                    placeholder="Nested item..."
                    className="flex-1 text-gray-900 placeholder-gray-400 border-none outline-none"
                  />
                  <button
                    onClick={() => removeNestedItem(index, nestedIndex)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      <button
        onClick={addItem}
        className="text-blue-500 hover:text-blue-700 text-sm"
      >
        + Add item
      </button>
    </div>
  );
}

// Chart Selector Component
interface ChartSelectorProps {
  selectedChart?: {
    chartId: string;
    title: string;
    description?: string;
  };
  onChange: (chartConfig: { chartId: string; title: string; description?: string }) => void;
}

function ChartSelector({ selectedChart, onChange }: ChartSelectorProps) {
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch available charts
    fetch('/api/charts/list')
      .then(res => res.json())
      .then(data => {
        setCharts(data.charts || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load charts:', err);
        setLoading(false);
      });
  }, []);

  const filteredCharts = charts.filter(chart => 
    chart.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-gray-500">Loading charts...</div>;
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search charts..."
        className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-400 outline-none"
      />
      
      {selectedChart && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="font-medium text-blue-900">Selected: {selectedChart.title}</p>
          <p className="text-sm text-blue-700">ID: {selectedChart.chartId}</p>
          {selectedChart.description && (
            <p className="text-sm text-blue-600 mt-1">{selectedChart.description}</p>
          )}
        </div>
      )}
      
      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded">
        {filteredCharts.length === 0 ? (
          <p className="text-gray-500 p-3">No charts found</p>
        ) : (
          filteredCharts.map((chart) => (
            <button
              key={chart.id}
              onClick={() => onChange({
                chartId: chart.id,
                title: chart.title,
                description: chart.subtitle || ''
              })}
              className={`w-full text-left p-3 border-b border-gray-200 hover:bg-gray-50 ${
                selectedChart?.chartId === chart.id ? 'bg-blue-50' : ''
              }`}
            >
              <p className="font-medium text-gray-900">{chart.title}</p>
              <p className="text-sm text-gray-600">ID: {chart.id}</p>
              {chart.subtitle && (
                <p className="text-sm text-gray-500 mt-1">{chart.subtitle}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
} 