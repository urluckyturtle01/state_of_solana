'use client';

export default function WorkerLogHeader({
  lastUpdate,
  onOpenTweetModal,
}: {
  lastUpdate: string;
  onOpenTweetModal?: () => void;
}) {
  return (
    <div className="worker-log-header">
      <span className="worker-log-header-title">
        stateofsolana <span className="meta">/ Trino Worker</span>
      </span>
      <div className="worker-log-status">
        {onOpenTweetModal && (
          <button
            type="button"
            className="worker-log-tweet-btn"
            onClick={onOpenTweetModal}
            title="Generate tweet thread"
          >
            Generate Tweet
          </button>
        )}
        <span>
          <span className="worker-log-status-dot" />
          <span>Live</span>
        </span>
        <span title="Last updated">{lastUpdate}</span>
      </div>
    </div>
  );
}
