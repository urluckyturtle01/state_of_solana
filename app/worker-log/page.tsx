'use client';

import { useState, useEffect } from 'react';
import WorkerLogHeader from './components/WorkerLogHeader';
import WorkerLogsArea from './components/WorkerLogsArea';
import WorkerJobsArea from './components/WorkerJobsArea';
import TweetGeneratorModal from './components/TweetGeneratorModal';

export default function WorkerLogPage() {
  const [lastUpdate, setLastUpdate] = useState('—');
  const [mobileTab, setMobileTab] = useState('logs');
  const [tweetModalOpen, setTweetModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="worker-log-body">
      <div className="worker-log-container">
        <WorkerLogHeader lastUpdate={lastUpdate} onOpenTweetModal={() => setTweetModalOpen(true)} />

        <div className="worker-log-mobile-tabs">
          <div className="worker-log-mobile-tabs-inner">
            <button
              type="button"
              className={`worker-log-mobile-tab ${mobileTab === 'logs' ? 'active' : ''}`}
              onClick={() => setMobileTab('logs')}
            >
              Logs
            </button>
            <button
              type="button"
              className={`worker-log-mobile-tab ${mobileTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setMobileTab('jobs')}
            >
              Job Runs
            </button>
          </div>
        </div>

        <div className="worker-log-body-grid">
          <WorkerLogsArea onLastUpdate={setLastUpdate} mobileTab={mobileTab} />
          <WorkerJobsArea mobileTab={mobileTab} />
        </div>
      </div>

      <TweetGeneratorModal open={tweetModalOpen} onClose={() => setTweetModalOpen(false)} />
    </div>
  );
}
