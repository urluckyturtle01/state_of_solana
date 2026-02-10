import React from 'react';

interface ButtonSecondaryProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const ButtonSecondary: React.FC<ButtonSecondaryProps> = ({ 
  onClick, 
  children, 
  className = '',
  disabled = false
}) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        px-2 py-1 
        bg-gray-800/20 hover:bg-gray-700/20 
        text-gray-200/80 
        rounded 
        text-xs leading-relaxed tracking-wide
        transition-colors duration-200 
        border border-gray-700/40 
        flex items-center justify-center
        disabled:opacity-50 disabled:pointer-events-none
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default ButtonSecondary; 