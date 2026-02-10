import React from 'react';

interface PrettyLoaderProps {
  size?: 'sm' | 'md' | 'lg';
}

const PrettyLoader: React.FC<PrettyLoaderProps> = ({ size = 'md' }) => {
  // Map size prop to dimensions
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const innerRingOffset = {
    sm: 'inset-1.5',
    md: 'inset-2',
    lg: 'inset-3',
  };

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={`relative ${dimensions[size]}`}>
      {/* Outer spinning ring */}
      <div className="absolute inset-0 border-t-2 border-r-2 border-blue-400/60 rounded-full animate-spin"></div>
      
      {/* Middle spinning ring - reverse direction */}
      <div className={`absolute ${innerRingOffset[size]} border-b-2 border-l-2 border-purple-400/80 rounded-full animate-[spin_1.5s_linear_infinite_reverse]`}></div>
      
      {/* Inner pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${dotSize[size]} bg-teal-400 rounded-full animate-pulse`}></div>
      </div>
    </div>
  );
};

export default PrettyLoader; 