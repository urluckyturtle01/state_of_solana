"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TextboxCardProps {
  id: string;
  content: string;
  width: 'half' | 'full';
  height?: number;
  isEditMode?: boolean;
  onDeleteClick?: () => void;
  onContentChange?: (content: string) => void;
  onHeightChange?: (height: number) => void;
  dragHandleProps?: any;
}

const TextboxCard: React.FC<TextboxCardProps> = ({
  id,
  content,
  width,
  height = 200,
  isEditMode = false,
  onDeleteClick,
  onContentChange,
  onHeightChange,
  dragHandleProps,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(height);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const widthClasses = {
    half: 'md:col-span-1',
    full: 'md:col-span-2'
  };

  // Sync height with props
  useEffect(() => {
    setCurrentHeight(height);
  }, [height]);

  // Auto-focus and select when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setEditContent(content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onContentChange && editContent.trim() !== content) {
      onContentChange(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSaveEdit();
    }
  };

  // Height resizing functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = currentHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(120, Math.min(800, startHeight + deltaY));
      setCurrentHeight(newHeight);
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      
      if (onHeightChange) {
        onHeightChange(currentHeight);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`bg-black/80 backdrop-blur-sm rounded-xl border border-gray-900 shadow-lg ${
        isResizing ? '' : 'transition-all duration-300'
      } relative ${
        isEditMode ? `border-blue-500/30 bg-black/90` : 'hover:shadow-gray-900/20'
      } ${widthClasses[width]} self-start ${isResizing ? 'z-50' : ''}`}
      style={{ 
        height: `${currentHeight}px`,
        position: isResizing ? 'absolute' : 'static',
        top: isResizing ? 0 : 'auto',
        left: isResizing ? 0 : 'auto',
        right: isResizing ? 0 : 'auto',
        transformOrigin: 'top'
      }}
    >
      {/* Draggable Content Area */}
      <div
        className={`h-full p-4 ${
          isEditMode && !isResizing && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        {...(isEditMode && !isEditing && !isResizing ? dragHandleProps : {})}
      >
        {/* Content */}
        <div 
          className={`h-full overflow-y-auto relative ${isEditing ? 'pb-0' : 'pb-2'}`}
          style={{ 
            maxHeight: `${currentHeight - 32}px` // Account for padding
          }}
        >
          {isEditing ? (
            <div className="h-full flex flex-col">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                placeholder="# Heading 1
## Heading 2

**Bold** and *italic* text

- [x] Task list
- [ ] Unchecked item

> Blockquote

```javascript
// Code block
console.log('Hello!');
```

| Table | Header |
|-------|--------|
| Cell  | Data   |

[Link](https://example.com)"
              />
              <div className="flex items-center justify-between space-x-2 mt-2">
                <a
                  href="/markdown-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Markdown Guide
                </a>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit();
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`prose prose-invert prose-base max-w-none h-full overflow-y-auto cursor-text
                prose-headings:text-gray-200 prose-headings:font-bold
                prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6 prose-h1:font-bold
                prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5 prose-h2:font-bold  
                prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4 prose-h3:font-semibold
                prose-h4:text-base prose-h4:mb-2 prose-h4:mt-3 prose-h4:font-semibold
                prose-h5:text-sm prose-h5:mb-1 prose-h5:mt-2 prose-h5:font-semibold
                prose-h6:text-xs prose-h6:mb-1 prose-h6:mt-2 prose-h6:font-semibold prose-h6:uppercase
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-sm
                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-200 prose-strong:font-semibold
                prose-em:text-gray-300 prose-em:italic
                prose-code:text-blue-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                prose-blockquote:border-l-blue-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:text-gray-400 prose-blockquote:italic prose-blockquote:my-4
                prose-ul:text-gray-300 prose-ul:mb-4 prose-ul:pl-6 prose-ul:text-sm
                prose-ol:text-gray-300 prose-ol:mb-4 prose-ol:pl-6 prose-ol:text-sm
                prose-li:text-gray-300 prose-li:mb-1 prose-li:text-sm
                prose-table:border-collapse prose-table:border prose-table:border-gray-700
                prose-thead:bg-gray-800 
                prose-th:border prose-th:border-gray-700 prose-th:px-3 prose-th:py-2 prose-th:text-gray-200 prose-th:font-semibold prose-th:text-sm
                prose-td:border prose-td:border-gray-700 prose-td:px-3 prose-td:py-2 prose-td:text-gray-300 prose-td:text-sm
                prose-hr:border-gray-700 prose-hr:my-6
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                [&_.hljs]:bg-gray-800 [&_.hljs]:text-gray-300
                [&_input[type="checkbox"]]:mr-2 [&_input[type="checkbox"]]:accent-blue-500 ${
                  isEditMode ? 'hover:bg-gray-800/30 rounded p-2 transition-colors' : ''
                }`}
              onClick={handleEditClick}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  // Custom heading components with explicit sizing
                  h1: ({children, ...props}) => (
                    <h1 className="text-2xl font-bold text-gray-200 mb-4 mt-6" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({children, ...props}) => (
                    <h2 className="text-xl font-bold text-gray-200 mb-3 mt-5" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({children, ...props}) => (
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 mt-4" {...props}>
                      {children}
                    </h3>
                  ),
                  h4: ({children, ...props}) => (
                    <h4 className="text-base font-semibold text-gray-200 mb-2 mt-3" {...props}>
                      {children}
                    </h4>
                  ),
                  h5: ({children, ...props}) => (
                    <h5 className="text-sm font-semibold text-gray-200 mb-1 mt-2" {...props}>
                      {children}
                    </h5>
                  ),
                  h6: ({children, ...props}) => (
                    <h6 className="text-xs font-semibold text-gray-200 mb-1 mt-2 uppercase" {...props}>
                      {children}
                    </h6>
                  ),
                  // Custom paragraph component
                  p: ({children, ...props}) => (
                    <p className="text-sm text-gray-300 leading-relaxed mb-4" {...props}>
                      {children}
                    </p>
                  ),
                  // Custom components for better styling
                  table: ({children, ...props}) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full" {...props}>{children}</table>
                    </div>
                  ),
                  // Style task list items
                  li: ({children, className, ...props}) => {
                    if (className?.includes('task-list-item')) {
                      return (
                        <li className="list-none flex items-start gap-2" {...props}>
                          {children}
                        </li>
                      );
                    }
                    return <li className="text-sm text-gray-300" {...props}>{children}</li>;
                  },
                  // Style checkboxes in task lists
                  input: ({type, ...props}) => {
                    if (type === 'checkbox') {
                      return <input type="checkbox" className="mt-1" {...props} />;
                    }
                    return <input type={type} {...props} />;
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Controls - Outside draggable area */}
      {isEditMode && (
        <>
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick?.();
            }}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors group cursor-pointer"
            title="Delete Textbox"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Resize Handle - Outside draggable area */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleResizeStart(e);
            }}
            className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize group flex items-end justify-center"
            title="Drag to resize height"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="w-12 h-2 bg-gray-600 group-hover:bg-gray-500 rounded-full transition-colors flex items-center justify-center mb-1">
              <div className="w-8 h-0.5 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TextboxCard; 