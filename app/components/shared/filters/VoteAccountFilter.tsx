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
      
      
      {/* Custom input option */}
      <div className="flex items-center space-x-2">
       
        <input
          type="text"
          placeholder="Enter custom vote account..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-900/50 text-gray-400 text-sm px-3 py-1.5 rounded-sm border border-gray-800/70 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-transparent min-w-[300px]"
        />
      </div>
    </div>
  );
};

export default VoteAccountFilter;
