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
          className={`px-0 py-1 text-xs font-medium rounded transition-colors min-w-[30px] ${
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