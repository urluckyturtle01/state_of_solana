// Modal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, subtitle }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render into document.body to bypass any parent clipping/stacking contexts
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative bg-black/80 border border-gray-900 rounded-xl p-4 w-11/12 max-w-7xl flex flex-col shadow-xl"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-900">
          <div>
            {title && (
              <h2 className="text-[16px] font-medium text-gray-100">{title}</h2>
            )}
            {subtitle && (
              <p className="text-gray-500 text-[12px] tracking-wide mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 rounded-full p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414
                   1.414L11.414 10l4.293 4.293a1 1 0 01-1.414
                   1.414L10 11.414l-4.293 4.293a1 1
                   0 01-1.414-1.414L8.586 10 4.293 5.707a1
                   1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
