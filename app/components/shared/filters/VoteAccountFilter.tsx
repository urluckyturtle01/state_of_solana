import React from 'react';

interface VoteAccountFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Common Solana validator vote accounts for testing
const COMMON_VOTE_ACCOUNTS = [
  { value: "xSGajeS6niLPNiHGJBuy3nzQVUfyEAQV1yydrg74u4v", label: "Validator 1" },
  { value: "GJBuy3nzQVUfyEAQV1yydrg74u4vxSGajeS6niLPNiH", label: "Validator 2" },
  { value: "Buy3nzQVUfyEAQV1yydrg74u4vxSGajeS6niLPNiHGJ", label: "Validator 3" },
];

const VoteAccountFilter: React.FC<VoteAccountFilterProps> = ({ 
  value, 
  onChange, 
  className = "" 
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
        Vote Account:
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-gray-800 text-gray-200 text-sm px-3 py-1.5 pr-8 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
        >
          {COMMON_VOTE_ACCOUNTS.map((account) => (
            <option key={account.value} value={account.value}>
              {account.label} ({account.value.slice(0, 8)}...)
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Custom input option */}
      <div className="flex items-center space-x-2">
        <span className="text-gray-400 text-sm">or</span>
        <input
          type="text"
          placeholder="Enter custom vote account..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-800 text-gray-200 text-sm px-3 py-1.5 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
        />
      </div>
    </div>
  );
};

export default VoteAccountFilter;
