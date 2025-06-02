"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTogglePublic: (isPublic: boolean) => void;
  dashboardName: string;
  dashboardId: string;
  isPublic?: boolean;
  publicUrl?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onTogglePublic,
  dashboardName,
  dashboardId,
  isPublic: initialIsPublic = false,
  publicUrl: initialPublicUrl = "https://analytics.topledger.xyz/tl/public/dashboard_abc123"
}) => {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsPublic(initialIsPublic);
      setPublicUrl(initialPublicUrl);
      setCopied(false);
    }
  }, [isOpen, initialIsPublic, initialPublicUrl]);

  if (!isOpen) return null;

  const handleToggle = () => {
    const newPublicStatus = !isPublic;
    setIsPublic(newPublicStatus);
    
    // Generate URL when making public, clear when making private
    if (newPublicStatus) {
      const generatedUrl = `${window.location.origin}/public/${dashboardId}`;
      setPublicUrl(generatedUrl);
    } else {
      setPublicUrl("");
    }
    
    // Call the parent callback
    onTogglePublic(newPublicStatus);
  };

  const handleCopyUrl = async () => {
    if (publicUrl && isPublic) {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl border border-gray-800/50 p-8 max-w-lg w-full mx-4 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-100 mb-2">
            Share Dashboard
          </h2>
          <p className="text-gray-400 text-sm">
            Allow public access to this dashboard with a secret address.
          </p>
        </div>

        {/* Toggle Switch Row */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-gray-300 text-sm font-medium">Allow public access :</span>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              isPublic ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Secret Address Row */}
        <div className="space-y-2">
          <label className="text-gray-300 text-sm font-medium">Secret address :</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5">
              <input
                type="text"
                value={isPublic ? publicUrl : ""}
                readOnly
                placeholder={isPublic ? "" : "Enable public access to generate link"}
                className="w-full bg-transparent text-gray-300 text-sm focus:outline-none selection:bg-blue-500/30 placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleCopyUrl}
              disabled={!isPublic || !publicUrl}
              className={`p-2.5 rounded-lg border transition-all duration-200 ${
                isPublic && publicUrl
                  ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 text-gray-300 hover:text-white'
                  : 'bg-gray-800/30 border-gray-700/30 text-gray-500 cursor-not-allowed'
              }`}
              title={isPublic ? "Copy link" : "Enable public access first"}
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {copied && (
            <p className="text-green-400 text-xs animate-fade-in">
              Link copied to clipboard!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 