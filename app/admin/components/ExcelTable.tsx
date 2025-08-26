"use client";

import { useState, useCallback } from 'react';

interface ColumnDefinition {
  name: string;
  type: string;
  description: string;
  example?: string;
}

interface EnrichedApiData {
  id: string;
  endpoint: string;
  apiKey?: string;
  title: string;
  subtitle: string;
  page: string;
  pageName: string;
  menuId?: string;
  menuName?: string;
  responseColumns: ColumnDefinition[];
  lastFetched?: string;
  fetchStatus: 'pending' | 'loading' | 'success' | 'error';
  fetchError?: string;
}

interface EditableFieldsProps {
  data: EnrichedApiData[];
  onChange: (updatedData: EnrichedApiData[]) => void;
}

export default function EditableFields({ data, onChange }: EditableFieldsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleFieldChange = useCallback((index: number, field: string, value: string) => {
    const updatedData = [...data];
    (updatedData[index] as any)[field] = value;
    onChange(updatedData);
  }, [data, onChange]);

  const handleColumnChange = useCallback((apiIndex: number, columnIndex: number, field: string, value: string) => {
    const updatedData = [...data];
    if (!updatedData[apiIndex].responseColumns[columnIndex]) {
      updatedData[apiIndex].responseColumns[columnIndex] = {
        name: '',
        type: 'string',
        description: '',
      };
    }
    (updatedData[apiIndex].responseColumns[columnIndex] as any)[field] = value;
    onChange(updatedData);
  }, [data, onChange]);

  const addColumnDefinition = useCallback((apiIndex: number) => {
    const updatedData = [...data];
    updatedData[apiIndex].responseColumns.push({
      name: '',
      type: 'string',
      description: '',
    });
    onChange(updatedData);
  }, [data, onChange]);

  const removeColumnDefinition = useCallback((apiIndex: number, columnIndex: number) => {
    const updatedData = [...data];
    updatedData[apiIndex].responseColumns.splice(columnIndex, 1);
    onChange(updatedData);
  }, [data, onChange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-900/20 border-green-800 text-green-400';
      case 'error': return 'bg-red-900/20 border-red-800 text-red-400';
      case 'loading': return 'bg-yellow-900/20 border-yellow-800 text-yellow-400';
      case 'pending': return 'bg-gray-900/20 border-gray-800 text-gray-400';
      default: return 'bg-gray-900/20 border-gray-800 text-gray-400';
    }
  };

  // Filter data based on search term
  const filteredData = data.filter(api => 
    api.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (api.menuName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate filtered data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Search and Pagination Controls */}
      <div className="flex justify-between items-center">
        <div className="relative w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            placeholder="Search APIs..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
          </span>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* API Cards */}
      {paginatedData.map((api, index) => {
        const originalIndex = data.findIndex(item => item.id === api.id);
        
        return (
          <div key={api.id} className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
            {/* Header with status */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-white">#{originalIndex + 1}</span>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(api.fetchStatus)}`}>
                  {api.fetchStatus}
                </div>
                {api.lastFetched && (
                  <span className="text-xs text-gray-400">
                    Last fetched: {new Date(api.lastFetched).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Basic API Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Title *</label>
                  <input
                    type="text"
                    value={api.title}
                    onChange={(e) => handleFieldChange(originalIndex, 'title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={api.subtitle}
                    onChange={(e) => handleFieldChange(originalIndex, 'subtitle', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API subtitle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Page Name</label>
                  <input
                    type="text"
                    value={api.pageName}
                    onChange={(e) => handleFieldChange(originalIndex, 'pageName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter page name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Menu Name</label>
                  <input
                    type="text"
                    value={api.menuName || ''}
                    onChange={(e) => handleFieldChange(originalIndex, 'menuName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter menu name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint *</label>
                  <textarea
                    value={api.endpoint}
                    onChange={(e) => handleFieldChange(originalIndex, 'endpoint', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API endpoint URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                  <input
                    type="text"
                    value={api.apiKey || ''}
                    onChange={(e) => handleFieldChange(originalIndex, 'apiKey', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API key (if required)"
                  />
                </div>

                {api.fetchError && (
                  <div className="bg-red-900/20 border border-red-800 rounded-md p-3">
                    <p className="text-red-300 text-sm">
                      <strong>Fetch Error:</strong> {api.fetchError}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Response Columns Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Response Column Definitions</h3>
                <button
                  onClick={() => addColumnDefinition(originalIndex)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                >
                  + Add Column
                </button>
              </div>

              {api.responseColumns.length === 0 ? (
                <div className="bg-gray-900/30 border border-gray-700 rounded-md p-4 text-center">
                  <p className="text-gray-400 text-sm">
                    No column definitions yet. Use "Fetch API Responses" or add columns manually.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {api.responseColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="bg-gray-900/50 border border-gray-700 rounded-md p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Column Name</label>
                          <input
                            type="text"
                            value={column.name}
                            onChange={(e) => handleColumnChange(originalIndex, columnIndex, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Column name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Data Type</label>
                          <select
                            value={column.type}
                            onChange={(e) => handleColumnChange(originalIndex, columnIndex, 'type', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="string">String</option>
                            <option value="integer">Integer</option>
                            <option value="float">Float</option>
                            <option value="boolean">Boolean</option>
                            <option value="datetime">DateTime</option>
                            <option value="array">Array</option>
                            <option value="object">Object</option>
                            <option value="null">Null</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={column.description}
                              onChange={(e) => handleColumnChange(originalIndex, columnIndex, 'description', e.target.value)}
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Column description"
                            />
                            <button
                              onClick={() => removeColumnDefinition(originalIndex, columnIndex)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                              title="Remove column"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>

                      {column.example && (
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-400 mb-1">Example Value</label>
                          <div className="bg-gray-800 rounded px-2 py-1 text-xs text-gray-300 font-mono">
                            {column.example}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Instructions */}
      <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Instructions:</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Edit any field directly by typing in the input fields</li>
          <li>• Use the search bar to quickly find specific APIs</li>
          <li>• Use "Fetch API Responses" to automatically populate column definitions</li>
          <li>• Add or remove response columns using the buttons</li>
          <li>• Save your changes to S3 using the "Save to S3" button at the top</li>
          <li>• Navigate through pages using the pagination controls</li>
        </ul>
      </div>
    </div>
  );
}
