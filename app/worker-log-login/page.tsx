'use client';

import { useState } from 'react';

export default function WorkerLogLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/worker-log-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid password');
        setLoading(false);
        return;
      }
      // Full page redirect ensures cookie is sent and avoids cached prefetched layout
      window.location.href = '/worker-log';
    } catch {
      setError('Connection failed');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111214',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#18191b',
          padding: 32,
          borderRadius: 12,
          border: '1px solid #2a2b2d',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          Worker Log
        </h1>
        <p
          style={{
            color: '#8b8d90',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          Enter password to access
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 14,
            background: '#222426',
            border: '1px solid #2a2b2d',
            borderRadius: 6,
            color: '#fff',
            marginBottom: 16,
            outline: 'none',
          }}
        />
        {error && (
          <p
            style={{
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 14,
            fontWeight: 500,
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
