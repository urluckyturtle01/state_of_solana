import React from 'react';
import { TimeFilter } from '../../api/chartData';

interface TimeFilterProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
}

// Simplified labels
const filterLabels: Record<TimeFilter, string> = {
  'D': 'D',
  
  'M': 'M',
  'Q': 'Q',
  'Y': 'Y'
};

const TimeFilterSelector: React.FC<TimeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="inline-flex bg-gray-800/40 rounded-sm p-0">
      {(['D', 'M', 'Q', 'Y'] as TimeFilter[]).map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm transition-colors ${
            value === filter
              ? 'bg-gray-800 text-white'
              : 'bg-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          {filterLabels[filter]}
        </button>
      ))}
    </div>
  );
};

export default TimeFilterSelector; 