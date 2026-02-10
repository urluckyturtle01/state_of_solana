"use client";

//import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ValidatorsAPIsContent() {
  const searchParams = useSearchParams();
  const voteAccount = searchParams.get('voteAccount') || '';

  const api = {
    name: 'Validator Staker Metrics Range',
    endpoint: 'http://validator.topledger.xyz/validators/validator_staker_metrics_range',
    method: 'POST',
    description: 'Get comprehensive staker metrics for validators across a range of epochs. Supports querying all validators or specific ones, with flexible epoch range options.',
    params: [
      { 
        name: 'vote_account', 
        type: 'string | "all"', 
        required: true, 
        description: 'Specific validator vote account address or "all" to get data for all validators' 
      },
      { 
        name: 'start_epoch', 
        type: 'number | "auto"', 
        required: true, 
        description: 'Starting epoch number or "auto" to automatically use the earliest available epoch' 
      },
      { 
        name: 'end_epoch', 
        type: 'number | "auto"', 
        required: true, 
        description: 'Ending epoch number or "auto" to automatically use the latest available epoch' 
      }
    ],
    exampleRequest: {
      parameters: {
        vote_account: "all",
        start_epoch: "auto",
        end_epoch: "auto"
      }
    }
  };

  const usageExamples = [
    {
      title: 'All Validators, Full Automatic Epoch Range',
      description: 'Query all validators across all available epochs',
      request: {
        parameters: {
          vote_account: "all",
          start_epoch: "auto",
          end_epoch: "auto"
        }
      }
    },
    {
      title: 'All Validators, Specific Numeric Range',
      description: 'Query all validators for epochs 800-850',
      request: {
        parameters: {
          vote_account: "all",
          start_epoch: 800,
          end_epoch: 850
        }
      }
    },
    {
      title: 'Single Validator, Numeric Range',
      description: 'Query a specific validator for epochs 820-830',
      request: {
        parameters: {
          vote_account: "SomeVoteAccountPubkey",
          start_epoch: 820,
          end_epoch: 830
        }
      }
    },
    {
      title: 'All Validators, Auto Start → Numeric End',
      description: 'Query all validators from earliest epoch to epoch 900',
      request: {
        parameters: {
          vote_account: "all",
          start_epoch: "auto",
          end_epoch: 900
        }
      }
    },
    {
      title: 'All Validators, Numeric Start → Auto End',
      description: 'Query all validators from epoch 820 to latest epoch',
      request: {
        parameters: {
          vote_account: "all",
          start_epoch: 820,
          end_epoch: "auto"
        }
      }
    }
  ];

  const [selectedExample, setSelectedExample] = useState(0);
  const [testRequest, setTestRequest] = useState(JSON.stringify(api.exampleRequest, null, 2));
  const [testResponse, setTestResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Update test request when selected example changes
  useEffect(() => {
    setTestRequest(JSON.stringify(usageExamples[selectedExample].request, null, 2));
    setTestResponse('');
  }, [selectedExample]);

  // Update vote_account in test request when searchParams change
  useEffect(() => {
    if (voteAccount) {
      try {
        const currentRequest = JSON.parse(testRequest);
        if (currentRequest.parameters) {
          currentRequest.parameters.vote_account = voteAccount;
          setTestRequest(JSON.stringify(currentRequest, null, 2));
        }
      } catch (e) {
        // If parsing fails, keep current value
      }
    }
  }, [voteAccount]);

  const handleTestAPI = async () => {
    setIsLoading(true);
    setTestResponse('');

    try {
      const requestBody = JSON.parse(testRequest);
      const response = await fetch(api.endpoint, {
        method: api.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResponse(JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const generateCurlCommand = (exampleIndex: number) => {
    const example = usageExamples[exampleIndex];
    return `curl -X POST ${api.endpoint} \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(example.request, null, 2).replace(/\n/g, '\n      ')}'`;
  };

  return (
    <div className="space-y-6">
      

      {/* API Info Card */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-md font-semibold text-gray-200">{api.name}</h3>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">{api.description}</p>
          </div>
          <span className="px-4 py-2 bg-blue-900/30 rounded text-blue-300 text-xs font-thin">
            {api.method}
          </span>
        </div>

        <div className="space-y-4 mt-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Endpoint</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-300 font-mono">
                {api.endpoint}
              </code>
              <button
                onClick={() => copyToClipboard(api.endpoint, 'endpoint')}
                className={`px-3 py-2 border rounded text-sm transition-colors ${
                  copiedItem === 'endpoint'
                    ? 'bg-green-900/30 border-green-700 text-green-400'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                }`}
                title={copiedItem === 'endpoint' ? 'Copied!' : 'Copy endpoint'}
              >
                {copiedItem === 'endpoint' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Parameters</h4>
            <div className="bg-gray-950 border border-gray-800 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3 text-gray-400 font-medium">Name</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Type</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Required</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {api.params.map((param, index) => (
                    <tr key={index} className="border-b border-gray-800 last:border-b-0">
                      <td className="p-3 text-gray-300 font-mono text-xs">{param.name}</td>
                      <td className="p-3 text-gray-400 text-xs font-mono">{param.type}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          param.required 
                            ? 'bg-red-900/30 border border-red-700 text-red-300' 
                            : 'bg-gray-800 border border-gray-700 text-gray-400'
                        }`}>
                          {param.required ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-xs">{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
        <h3 className="text-md font-semibold text-gray-200 mb-4">Usage Examples</h3>
        <div className="space-y-4">
          {usageExamples.map((example, index) => (
            <div key={index} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-200">{example.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{example.description}</p>
                </div>
                
              </div>
              
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(generateCurlCommand(index), `curl-${index}`)}
                  className={`absolute top-2 right-2 p-1.5 border rounded text-xs transition-colors ${
                    copiedItem === `curl-${index}`
                      ? 'bg-green-900/30 border-green-700 text-green-400'
                      : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                  }`}
                  title={copiedItem === `curl-${index}` ? 'Copied!' : 'Copy curl command'}
                >
                  {copiedItem === `curl-${index}` ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 font-mono overflow-x-auto pr-10">
{generateCurlCommand(index)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  );
}


// SEO Structured Data
//const structuredData = generateStructuredData('/validators/apis');

export default function ValidatorsAPIsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <ValidatorsAPIsContent />
    </Suspense>
  );
}



//export const metadata = generateNextMetadata('/validators/apis');