"use client";

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// API Configuration interface
interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  columns: string[];
  chartTitle?: string;
  apiKey?: string;
  additionalOptions?: any;
}

interface ApiListProps {
  apis: ApiConfig[];
  expandedApis: Set<string>;
  selectedColumns: Record<string, Set<string>>;
  selectedParameters: Record<string, Record<string, string>>;
  onToggleApiExpansion: (apiId: string) => void;
  onToggleColumnSelection: (apiId: string, column: string) => void;
  onParameterChange: (apiId: string, paramName: string, value: string) => void;
}

const ApiList: React.FC<ApiListProps> = ({
  apis,
  expandedApis,
  selectedColumns,
  selectedParameters,
  onToggleApiExpansion,
  onToggleColumnSelection,
  onParameterChange,
}) => {
  return (
    <div className="w-80 bg-black/40 border-r border-gray-900/50 flex flex-col">
      <div className="pl-4 pb-2 pt-2 border-b border-gray-900/50">
        <p className="text-xs text-gray-500 mt-1">{apis.length} APIs found</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {apis.map((api, index) => (
            <div key={api.id} className="bg-gray-900/30 rounded-md overflow-hidden border border-gray-800/50">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                onClick={() => onToggleApiExpansion(api.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-200">
                    API {index + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                    {api.method}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{api.columns.length} cols</span>
                  {expandedApis.has(api.id) ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedApis.has(api.id) && (
                <div className="px-3 pb-3 border-t border-gray-800/30">
                  <div className="text-xs text-gray-500 mb-2 break-all">
                    {api.endpoint}
                  </div>
                  {api.chartTitle && (
                    <div className="text-xs text-gray-400 mb-2 font-medium">
                      "{api.chartTitle}"
                    </div>
                  )}
                  
                  {/* Parameter Controls for APIs with filters */}
                  {api.additionalOptions?.filters && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-2">Parameters:</div>
                      <div className="space-y-2">
                        {/* Time Filter Dropdown */}
                        {api.additionalOptions.filters.timeFilter?.paramName && (
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">
                              {api.additionalOptions.filters.timeFilter.paramName}:
                            </label>
                            <select
                              className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              value={selectedParameters[api.id]?.[api.additionalOptions.filters.timeFilter.paramName] || api.additionalOptions.filters.timeFilter.options[0]}
                              onChange={(e) => onParameterChange(api.id, api.additionalOptions.filters.timeFilter.paramName, e.target.value)}
                            >
                              {api.additionalOptions.filters.timeFilter.options.map((option: string) => (
                                <option key={option} value={option}>
                                  {option === 'D' ? 'Daily' :
                                   option === 'W' ? 'Weekly' :
                                   option === 'M' ? 'Monthly' :
                                   option === 'Q' ? 'Quarterly' :
                                   option === 'Y' ? 'Yearly' : option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Currency Filter Dropdown */}
                        {api.additionalOptions.filters.currencyFilter?.paramName && (
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">
                              {api.additionalOptions.filters.currencyFilter.paramName}:
                            </label>
                            <select
                              className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              value={selectedParameters[api.id]?.[api.additionalOptions.filters.currencyFilter.paramName] || api.additionalOptions.filters.currencyFilter.options[0]}
                              onChange={(e) => onParameterChange(api.id, api.additionalOptions.filters.currencyFilter.paramName, e.target.value)}
                            >
                              {api.additionalOptions.filters.currencyFilter.options.map((option: string) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {api.columns.length > 0 ? (
                      api.columns.map((column) => (
                        <label key={column} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-800/20 rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-2"
                            checked={selectedColumns[api.id]?.has(column) || false}
                            onChange={() => onToggleColumnSelection(api.id, column)}
                          />
                          <span className="text-gray-300 text-xs">{column}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 italic py-2">
                        No columns detected
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiList; 