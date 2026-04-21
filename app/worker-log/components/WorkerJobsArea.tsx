'use client';

import { useState, useEffect, useCallback } from 'react';
import WorkerJobsHeader from './WorkerJobsHeader';
import WorkerJobCard, { type Job } from './WorkerJobCard';
import {
  jobCategories,
  jobMatchesCategory,
  jobMatchesPage,
  jobPages,
} from '../utils/job-pages';

export default function WorkerJobsArea({ mobileTab }: { mobileTab: string }) {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [openJobIds, setOpenJobIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(() => {
    fetch('/api/worker-jobs')
      .then((r) => r.json())
      .then((data) => {
        setAllJobs(data.jobs || []);
        setError(null);
      })
      .catch(() => setError('Error loading jobs'));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const id = setInterval(loadJobs, 3000);
    return () => clearInterval(id);
  }, [loadJobs]);

  const categories = [
    ...new Set(allJobs.flatMap((j) => jobCategories(j))),
  ].sort() as string[];
  let subcategoryPages = [
    ...new Set(allJobs.flatMap((j) => jobPages(j))),
  ].sort() as string[];
  if (categoryFilter !== 'all') {
    subcategoryPages = subcategoryPages.filter((p) =>
      p.split('-')[0] === categoryFilter
    );
  }

  const filteredJobs = allJobs.filter((j) => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (!jobMatchesCategory(j, categoryFilter)) return false;
    if (!jobMatchesPage(j, subcategoryFilter)) return false;
    return true;
  });

  const toggleJob = (id: number) => {
    setOpenJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requeueJob = useCallback(async (id: number) => {
    const res = await fetch('/api/worker-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || 'Failed');
    }
  }, []);

  const copySqlHash = useCallback((hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hash) return;
    const btn = e.currentTarget as HTMLButtonElement;
    const orig = btn.innerHTML;
    const showTick = () => {
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(hash).then(showTick).catch(showTick);
    } else {
      const ta = document.createElement('textarea');
      ta.value = hash;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showTick();
    }
  }, []);

  const onCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter('all');
  }, []);

  const isVisible = mobileTab === 'jobs';
  const canRequeue = ['partial', 'completed', 'failed', 'failed_permanent'];

  return (
    <div
      className={`worker-log-jobs-panel ${isVisible ? 'mobile-active' : ''}`}
      id="jobs-panel"
    >
      <WorkerJobsHeader
        jobsCount={filteredJobs.length}
        categories={categories}
        subcategoryPages={subcategoryPages}
        categoryFilter={categoryFilter}
        subcategoryFilter={subcategoryFilter}
        statusFilter={statusFilter}
        onCategoryChange={onCategoryChange}
        onSubcategoryChange={setSubcategoryFilter}
        onStatusChange={setStatusFilter}
      />
      <div className="worker-log-jobs-list" id="jobs-list">
        {error ? (
          <div className="worker-log-empty-state">{error}</div>
        ) : !filteredJobs.length ? (
          <div className="worker-log-empty-state">No jobs found</div>
        ) : (
          filteredJobs.map((job) => (
            <WorkerJobCard
              key={job.id}
              job={job}
              isOpen={openJobIds.has(job.id)}
              onToggle={() => toggleJob(job.id)}
              onRequeue={requeueJob}
              onRequeueSuccess={() => setTimeout(loadJobs, 800)}
              onCopyHash={copySqlHash}
              canRequeue={canRequeue.includes(job.status)}
            />
          ))
        )}
      </div>
    </div>
  );
}
