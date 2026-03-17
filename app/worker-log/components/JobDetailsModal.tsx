'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  title: string;
  content: string | null;
  onClose: () => void;
};

export default function JobDetailsModal({ title, content, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const modalContent = (
    <div
      className="worker-log-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="worker-log-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="worker-log-modal-header">
          <h3 id="modal-title" className="worker-log-modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="worker-log-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="worker-log-modal-body">
          {content ? (
            <pre className="worker-log-modal-pre">
              <code>{content}</code>
            </pre>
          ) : (
            <p className="worker-log-modal-empty">No data available</p>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
