import React from 'react';

// Define a type that includes all possible time filter values
export type AllTimeFilters = 'D' | 'M' | 'Q' | 'Y' | 'W';

interface TimeFilterProps<T extends string = AllTimeFilters> {
  value: T;
  onChange: (value: T) => void;
  options?: Array<{value: string, label: string}>;
}

// Expanded labels for better readability
const filterLabels: Record<string, string> = {
  'D': 'D',
  'M': 'M',
  'Q': 'Q',
  'Y': 'Y',
  'W': 'W'
};

// Helper function to get the default time filter value (prefers 'M' if available)
export const getDefaultTimeFilterValue = <T extends string>(options: Array<{value: string, label: string}> | string[]): T => {
  if (!options || options.length === 0) return 'M' as T;
  
  // Handle array of strings or array of objects
  const optionValues = Array.isArray(options) && typeof options[0] === 'string' 
    ? options as string[]
    : (options as Array<{value: string}>).map(opt => opt.value);
  
  // Prefer 'M' if available, otherwise return first option
  return (optionValues.includes('M') ? 'M' : optionValues[0]) as T;
};

function TimeFilterSelector<T extends string = AllTimeFilters>({ 
  value, 
  onChange, 
  options 
}: TimeFilterProps<T>) {
  // Use custom options if provided, otherwise use default filters
  const filterOptions = options || 
    (['D', 'M', 'Q', 'Y'] as string[]).map(filter => ({ 
      value: filter, 
      label: filterLabels[filter] 
    }));

  return (
    <div className="inline-flex bg-gray-800/40 rounded-md p-0 shadow-inner">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value as T)}
          className={`px-0 py-0.5 text-xs font-medium rounded transition-colors min-w-[25px] ${
            value === option.value
              ? 'bg-gray-800 text-white shadow'
              : 'bg-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default TimeFilterSelector; 