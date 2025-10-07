"use client";

import React, { useState } from 'react';
import ButtonSecondary from '@/app/components/shared/buttons/ButtonSecondary';

interface VoteAccountFilterProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

const VoteAccountFilter: React.FC<VoteAccountFilterProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
        Vote Account:
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Enter vote account address..."
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[400px]"
          disabled={isLoading}
        />
        <ButtonSecondary 
          onClick={handleSubmit}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-1.5"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </div>
          ) : (
            'Load Data'
          )}
        </ButtonSecondary>
      </div>
    </div>
  );
};

export default VoteAccountFilter;
