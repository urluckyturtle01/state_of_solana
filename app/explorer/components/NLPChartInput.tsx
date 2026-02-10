"use client";

import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface NLPChartInputProps {
  onChartGenerated: (configuration: any, matchingApis: any[]) => void;
  availableApis: any[];
  disabled?: boolean;
}

interface NLPResponse {
  configuration: any;
  matchingApis: any[];
  originalQuery: string;
}

const NLPChartInput: React.FC<NLPChartInputProps> = ({
  onChartGenerated,
  availableApis,
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Example queries for suggestions
  const exampleQueries = [
    "Show me DEX volume over time",
    "Create a bar chart of NFT marketplace fees",
    "Display stablecoin market cap trends",
    "Show DeFi protocol revenue by category",
    "Create a line chart of transaction fees monthly",
    "Show me the top performing tokens this week",
    "Display trading volume by exchange",
    "Create a chart showing network usage over time"
  ];

  // Update suggestions based on input
  useEffect(() => {
    // Only show suggestions when the field is empty
    if (query.length === 0) {
      setSuggestions(exampleQueries.slice(0, 4));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || disabled) return;

    console.log('🚀 NLP Chart: Starting submission with query:', query.trim());
    console.log('📊 Available APIs count:', availableApis?.length || 0);

    setLoading(true);
    setError(null);

    try {
      console.log('📡 Making API call to /api/nlp-chart...');
      
      const response = await fetch('/api/nlp-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          availableApis
        })
      });

      console.log('📨 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NLPResponse = await response.json();
      console.log('✅ API Response data:', data);
      
      // Validate response data
      if (!data.configuration || !data.matchingApis) {
        console.error('❌ Invalid response data:', data);
        throw new Error('Invalid response: missing configuration or matchingApis');
      }
      
      // Call the callback with the generated configuration
      console.log('🎯 Calling onChartGenerated callback...');
      console.log('📋 Configuration to pass:', data.configuration);
      console.log('🔗 Matching APIs to pass:', data.matchingApis);
      
      try {
        onChartGenerated(data.configuration, data.matchingApis);
        console.log('✅ Callback executed successfully');
      } catch (callbackError) {
        console.error('❌ Callback execution failed:', callbackError);
        throw new Error('Failed to execute callback');
      }
      
      // Clear the input
      setQuery('');
      setShowSuggestions(false);
      
    } catch (err) {
      console.error('❌ NLP Chart Generation Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate chart');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Create Chart with AI</h3>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <div className="flex items-start p-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mt-1 mr-3 flex-shrink-0" />
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Only show suggestions on focus if field is empty
                if (query.length === 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Describe the chart you want to create... (e.g., 'Show me DEX volume over time')"
              className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none resize-none text-gray-900 placeholder-gray-500 min-h-[24px] max-h-32"
              rows={1}
              disabled={disabled || loading}
            />
            <button
              type="submit"
              disabled={!query.trim() || loading || disabled}
              className={`ml-2 p-2 rounded-lg transition-colors ${
                query.trim() && !loading && !disabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2">Suggestions:</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-3 text-sm text-gray-600">
        <p>
          <strong>Examples:</strong> "Show me DEX volume over time", "Create a bar chart of NFT fees", 
          "Display stablecoin trends", "Show protocol revenue by category"
        </p>
      </div>
    </div>
  );
};

export default NLPChartInput; 