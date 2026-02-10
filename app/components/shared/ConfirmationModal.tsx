"use client";

import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl border border-gray-800/50 p-8 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Icon and Header */}
        <div className="text-center mb-6">
          <div className="relative w-16 h-16 mx-auto mb-4">
            
            {/* Warning icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-red-400/90" />
            </div>
          </div>
          
          <h2 className={`text-xl font-medium mb-3 ${
            isDangerous 
              ? 'bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent'
          }`}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <div className="mb-8">
          <div className="text-gray-300 text-sm leading-relaxed text-center space-y-3">
            {message.split('\n\n').map((paragraph, index) => (
              <p key={index} className={index === 0 ? '' : 'pt-2'}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="flex-1 group relative overflow-hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 hover:from-gray-800 hover:via-gray-900 hover:to-gray-800 border border-gray-700/50 hover:border-gray-600/50 text-gray-100 font-medium py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-gray-400/10 to-gray-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center">
              <span className="text-sm font-medium">{cancelText}</span>
            </div>
          </button>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className={`flex-1 group relative overflow-hidden font-medium py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${
              isDangerous
                ? 'bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:via-red-600 hover:to-red-700 border border-red-600/50 hover:border-red-500/50 text-white'
                : 'bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-500 hover:via-purple-500 hover:to-teal-500 border border-blue-600/50 hover:border-blue-500/50 text-white'
            }`}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              isDangerous
                ? 'bg-gradient-to-r from-red-400/20 via-orange-400/20 to-yellow-400/20'
                : 'bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-teal-400/20'
            }`}></div>
            <div className="relative flex items-center justify-center">
              <span className="text-sm font-medium">{confirmText}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 