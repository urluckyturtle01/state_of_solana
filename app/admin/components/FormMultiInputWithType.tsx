import React, { useState } from 'react';
import { YAxisConfig } from '../types';

interface FormMultiInputWithTypeProps {
  id: string;
  label: string;
  values: YAxisConfig[];
  onChange: (id: string, values: YAxisConfig[]) => void;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  supportDualAxis?: boolean;
}

const FormMultiInputWithType: React.FC<FormMultiInputWithTypeProps> = ({
  id,
  label,
  values,
  onChange,
  placeholder,
  helpText,
  error,
  required,
  supportDualAxis = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [unitValue, setUnitValue] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newUnit = e.target.value;
    const newValues = [...values];
    newValues[index].unit = newUnit;
    onChange(id, newValues);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addValue(inputValue.trim());
    }
  };

  const addValue = (value: string) => {
    if (value && !values.some(item => item.field === value)) {
      onChange(id, [...values, { field: value, type: 'bar', unit: '' }]);
    }
    setInputValue('');
  };

  const removeValue = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(id, newValues);
  };

  const toggleChartType = (index: number) => {
    const newValues = [...values];
    // Toggle between 'bar' and 'line'
    newValues[index].type = newValues[index].type === 'bar' ? 'line' : 'bar';
    onChange(id, newValues);
  };

  const toggleRightAxis = (index: number) => {
    const newValues = [...values];
    // Toggle rightAxis flag
    newValues[index].rightAxis = !newValues[index].rightAxis;
    onChange(id, newValues);
  };

  const startEditUnit = (index: number) => {
    setEditingIndex(index);
    setUnitValue(values[index].unit || '');
  };

  const finishEditUnit = (index: number) => {
    const newValues = [...values];
    newValues[index].unit = unitValue;
    onChange(id, newValues);
    setEditingIndex(null);
    setUnitValue('');
  };

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((value, index) => (
          <div key={index} className={`flex items-center rounded-md px-3 py-1 text-gray-200 text-sm ${value.rightAxis ? 'bg-purple-900/50 border border-purple-700' : 'bg-indigo-900/50 border border-indigo-700'}`}>
            <span>{value.field}</span>
            
            {/* Display unit if set */}
            {value.unit && editingIndex !== index && (
              <span className="ml-1 text-xs text-gray-400">[{value.unit}]</span>
            )}
            
            {/* Edit unit inline when editing */}
            {editingIndex === index ? (
              <div className="ml-1 flex items-center">
                <input
                  type="text"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  className="w-12 h-5 px-1 text-xs rounded bg-gray-700 border border-gray-600 text-gray-200"
                  placeholder="unit"
                  onBlur={() => finishEditUnit(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      finishEditUnit(index);
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-white focus:outline-none transition-colors"
                onClick={() => startEditUnit(index)}
                title={value.unit ? `Edit unit: ${value.unit}` : "Add unit"}
              >
                {value.unit ? '✎' : '⊕'}
              </button>
            )}
            
            <button
              type="button"
              className="ml-2 text-gray-400 hover:text-white focus:outline-none transition-colors"
              onClick={() => toggleChartType(index)}
              title={value.type === 'bar' ? 'Switch to line chart' : 'Switch to bar chart'}
            >
              {value.type === 'bar' ? '📊' : '📈'}
            </button>
            
            {supportDualAxis && (
              <button
                type="button"
                className={`ml-2 ${value.rightAxis ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-400 hover:text-indigo-300'} focus:outline-none transition-colors`}
                onClick={() => toggleRightAxis(index)}
                title={value.rightAxis ? 'Move to left axis' : 'Move to right axis'}
              >
                {value.rightAxis ? '←' : '→'}
              </button>
            )}
            
            <button
              type="button"
              className="ml-2 text-gray-400 hover:text-red-400 focus:outline-none transition-colors"
              onClick={() => removeValue(index)}
              title="Remove field"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex">
        <input
          type="text"
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className={`block w-full rounded-md bg-gray-700 border-gray-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-200 transition-colors ${
            error ? 'border-red-500' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => addValue(inputValue.trim())}
          disabled={!inputValue.trim()}
          className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-sm transition-colors"
        >
          Add
        </button>
      </div>
      
      {helpText && <p className="mt-1 text-sm text-gray-400">{helpText}</p>}
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      
      {supportDualAxis && (
        <div className="mt-2 flex gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-indigo-900 border border-indigo-700 rounded-sm mr-1"></div>
            <span className="text-gray-400">Left axis</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-900 border border-purple-700 rounded-sm mr-1"></div>
            <span className="text-gray-400">Right axis</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormMultiInputWithType; 