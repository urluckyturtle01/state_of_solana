import React from 'react';

interface LegendItemProps {
  label: string;
  color: string;
  shape?: 'circle' | 'square';
  isLoading?: boolean;
  tooltipText?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  inactive?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({
  label,
  color,
  shape = 'square',
  isLoading = false,
  tooltipText,
  onClick,
  onDoubleClick,
  inactive = false,
}) => {
  return (
    <div
      className={`flex items-center whitespace-nowrap select-none ${onClick || onDoubleClick ? 'cursor-pointer' : ''}`}
      style={{ opacity: inactive ? 0.4 : 1 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={tooltipText || label}
    >
      <div 
        className={`w-1.5 h-1.5 mr-2 rounded-full flex-shrink-0 ${isLoading ? 'animate-pulse' : ''}`}
        style={{ background: color, filter: inactive ? 'grayscale(0.7)' : undefined }}
      ></div>
      <span 
        className={`text-[11px] text-gray-400 lg:text-gray-300 md:text-gray-300 truncate leading-relaxed ${inactive ? 'line-through' : ''}`}
      >
        {label.length > 15 && !tooltipText ? `${label.substring(0, 15)}...` : label}
      </span>
    </div>
  );
};
 

export default LegendItem; 