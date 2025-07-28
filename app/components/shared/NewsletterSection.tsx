"use client";

import React, { useState } from 'react';

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }
      
      setIsSubscribed(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <section className="border-t border-gray-800">
        <div className="md:ml-48 px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 text-green-400 text-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Subscribed! Thanks for joining.</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t bg-gray-950/20 border-gray-900">
      <div className="md:ml-48 px-4 md:px-8 py-12">
        <div className="max-w-3xl mx-auto text-center">
          
          <p className="text-gray-500 text-xs mb-3">
            Get Solana insights delivered to your inbox.
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="flex-1 px-2 py-1.5 bg-gray-900/50 border border-gray-800/70 rounded text-white text-xs placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-700/50 focus:border-transparent"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors duration-200 border border-blue-500 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
            
            {error && (
              <p className="text-red-400 text-xs mt-1.5">{error}</p>
            )}
          </form>
          
          <p className="text-gray-600 text-xs mt-2">
            No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection; 