'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  jobCategories,
  jobMatchesCategory,
  jobMatchesPage,
  jobPages,
  pageMatchesCategory,
} from '../utils/job-pages';

type Job = {
  id: number;
  sqlHash: string;
  chartTitle: string;
  page: string | null;
  pages?: string[];
  rowCount: number;
  status: string;
};

export default function TweetGeneratorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pageFilter, setPageFilter] = useState('all');
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [optionalPrompt, setOptionalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [tweets, setTweets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(() => {
    fetch('/api/worker-jobs')
      .then((r) => r.json())
      .then((data) => {
        const list = (data.jobs || []).filter((j: Job) => j.rowCount > 0);
        setJobs(list);
      })
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    if (open) loadJobs();
  }, [open, loadJobs]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().slice(0, 10);
    if (!startDate) setStartDate(start);
    if (!endDate) setEndDate(end);
  }, []);

  const toggleJob = (sqlHash: string) => {
    setSelectedHashes((prev) => {
      const next = new Set(prev);
      if (next.has(sqlHash)) next.delete(sqlHash);
      else next.add(sqlHash);
      return next;
    });
  };

  const categories = [...new Set(jobs.flatMap((j) => jobCategories(j)))].sort() as string[];
  let pageOptions = [...new Set(jobs.flatMap((j) => jobPages(j)))].sort() as string[];
  if (categoryFilter !== 'all') {
    pageOptions = pageOptions.filter((p) => pageMatchesCategory(p, categoryFilter));
  }

  const filteredJobs = jobs.filter((j) => {
    if (!jobMatchesCategory(j, categoryFilter)) return false;
    if (!jobMatchesPage(j, pageFilter)) return false;
    return true;
  });

  const selectAll = () => {
    if (selectedHashes.size === filteredJobs.length) {
      setSelectedHashes(new Set());
    } else {
      setSelectedHashes(new Set(filteredJobs.map((j) => j.sqlHash)));
    }
  };

  const onCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPageFilter('all');
  };

  const handleGenerate = async () => {
    if (selectedHashes.size === 0) {
      setError('Select at least one chart');
      return;
    }
    if (!startDate || !endDate) {
      setError('Select date range');
      return;
    }
    setLoading(true);
    setError(null);
    setTweets([]);
    try {
      const res = await fetch('/api/generate-tweet-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sqlHashes: Array.from(selectedHashes),
          startDate,
          endDate,
          optionalPrompt: optionalPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTweets(data.tweets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const cleanTweet = (t: string) => t.replace(/\\n/g, '\n');

  const copyTweet = (text: string) => {
    const cleaned = cleanTweet(text);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cleaned);
    } else {
      const ta = document.createElement('textarea');
      ta.value = cleaned;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const copyAll = () => {
    const full = tweets
      .map((t, i) => `${i + 1}/${tweets.length}\n\n${cleanTweet(t)}`)
      .join('\n\n---\n\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(full);
    }
  };

  if (!open) return null;

  return (
    <div className="worker-log-tweet-modal-overlay" onClick={onClose}>
      <div
        className="worker-log-tweet-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tweet-modal-title"
      >
        <div className="worker-log-tweet-modal-header">
          <h2 id="tweet-modal-title" className="worker-log-tweet-modal-title">
            Generate Tweet Thread
          </h2>
          <button
            type="button"
            className="worker-log-tweet-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="worker-log-tweet-modal-body">
          <div className="worker-log-tweet-modal-left">
            <div className="worker-log-tweet-modal-filters">
              <select
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="worker-log-tweet-modal-select"
              >
                <option value="all">Category: All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="worker-log-tweet-modal-select"
              >
                <option value="all">Page: All</option>
                {pageOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="worker-log-tweet-modal-section-title">Select charts</div>
              <button type="button" className="worker-log-tweet-modal-select-all" onClick={selectAll}>
                {selectedHashes.size === filteredJobs.length ? 'Deselect all' : 'Select all'}
              </button>
              <div className="worker-log-tweet-modal-list">
                {filteredJobs.length === 0 ? (
                  <div className="worker-log-tweet-modal-empty">No jobs with data. Run some jobs first.</div>
                ) : (
                  filteredJobs.map((job) => (
                    <label key={job.id} className="worker-log-tweet-modal-row">
                      <input
                        type="checkbox"
                        checked={selectedHashes.has(job.sqlHash)}
                        onChange={() => toggleJob(job.sqlHash)}
                      />
                      <span className="worker-log-tweet-modal-row-title" title={job.chartTitle}>
                        {job.chartTitle}
                      </span>
                      <span className="worker-log-tweet-modal-row-meta">
                        {job.rowCount.toLocaleString()} rows
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="worker-log-tweet-modal-section-title">Date range</div>
              <div className="worker-log-tweet-modal-dates">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="worker-log-tweet-modal-date-input"
                />
                <span className="worker-log-tweet-modal-date-sep">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="worker-log-tweet-modal-date-input"
                />
              </div>
            </div>

            <div>
              <div className="worker-log-tweet-modal-section-title">Optional prompt</div>
              <textarea
                placeholder="e.g. Focus on TVL trends, compare DEXs..."
                value={optionalPrompt}
                onChange={(e) => setOptionalPrompt(e.target.value)}
                className="worker-log-tweet-modal-prompt"
                rows={2}
              />
            </div>

            <button
              type="button"
              className="worker-log-tweet-modal-generate"
              onClick={handleGenerate}
              disabled={loading || selectedHashes.size === 0 || filteredJobs.length === 0}
            >
              {loading ? 'Generating…' : 'Generate Tweet'}
            </button>

            {error && <div className="worker-log-tweet-modal-error">{error}</div>}
          </div>

          <div className="worker-log-tweet-modal-right">
            <div className="worker-log-tweet-modal-result-header">
              <span>Generated thread</span>
              {tweets.length > 0 && (
                <button type="button" className="worker-log-tweet-modal-copy-all" onClick={copyAll}>
                  Copy all
                </button>
              )}
            </div>
            {tweets.length === 0 ? (
              <div className="worker-log-tweet-modal-placeholder">
                {loading ? (
                  'Generating…'
                ) : (
                  'Select charts, set date range, and click Generate Tweet.'
                )}
              </div>
            ) : (
              <div className="worker-log-tweet-modal-thread">
                {tweets.map((t, i) => (
                  <div key={i} className="worker-log-tweet-modal-tweet-card">
                    <span className="worker-log-tweet-modal-tweet-num">{i + 1}</span>
                    <div className="worker-log-tweet-modal-tweet-text">
                      {cleanTweet(t)}
                    </div>
                    <button
                      type="button"
                      className="worker-log-tweet-modal-copy-one"
                      onClick={() => copyTweet(t)}
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
