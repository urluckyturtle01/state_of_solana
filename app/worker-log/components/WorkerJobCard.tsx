'use client';

import { useState } from 'react';
import RequeueButton from './RequeueButton';
import JobDetailsModal from './JobDetailsModal';
import { jobPages } from '../utils/job-pages';

export type Job = {
  id: number;
  sqlHash: string;
  jobType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  chartTitle: string;
  page: string | null;
  /** All dashboard pages that use this sql_hash (shared SQL across pages). */
  pages?: string[];
  rowCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
};

function escHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function CopyHashButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      className="worker-log-sql-hash-copy"
      onClick={onClick}
      title="Copy hash"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="8" y="8" width="11" height="11" rx="0" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

type Props = {
  job: Job;
  isOpen: boolean;
  onToggle: () => void;
  onRequeue: (id: number) => Promise<void>;
  onRequeueSuccess: () => void;
  onCopyHash: (hash: string, e: React.MouseEvent) => void;
  canRequeue: boolean;
};

export default function WorkerJobCard({
  job,
  isOpen,
  onToggle,
  onRequeue,
  onRequeueSuccess,
  onCopyHash,
  canRequeue,
}: Props) {
  const [modal, setModal] = useState<{ title: string; content: string | null } | null>(null);
  const [loadingChip, setLoadingChip] = useState<string | null>(null);

  const chipTypes = ['configYml', 'configJson', 'sqlQuery', 'jsonData'] as const;
  const chipTitles: Record<(typeof chipTypes)[number], string> = {
    configYml: 'Config YAML',
    configJson: 'Config JSON',
    sqlQuery: 'SQL Query',
    jsonData: 'JSON Data',
  };

  const handleChipClick = async (type: (typeof chipTypes)[number]) => {
    setLoadingChip(type);
    try {
      const res = await fetch(`/api/worker-job-details/${job.sqlHash}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      const content = data[type] ?? null;
      setModal({ title: chipTitles[type], content });
    } catch {
      setModal({ title: 'Error', content: 'Failed to load data' });
    } finally {
      setLoadingChip(null);
    }
  };

  const dotClass = `worker-log-dot-${job.status}`;
  const badgeClass = `worker-log-badge-${job.status}`;
  const ts = job.completedAt || job.startedAt;
  const lastRun = ts
    ? new Date(ts).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="worker-log-job-item" id={`job-${job.id}`}>
      <div
        className={`worker-log-job-header ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
      >
        <div className={`worker-log-job-status-dot ${dotClass}`} />
        <div className="worker-log-job-meta">
          <div className="worker-log-job-title" title={job.chartTitle}>
            {job.chartTitle}
          </div>
          <div className="worker-log-job-sub">
            {jobPages(job).length ? (
              jobPages(job).map((p) => (
                <span key={p} className="tag">
                  {p}
                </span>
              ))
            ) : (
              <span className="tag">—</span>
            )}
          </div>
        </div>
        <span className="worker-log-job-chevron">▶</span>
      </div>
      <div className={`worker-log-job-body ${isOpen ? 'open' : ''}`}>
        <div className="worker-log-detail-row">
          <span className="worker-log-detail-label">Status</span>
          <span className="worker-log-detail-value">
            <span className={`worker-log-status-badge ${badgeClass}`}>
              {job.status}
            </span>
          </span>
        </div>
        <div className="worker-log-detail-row">
          <span className="worker-log-detail-label">Rows in DB</span>
          <span className="worker-log-detail-value">
            {job.rowCount.toLocaleString()}
          </span>
        </div>
        <div className="worker-log-detail-row">
          <span className="worker-log-detail-label">Attempts</span>
          <span className="worker-log-detail-value">
            {job.attempts} / {job.maxAttempts}
          </span>
        </div>
        <div className="worker-log-detail-row">
          <span className="worker-log-detail-label">Last run</span>
          <span className="worker-log-detail-value">{lastRun}</span>
        </div>
        <div className="worker-log-detail-row">
          <span className="worker-log-detail-label">SQL hash</span>
          <span className="worker-log-detail-value worker-log-sql-hash-row">
            <span style={{ fontSize: 10, color: '#8b8d90' }}>{job.sqlHash}</span>
            <CopyHashButton onClick={(e) => onCopyHash(job.sqlHash, e)} />
          </span>
        </div>
        {job.errorMessage && (
          <div
            className="worker-log-error-box"
            dangerouslySetInnerHTML={{ __html: escHtml(job.errorMessage) }}
          />
        )}
        <div className="worker-log-detail-chips">
          <button
            type="button"
            className="worker-log-detail-chip"
            onClick={(e) => {
              e.stopPropagation();
              handleChipClick('configYml');
            }}
            disabled={loadingChip !== null}
          >
            {loadingChip === 'configYml' ? '…' : 'config yml'}
          </button>
          <button
            type="button"
            className="worker-log-detail-chip"
            onClick={(e) => {
              e.stopPropagation();
              handleChipClick('configJson');
            }}
            disabled={loadingChip !== null}
          >
            {loadingChip === 'configJson' ? '…' : 'config json'}
          </button>
          <button
            type="button"
            className="worker-log-detail-chip"
            onClick={(e) => {
              e.stopPropagation();
              handleChipClick('sqlQuery');
            }}
            disabled={loadingChip !== null}
          >
            {loadingChip === 'sqlQuery' ? '…' : 'sql query'}
          </button>
          <button
            type="button"
            className="worker-log-detail-chip"
            onClick={(e) => {
              e.stopPropagation();
              handleChipClick('jsonData');
            }}
            disabled={loadingChip !== null}
          >
            {loadingChip === 'jsonData' ? '…' : 'json data'}
          </button>
        </div>
        {canRequeue && (
          <RequeueButton
            jobId={job.id}
            onRequeue={onRequeue}
            onSuccess={onRequeueSuccess}
          />
        )}
      </div>
      {modal && (
        <JobDetailsModal
          title={modal.title}
          content={modal.content}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
