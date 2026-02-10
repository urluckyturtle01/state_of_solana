import React from 'react';

export type DisplayMode = 'absolute' | 'percent';

export interface DisplayModeFilterProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  isCompact?: boolean;
  disabled?: boolean;
}

/**
 * A reusable component for toggling between absolute chart values and percentage view
 */
const DisplayModeFilter: React.FC<DisplayModeFilterProps> = ({ 
  mode, 
  onChange, 
  isCompact = false,
  disabled = false
}) => {
  return (
    <div className="flex items-center">
      {!isCompact && <span className="text-xs text-gray-400"></span>}
      <div className={`inline-flex bg-gray-800/40 rounded-md p-0 shadow-inner ${disabled ? 'opacity-50' : ''}`}>
        <button
          className={`text-xs px-1.5 py-1 rounded ${mode === 'absolute' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => !disabled && onChange('absolute')}
          title="Chart View"
          disabled={disabled}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="4" height="18" rx="1" fill="currentColor"/>
            <rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor"/>
            <rect x="17" y="5" width="4" height="16" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={`text-xs px-1.5 py-0.5 rounded ${mode === 'percent' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => !disabled && onChange('percent')}
          title={disabled ? 'Percent view not available with negative values' : 'Percent View'}
          disabled={disabled}
        >
          %
        </button>
      </div>
    </div>
  );
};

export default DisplayModeFilter; 