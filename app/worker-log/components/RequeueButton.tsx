'use client';

import { useState } from 'react';

type Props = {
  jobId: number;
  onRequeue: (id: number) => Promise<void>;
  onSuccess?: () => void;
};

export default function RequeueButton({ jobId, onRequeue, onSuccess }: Props) {
  const [status, setStatus] = useState<'idle' | 'queuing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('queuing');
    setErrorMsg('');
    try {
      await onRequeue(jobId);
      setStatus('success');
      onSuccess?.();
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'queuing':
        return 'Queuing…';
      case 'success':
        return '✓ Queued';
      case 'error':
        return `✗ ${errorMsg}`;
      default:
        return 'Re-queue as Pending';
    }
  };

  const getStyle = () => {
    if (status === 'success')
      return { borderColor: '#22c55e', color: '#22c55e' } as React.CSSProperties;
    if (status === 'error')
      return { borderColor: '#ef4444', color: '#ef4444' } as React.CSSProperties;
    return undefined;
  };

  return (
    <button
      className="worker-log-requeue-btn"
      id={`requeue-${jobId}`}
      onClick={handleClick}
      disabled={status === 'queuing'}
      style={getStyle()}
    >
      {getLabel()}
    </button>
  );
}
