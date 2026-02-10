import React from 'react';

interface Option {
  id: string;
  name: string;
}

interface FormSelectProps {
  id: string;
  label: string;
  options: readonly Option[] | Option[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  helpText?: string;
}

export default function FormSelect({
  id,
  label,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  error,
  helpText,
}: FormSelectProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${
          disabled ? 'bg-gray-800 cursor-not-allowed' : 'bg-gray-700'
        } border ${
          error ? 'border-red-500' : 'border-gray-600'
        } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 sm:text-sm transition-colors`}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
} 