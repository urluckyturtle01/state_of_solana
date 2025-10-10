import React from 'react';

export type StakeType = 'total_stake' | 'mean_stake' | 'median_stake';

interface StakeTypeFilterProps {
  value: StakeType;
  onChange: (value: StakeType) => void;
  className?: string;
  disabled?: boolean;
}

const STAKE_TYPE_OPTIONS = [
  { 
    value: 'total_stake' as StakeType, 
    label: 'Total Stake', 
    description: 'Total Stake',
    
  },
  { 
    value: 'mean_stake' as StakeType, 
    label: 'Mean Stake', 
    description: 'Mean Stake',
    
  },
  { 
    value: 'median_stake' as StakeType, 
    label: 'Median Stake', 
    description: 'Median Stake',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12h20M7 7l5 5-5 5M17 7l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
];

const StakeTypeFilter: React.FC<StakeTypeFilterProps> = ({ 
  value, 
  onChange, 
  className = "",
  disabled = false
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`inline-flex bg-gray-800/40 rounded-md p-0 shadow-inner ${disabled ? 'opacity-50' : ''}`}>
        {STAKE_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onChange(option.value)}
            className={`
              text-xs px-2 py-1 rounded transition-all duration-200 flex items-center space-x-1
              ${value === option.value
                ? 'bg-gray-800 text-white shadow'
                : 'text-gray-400 hover:text-gray-300'
              }
            `}
            title={option.description}
            disabled={disabled}
          >
            
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StakeTypeFilter;
