'use client';

export default function WorkerLogHeader({ lastUpdate }: { lastUpdate: string }) {
  return (
    <div className="worker-log-header">
      <span className="worker-log-header-title">
        stateofsolana <span className="meta">/ Trino Worker</span>
      </span>
      <div className="worker-log-status">
        <span>
          <span className="worker-log-status-dot" />
          <span>Live</span>
        </span>
        <span title="Last updated">{lastUpdate}</span>
      </div>
    </div>
  );
}
