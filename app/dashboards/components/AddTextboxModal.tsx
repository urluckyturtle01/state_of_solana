"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AddTextboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, width: 'half' | 'full') => void;
}

export default function AddTextboxModal({ isOpen, onClose, onSubmit }: AddTextboxModalProps) {
  const [content, setContent] = useState("");
  const [width, setWidth] = useState<'half' | 'full'>('half');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim(), width);
      setContent("");
      setWidth('half');
      onClose();
    }
  };

  const handleClose = () => {
    setContent("");
    setWidth('half');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-200">Add Textbox</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content (Markdown supported)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your content here... You can use **bold**, *italic*, [links](url), etc."
              className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports markdown formatting: **bold**, *italic*, [links](url), `code`, etc.
            </p>
          </div>

          {/* Width Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Width
            </label>
            <select
              value={width}
              onChange={(e) => setWidth(e.target.value as 'half' | 'full')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="half">Half Width (50%)</option>
              <option value="full">Full Width (100%)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Add Textbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 