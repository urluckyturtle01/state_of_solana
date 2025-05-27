import React from 'react';

interface LegendItemProps {
  label: string;
  color: string;
  shape?: 'circle' | 'square';
  isLoading?: boolean;
  tooltipText?: string;
  onClick?: () => void;
  inactive?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({
  label,
  color,
  shape = 'square',
  isLoading = false,
  tooltipText,
  onClick,
  inactive = false,
}) => {
  return (
    <div
      className={`flex items-start whitespace-nowrap select-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{ opacity: inactive ? 0.4 : 1 }}
      onClick={onClick}
      title={tooltipText || label}
    >
      <div 
        className={`w-2 h-2 mr-2 ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'} mt-0.5 ${isLoading ? 'animate-pulse' : ''}`}
        style={{ background: color, filter: inactive ? 'grayscale(0.7)' : undefined }}
      ></div>
      <span 
        className={`text-[11px] text-gray-400 lg:text-gray-300 md:text-gray-300 truncate ${inactive ? 'line-through' : ''}`}
      >
        {label.length > 15 && !tooltipText ? `${label.substring(0, 15)}...` : label}
      </span>
    </div>
  );
};
 

export default LegendItem; 