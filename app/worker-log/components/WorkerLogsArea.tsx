'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const LOG_PAGE_SIZE = 100;
const LOG_DISPLAY_CAP = 500;

function escHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lineToClass(line: string): string {
  if (/❌|ERROR|Error|Failed/.test(line)) return 'worker-log-line error';
  if (/✅|SUCCESS|completed/.test(line)) return 'worker-log-line success';
  if (/⚠️|WARNING|Warning/.test(line)) return 'worker-log-line warning';
  if (/🔄|Processing|Fetching/.test(line)) return 'worker-log-line info';
  return 'worker-log-line';
}

function lineToHtml(line: string, searchTerm: string): string {
  const tsMatch = line.match(
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z)?|\d{2}:\d{2}:\d{2}(?:\.\d{3})?)(\s+)/
  );
  let html: string;
  if (tsMatch) {
    html =
      '<span class="log-timestamp">' +
      escHtml(tsMatch[1]) +
      '</span>' +
      tsMatch[2] +
      escHtml(line.slice(tsMatch[0].length));
  } else {
    html = escHtml(line);
  }
  if (searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase())) {
    const rx = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    html = html.replace(rx, '<span class="worker-log-highlight">$1</span>');
  }
  return html;
}

export default function WorkerLogsArea({
  onLastUpdate,
  mobileTab,
}: {
  onLastUpdate: (v: string) => void;
  mobileTab: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCleared, setDisplayCleared] = useState(false);
  const clearedMarkerRef = useRef<string>('');
  const [rawLogContent, setRawLogContent] = useState('');
  const [logLoadState, setLogLoadState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading');
  const [allLines, setAllLines] = useState<string[]>([]);
  const [displayedStartIndex, setDisplayedStartIndex] = useState(0);
  const [displayedEndIndex, setDisplayedEndIndex] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const loadMoreTopRef = useRef<HTMLDivElement>(null);
  const loadMoreBottomRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayedStartRef = useRef(displayedStartIndex);
  const loadMoreThrottleRef = useRef(0);
  displayedStartRef.current = displayedStartIndex;

  const LOAD_MORE_COOLDOWN_MS = 400;

  const renderLog = useCallback(() => {
    if (!linesRef.current) return;
    const fragment = document.createDocumentFragment();
    for (let i = displayedStartIndex; i < displayedEndIndex && i < allLines.length; i++) {
      const line = allLines[i];
      const div = document.createElement('div');
      div.className = lineToClass(line);
      div.innerHTML = lineToHtml(line, searchTerm);
      div.dataset.index = String(i);
      fragment.appendChild(div);
    }
    linesRef.current.innerHTML = '';
    linesRef.current.appendChild(fragment);

    if (loadMoreTopRef.current) {
      loadMoreTopRef.current.style.display = displayedStartIndex > 0 ? 'flex' : 'none';
      const countEl = loadMoreTopRef.current.querySelector('.load-more-count');
      if (countEl) countEl.textContent = String(displayedStartIndex);
    }
    if (loadMoreBottomRef.current) {
      loadMoreBottomRef.current.style.display =
        displayedEndIndex < allLines.length ? 'flex' : 'none';
      const countEl = loadMoreBottomRef.current.querySelector('.load-more-count');
      if (countEl) countEl.textContent = String(allLines.length - displayedEndIndex);
    }

    onLastUpdate(new Date().toLocaleTimeString());
  }, [displayedStartIndex, displayedEndIndex, allLines, searchTerm, onLastUpdate]);

  const loadLog = useCallback(
    (forceReset: boolean) => {
      fetch('/api/worker-log')
        .then((r) => {
          if (!r.ok) {
            setLogLoadState('error');
            throw new Error(`Failed to load log (${r.status})`);
          }
          return r.text();
        })
        .then((data) => {
          setRawLogContent(data);
          let contentToShow = data;
          if (displayCleared && clearedMarkerRef.current) {
            const idx = data.indexOf(clearedMarkerRef.current);
            contentToShow = idx >= 0 ? data.slice(idx + clearedMarkerRef.current.length) : data;
          }
          const lines = contentToShow.split('\n');
          const nonEmpty = lines.filter((l) => l.trim());

          if (displayCleared && contentToShow.trim() === '') {
            setAllLines([]);
            setDisplayedStartIndex(0);
            setDisplayedEndIndex(0);
            setLogLoadState('empty');
            onLastUpdate(new Date().toLocaleTimeString());
            return;
          }

          if (!nonEmpty.length) {
            setAllLines([]);
            setDisplayedStartIndex(0);
            setDisplayedEndIndex(0);
            setLogLoadState('empty');
            onLastUpdate(new Date().toLocaleTimeString());
            return;
          }

          setLogLoadState('ready');
          setAllLines(nonEmpty);

          const len = nonEmpty.length;
          if (forceReset) {
            setDisplayedStartIndex(Math.max(0, len - LOG_PAGE_SIZE));
            setDisplayedEndIndex(len);
          } else {
            setDisplayedStartIndex((prevStart) =>
              Math.min(prevStart, Math.max(0, len - 1))
            );
            setDisplayedEndIndex((prevEnd) => {
              const newEnd = Math.min(prevEnd, len);
              const newStart = Math.min(displayedStartRef.current, Math.max(0, len - 1));
              return newEnd <= newStart ? len : newEnd;
            });
          }

          if (containerRef.current) {
            const wasAtBottom =
              containerRef.current.scrollHeight -
                containerRef.current.scrollTop -
                containerRef.current.clientHeight <
              120;
            if (forceReset && wasAtBottom) {
              requestAnimationFrame(() => {
                if (containerRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              });
            }
          }
        })
        .catch(() => {
          setLogLoadState((s) => (s === 'loading' ? 'error' : s));
          onLastUpdate(new Date().toLocaleTimeString());
        });
    },
    [displayCleared, onLastUpdate]
  );

  // Re-render when lines or indices change
  useEffect(() => {
    renderLog();
  }, [allLines, displayedStartIndex, displayedEndIndex, searchTerm, renderLog]);

  // Initial load
  useEffect(() => {
    loadLog(true);
  }, [loadLog]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => loadLog(false), 3000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, loadLog]);

  const loadMoreUp = () => {
    if (displayedStartIndex <= 0) return;
    const now = Date.now();
    if (now - loadMoreThrottleRef.current < LOAD_MORE_COOLDOWN_MS) return;
    loadMoreThrottleRef.current = now;
    const container = containerRef.current;
    if (!container) return;
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;
    const newStart = Math.max(0, displayedStartIndex - LOG_PAGE_SIZE);

    setDisplayedStartIndex(newStart);
    setDisplayedEndIndex((prev) => {
      if (prev - newStart > LOG_DISPLAY_CAP) return newStart + LOG_DISPLAY_CAP;
      return prev;
    });

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight);
      }
    });
  };

  const loadMoreDown = () => {
    if (displayedEndIndex >= allLines.length) return;
    const now = Date.now();
    if (now - loadMoreThrottleRef.current < LOAD_MORE_COOLDOWN_MS) return;
    loadMoreThrottleRef.current = now;
    const container = containerRef.current;
    if (!container) return;
    const prevScrollTop = container.scrollTop;
    const newEnd = Math.min(allLines.length, displayedEndIndex + LOG_PAGE_SIZE);

    setDisplayedEndIndex(newEnd);
    setDisplayedStartIndex((prev) => {
      if (newEnd - prev > LOG_DISPLAY_CAP) return newEnd - LOG_DISPLAY_CAP;
      return prev;
    });

    requestAnimationFrame(() => {
      if (container) container.scrollTop = prevScrollTop;
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    const top = loadMoreTopRef.current;
    const bottom = loadMoreBottomRef.current;
    if (!container || !top || !bottom) return;

    const obsTop = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedStartIndex > 0) loadMoreUp();
      },
      { root: container, rootMargin: '100px', threshold: 0 }
    );
    const obsBottom = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedEndIndex < allLines.length) loadMoreDown();
      },
      { root: container, rootMargin: '100px', threshold: 0 }
    );
    obsTop.observe(top);
    obsBottom.observe(bottom);
    return () => {
      obsTop.disconnect();
      obsBottom.disconnect();
    };
  }, [displayedStartIndex, displayedEndIndex, allLines.length]);

  const toggleAutoRefresh = () => {
    setAutoRefresh((a) => !a);
  };

  const clearLog = () => {
    if (confirm('Clear display? Only new logs will appear. (log file untouched)')) {
      setDisplayCleared(true);
      clearedMarkerRef.current = rawLogContent.slice(-600) || '';
      setAllLines([]);
      setDisplayedStartIndex(0);
      setDisplayedEndIndex(0);
      onLastUpdate(new Date().toLocaleTimeString());
    }
  };

  const scrollToBottom = () => {
    if (displayedEndIndex < allLines.length) {
      setDisplayedStartIndex(Math.max(0, allLines.length - LOG_PAGE_SIZE));
      setDisplayedEndIndex(allLines.length);
    }
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  };

  const copyLogs = () => {
    const text = rawLogContent || linesRef.current?.innerText || '';
    if (!text.trim()) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const [shortcutHint, setShortcutHint] = useState('Ctrl+F');
  useEffect(() => {
    setShortcutHint(
      typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac')
        ? '⌘F'
        : 'Ctrl+F'
    );
  }, []);

  const isVisible = mobileTab === 'logs';

  return (
    <div
      className={`worker-log-log-panel ${isVisible ? 'mobile-active' : ''}`}
      id="log-panel"
    >
      <div className="worker-log-toolbar">
        <button
          type="button"
          className="worker-log-toolbar-btn"
          onClick={copyLogs}
          title="Copy logs"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <span style={{ fontSize: 12, color: '#8b8d90' }}>
          <span className="line-count">{allLines.length}</span> lines
        </span>
        <div className="spacer" />
        <div className="worker-log-search-wrap">
          <span style={{ color: '#8b8d90', flexShrink: 0, display: 'flex' }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            id="search-input"
            type="text"
            placeholder="Find in logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="worker-log-search-shortcut">{shortcutHint}</span>
        </div>
        <button
          type="button"
          className="worker-log-toolbar-btn icon-only"
          onClick={() => {
            setDisplayCleared(false);
            clearedMarkerRef.current = '';
            loadLog(true);
          }}
          title="Refresh"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M21 21v-5h-5" />
          </svg>
        </button>
        <button
          type="button"
          className="worker-log-toolbar-btn icon-only"
          onClick={clearLog}
          title="Clear"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
        <button
          type="button"
          className="worker-log-toolbar-btn icon-only"
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          className={`worker-log-auto-switch ${autoRefresh ? 'on' : 'off'}`}
          onClick={toggleAutoRefresh}
          title={autoRefresh ? 'Auto refresh: ON' : 'Auto refresh: OFF'}
          aria-label="Auto refresh"
        />
      </div>
      <div className="worker-log-container-el" ref={containerRef} id="log-container">
        {displayCleared && !allLines.length ? (
          <div className="worker-log-empty-state">Cleared. New logs will appear here.</div>
        ) : logLoadState === 'loading' ? (
          <div className="worker-log-empty-state">Loading log…</div>
        ) : logLoadState === 'empty' ? (
          <div className="worker-log-empty-state">
            Log file is empty. Restart the worker with output redirected:
            <br />
            <code style={{ fontSize: 11, color: '#a1a1aa' }}>
              nohup python3 -u pipeline/trino_worker.py &gt;&gt; trino_worker.log 2&gt;&amp;1 &amp;
            </code>
          </div>
        ) : logLoadState === 'error' ? (
          <div className="worker-log-empty-state">Failed to load log. Check auth or server logs.</div>
        ) : (
          <>
            <div
              ref={loadMoreTopRef}
              className="worker-log-load-more"
              style={{ display: 'none' }}
              onClick={loadMoreUp}
              title="Click or scroll up to load older logs"
            >
              <span className="load-more-count">0</span> older lines — click or scroll up to
              load more
            </div>
            <div ref={linesRef} id="log-lines" />
            <div
              ref={loadMoreBottomRef}
              className="worker-log-load-more"
              style={{ display: 'none' }}
              onClick={loadMoreDown}
              title="Click or scroll down to load newer logs"
            >
              <span className="load-more-count">0</span> newer lines — click or scroll down to
              load more
            </div>
          </>
        )}
      </div>
    </div>
  );
}
