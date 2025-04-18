import React from 'react';

interface LoaderProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 'sm',
  className = ''
}) => {
  // Size mapping
  const sizeClasses = {
    xs: 'h-3 w-3 border-[1.5px]',
    sm: 'h-4 w-4 border-[1.5px]',
    md: 'h-5 w-5 border-2',
  };

  return (
    <div className={`flex justify-center items-center h-full ${className}`}>
      <div 
        className={`
          animate-spin 
          ${sizeClasses[size]} 
          border-gray-600/50 
          rounded-full 
          border-t-transparent
        `}
      />
    </div>
  );
};

export default Loader; 