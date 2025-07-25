import React from 'react';

interface FormInputProps {
  id: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  helpText?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export default function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  error,
  helpText,
  onBlur,
}: FormInputProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        onBlur={onBlur}
        className={`mt-1 block w-full px-3 py-2 bg-gray-700 border ${
          error ? 'border-red-500' : 'border-gray-600'
        } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 sm:text-sm transition-colors`}
      />
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
} 