"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const EditableFields = dynamic(() => import('../components/EditableFields'), { ssr: false });

interface ApiData {
  endpoint: string;
  apiKey?: string;
  title: string;
  subtitle: string;
  page: string;
  pageName: string;
  menuId?: string;
  menuName?: string;
}

interface ApiListData {
  totalApis: number;
  extractedAt: string;
  apis: ApiData[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  description: string;
  example?: string;
}

interface EnrichedApiData extends ApiData {
  id: string;
  responseColumns: ColumnDefinition[];
  lastFetched?: string;
  fetchStatus: 'pending' | 'loading' | 'success' | 'error';
  fetchError?: string;
}

export default function ApiManagerPage() {
  const [apis, setApis] = useState<EnrichedApiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingResponses, setFetchingResponses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load APIs from S3 (with fallback to original JSON)
  const loadApis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      console.log('Loading APIs from S3...');
      
      // First, try to load from S3
      const s3Response = await fetch('/api/admin/load-api-data');
      const s3Result = await s3Response.json();
      
      if (s3Result.success && s3Result.hasData && s3Result.data?.apis) {
        console.log(`Successfully loaded ${s3Result.data.apis.length} APIs from S3`);
        console.log(`S3 data last updated: ${s3Result.data.metadata?.lastUpdated || 'unknown'}`);
        
        // Use S3 data directly (it's already in EnrichedApiData format)
        setApis(s3Result.data.apis);
        setSuccessMessage(`Loaded ${s3Result.data.apis.length} APIs from S3 (last updated: ${s3Result.data.metadata?.lastUpdated ? new Date(s3Result.data.metadata.lastUpdated).toLocaleString() : 'unknown'})`);
        
      } else {
        // Fallback to original JSON file
        console.log('No S3 data found, loading from original JSON file...');
        
        const response = await fetch('/apis_list.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch APIs: ${response.status}`);
        }

        const data: ApiListData = await response.json();
        console.log(`Loaded ${data.totalApis} APIs from original file`);

        // Convert to enriched format
        const enrichedApis: EnrichedApiData[] = data.apis.map((api, index) => ({
          ...api,
          id: `api-${index}`,
          responseColumns: [],
          fetchStatus: 'pending',
        }));

        setApis(enrichedApis);
        setSuccessMessage(`Loaded ${data.totalApis} APIs from original file (no S3 data found yet)`);
      }
      
    } catch (err) {
      console.error('Error loading APIs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load APIs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all API responses to get column definitions (bulk operation)
  const fetchApiResponses = useCallback(async () => {
    if (apis.length === 0) return;
    
    setFetchingResponses(true);
    setError(null);
    setSuccessMessage(null);
    
    // Set all APIs to loading status
    const loadingApis = apis.map(api => ({
      ...api,
      fetchStatus: 'loading' as const,
      fetchError: undefined,
    }));
    setApis(loadingApis);
    
    try {
      console.log(`Starting bulk fetch for ${apis.length} APIs...`);
      
      const response = await fetch('/api/admin/fetch-all-apis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apis: loadingApis }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.results) {
        // Update APIs with fetched results
        const updatedApis = [...loadingApis];
        
        result.results.forEach((apiResult: any) => {
          const apiIndex = updatedApis.findIndex(api => api.id === apiResult.id);
          if (apiIndex !== -1) {
            if (apiResult.success) {
              updatedApis[apiIndex] = {
                ...updatedApis[apiIndex],
                responseColumns: apiResult.columns || [],
                lastFetched: new Date().toISOString(),
                fetchStatus: 'success',
                fetchError: undefined,
              };
            } else {
              updatedApis[apiIndex] = {
                ...updatedApis[apiIndex],
                fetchStatus: 'error',
                fetchError: apiResult.error || 'Unknown error',
                responseColumns: [],
              };
            }
          }
        });
        
        setApis(updatedApis);
        setSuccessMessage(
          `Bulk fetch completed! ${result.successful} successful, ${result.failed} failed out of ${result.totalProcessed} APIs.`
        );
        
      } else {
        throw new Error(result.error || 'Failed to fetch API responses');
      }
      
    } catch (err) {
      console.error('Error in bulk API fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch API responses');
      
      // Reset all APIs to pending status on error
      const resetApis = apis.map(api => ({
        ...api,
        fetchStatus: 'pending' as const,
        fetchError: undefined,
      }));
      setApis(resetApis);
    } finally {
      setFetchingResponses(false);
    }
  }, [apis]);

  // Save data to S3
  const saveToS3 = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const dataToSave = {
        metadata: {
          totalApis: apis.length,
          lastUpdated: new Date().toISOString(),
          version: '1.0',
        },
        apis: apis,
      };
      
      const response = await fetch('/api/admin/save-api-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSuccessMessage(`Data saved successfully to S3: ${result.key}`);
      } else {
        throw new Error(result.error || 'Failed to save to S3');
      }
      
    } catch (err) {
      console.error('Error saving to S3:', err);
      setError(err instanceof Error ? err.message : 'Failed to save to S3');
    } finally {
      setSaving(false);
    }
  }, [apis]);

  // Update API data from table edits
  const handleTableDataChange = useCallback((updatedData: EnrichedApiData[]) => {
    setApis(updatedData);
  }, []);

  useEffect(() => {
    loadApis();
  }, [loadApis]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading APIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">API Manager</h1>
          <p className="text-gray-400">
            Manage all API endpoints, their metadata, and response column definitions
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadApis}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              loading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🔄 Reload from S3
              </>
            )}
          </button>

          <button
            onClick={fetchApiResponses}
            disabled={fetchingResponses || apis.length === 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium ${
              fetchingResponses || apis.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {fetchingResponses ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                Fetching All APIs...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🚀 Auto-Generate All Column Definitions
              </>
            )}
          </button>
          
          <button
            onClick={saveToS3}
            disabled={saving || apis.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              saving || apis.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saving ? 'Saving to S3...' : 'Save to S3'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300">{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-300">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      {apis.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5l-1 1a2 2 0 01-2.828 0L12 12.172a2 2 0 01-2.828 0L8 14H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2h-2z" />
              </svg>
              <span className="text-blue-300 text-sm">
                📊 Data Source: {successMessage?.includes('S3') ? '☁️ Amazon S3 (Persistent)' : '📄 Original JSON (Temporary)'}
              </span>
            </div>
            <div className="text-xs text-blue-400">
              Any changes you make will be saved to S3 and persist across sessions
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{apis.length}</div>
          <div className="text-sm text-gray-400">Total APIs</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {apis.filter(api => api.fetchStatus === 'success').length}
          </div>
          <div className="text-sm text-gray-400">✅ Fetched Successfully</div>
          {fetchingResponses && (
            <div className="mt-1">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(apis.filter(api => api.fetchStatus === 'success').length / apis.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            {apis.filter(api => api.fetchStatus === 'error').length}
          </div>
          <div className="text-sm text-gray-400">❌ Failed</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {apis.filter(api => api.fetchStatus === 'loading').length}
          </div>
          <div className="text-sm text-gray-400">
            {fetchingResponses ? '⏳ Processing...' : '⏸️ Pending'}
          </div>
          {fetchingResponses && apis.filter(api => api.fetchStatus === 'loading').length > 0 && (
            <div className="mt-1 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent mr-2"></div>
              <span className="text-xs text-yellow-300">Active</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Bar during bulk fetch */}
      {fetchingResponses && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-white">🚀 AI-Powered Bulk Fetch Progress</h3>
            <span className="text-xs text-gray-400">
              {apis.filter(api => api.fetchStatus !== 'pending').length} / {apis.length} processed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(apis.filter(api => api.fetchStatus !== 'pending').length / apis.length) * 100}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-400">
            🤖 AI is analyzing each API response to generate intelligent column definitions...
          </div>
        </div>
      )}

      {/* Editable Fields */}
      {apis.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">API Management</h2>
          <EditableFields 
            data={apis}
            onChange={handleTableDataChange}
          />
        </div>
      )}
      
      {apis.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6-4h6m2 5l-1 1a2 2 0 01-2.828 0L12 12.172a2 2 0 01-2.828 0L8 14H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2h-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No APIs Found</h3>
          <p className="text-gray-500">Failed to load API data. Please check the configuration.</p>
        </div>
      )}
    </div>
  );
}
