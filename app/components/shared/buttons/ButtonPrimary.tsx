import React from 'react';

interface ButtonPrimaryProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({ 
  onClick, 
  children, 
  className = '',
  disabled = false,
  icon
}) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-2 
        bg-blue-600 hover:bg-blue-700 
        text-white 
        rounded-md 
        text-xs font-medium
        transition-colors duration-200 
        border border-blue-500 
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:pointer-events-none
        ${className}
      `}
    >
      {icon && (
        <span className="flex items-center">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
};

export default ButtonPrimary; 