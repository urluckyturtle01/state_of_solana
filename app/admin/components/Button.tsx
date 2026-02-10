import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  type = 'button',
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  isLoading = false,
  icon,
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700 shadow-lg shadow-indigo-900/20',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 shadow-lg shadow-gray-900/20',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-red-700 shadow-lg shadow-red-900/20',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 shadow-lg shadow-emerald-900/20',
    warning: 'bg-amber-500 hover:bg-amber-400 text-white border-amber-600 shadow-lg shadow-amber-900/20',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        inline-flex justify-center items-center border rounded-lg font-medium 
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500
        ${className}
      `}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !isLoading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
} 