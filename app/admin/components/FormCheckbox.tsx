import React from 'react';

interface FormCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  error?: string;
  helpText?: string;
}

export default function FormCheckbox({
  id,
  label,
  checked,
  onChange,
  required = false,
  className = '',
  error,
  helpText,
}: FormCheckboxProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={id}
            name={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            required={required}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={id} className="font-medium text-gray-300">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {helpText && !error && (
            <p className="text-gray-400">{helpText}</p>
          )}
          {error && (
            <p className="text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
} 