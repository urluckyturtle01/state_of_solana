import React from 'react';

export type StakeType = 'total_stake' | 'mean_stake' | 'median_stake';
export type MetricType = 'gini_coefficient' | 'hhi_index' | 'nakamoto_coeff_33' | 'skewness' | 'kurtosis';

export interface FilterOption<T = string> {
  value: T;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

interface StakeTypeFilterProps {
  value: StakeType;
  onChange: (value: StakeType) => void;
  className?: string;
  disabled?: boolean;
}

interface GenericFilterProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  className?: string;
  disabled?: boolean;
}

const STAKE_TYPE_OPTIONS: FilterOption<StakeType>[] = [
  { 
    value: 'total_stake', 
    label: 'Total Stake', 
    description: 'Total Stake',
  },
  { 
    value: 'mean_stake', 
    label: 'Mean Stake', 
    description: 'Mean Stake',
  },
  { 
    value: 'median_stake', 
    label: 'Median Stake', 
    description: 'Median Stake',
    
  },
];

export const METRIC_TYPE_OPTIONS: FilterOption<MetricType>[] = [
  { 
    value: 'gini_coefficient', 
    label: 'Gini Index', 
    description: 'Gini coefficient measuring stake distribution inequality',
  },
  { 
    value: 'hhi_index', 
    label: 'HHI Index', 
    description: 'Herfindahl-Hirschman Index measuring market concentration',
  },
  { 
    value: 'nakamoto_coeff_33', 
    label: 'Nakamoto Coefficient', 
    description: 'Minimum number of validators needed to control 33% of stake',
  },
  { 
    value: 'skewness', 
    label: 'Skewness', 
    description: 'Measure of asymmetry in stake distribution',
  },
  { 
    value: 'kurtosis', 
    label: 'Kurtosis', 
    description: 'Measure of tail heaviness in stake distribution',
  },
];

// Generic filter component
export function GenericFilter<T = string>({ 
  value, 
  onChange, 
  options,
  className = "",
  disabled = false
}: GenericFilterProps<T>) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`inline-flex bg-gray-800/40 rounded-md p-0 shadow-inner ${disabled ? 'opacity-50' : ''}`}>
        {options.map((option) => (
          <button
            key={String(option.value)}
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
            {option.icon}
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Specific StakeTypeFilter component for backward compatibility
const StakeTypeFilter: React.FC<StakeTypeFilterProps> = ({ 
  value, 
  onChange, 
  className = "",
  disabled = false
}) => {
  return (
    <GenericFilter
      value={value}
      onChange={onChange}
      options={STAKE_TYPE_OPTIONS}
      className={className}
      disabled={disabled}
    />
  );
};

export default StakeTypeFilter;
