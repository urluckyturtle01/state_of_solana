import React from 'react';
import { CurrencyType } from '../../../api/REV/cost-capacity';

interface CurrencyFilterProps {
  currency: CurrencyType;
  onChange: (currency: CurrencyType) => void;
  isCompact?: boolean;
}

/**
 * A reusable component for toggling between USD and SOL currencies
 */
const CurrencyFilter: React.FC<CurrencyFilterProps> = ({ 
  currency, 
  onChange, 
  isCompact = false 
}) => {
  return (
    <div className="flex items-center">
      {!isCompact && <span className="text-xs text-gray-400 mr-2">Currency:</span>}
      <div className="flex space-x-1 bg-gray-900/60 rounded-md p-0.5">
        <button
          className={`text-xs px-2 py-0.5 rounded ${currency === 'USD' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => onChange('USD')}
        >
          USD
        </button>
        <button
          className={`text-xs px-2 py-0.5 rounded ${currency === 'SOL' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => onChange('SOL')}
        >
          SOL
        </button>
      </div>
    </div>
  );
};

export default CurrencyFilter; 