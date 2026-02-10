import React from 'react';

interface TrendIconProps {
  className?: string;
}

// Exponential growth - curved upward line
export const ExponentialIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 14 Q6 10 8 6 T14 2" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
    <path 
      d="M12 2 L14 2 L14 4" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg> 
);

// Linear growth - straight upward line
export const GrowthIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 14 L14 2" 
      stroke="currentColor" 
      strokeWidth="1.5"
    />
    <path 
      d="M12 2 L14 2 L14 4" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Decline - downward line
export const DeclineIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 2 L14 14" 
      stroke="currentColor" 
      strokeWidth="1.5"
    />
    <path 
      d="M12 14 L14 14 L14 12" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Volatile/Zigzag - zigzag pattern
export const VolatileIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 12 L5 4 L8 10 L11 6 L14 8" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Stable - horizontal zigzag
export const StableIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 8 L4 6 L6 10 L8 7 L10 9 L12 6 L14 8" 
      stroke="currentColor" 
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

// Peak - zigzag with local peak
export const PeakIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 14 L4 10 L6 12 L8 4 L10 6 L12 8 L14 12" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Dip - valley shape
export const DipIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 2 L8 14 L14 2" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Recovery - V shape
export const RecoveryIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <path 
      d="M2 2 L8 14 L14 2" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
    <path 
      d="M12 2 L14 2 L14 4" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Bars - representing volume or distribution
export const VolumeIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <rect x="2" y="10" width="2" height="4" fill="currentColor" />
    <rect x="5" y="6" width="2" height="8" fill="currentColor" />
    <rect x="8" y="8" width="2" height="6" fill="currentColor" />
    <rect x="11" y="4" width="2" height="10" fill="currentColor" />
  </svg>
);

// Cycle - circular pattern
export const CycleIcon: React.FC<TrendIconProps> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none">
    <circle 
      cx="8" 
      cy="8" 
      r="6" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
      strokeDasharray="3 2"
    />
    <path 
      d="M12 4 L14 6 L10 6" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      fill="none"
    />
  </svg>
);

// Get trend color based on pattern
export const getTrendColor = (text: string): string => {
  const lowerText = text.toLowerCase();
  
  // Green for up trends
  if (lowerText.includes('[exponential]') || lowerText.includes('[growth]') || lowerText.includes('[recovery]')) {
    return 'text-green-400';
  }
  
  // Red for down trends
  if (lowerText.includes('[decline]') || lowerText.includes('[dip]')) {
    return 'text-red-400';
  }
  
  // Yellow for zigzag/volatile patterns
  if (lowerText.includes('[volatile]') || lowerText.includes('[stable]') || lowerText.includes('[peak]')) {
    return 'text-yellow-400';
  }
  
  // Default blue for other patterns
  return 'text-blue-400';
};

// Map trend keywords to icons
export const getTrendIcon = (text: string): React.ComponentType<TrendIconProps> | null => {
  const lowerText = text.toLowerCase();
  
  // Check for specific trend indicators (prioritize more specific ones first)
  if (lowerText.includes('[exponential]')) return ExponentialIcon;
  if (lowerText.includes('[growth]')) return GrowthIcon;
  if (lowerText.includes('[decline]')) return DeclineIcon;
  if (lowerText.includes('[volatile]')) return VolatileIcon;
  if (lowerText.includes('[stable]')) return StableIcon;
  if (lowerText.includes('[peak]')) return PeakIcon;
  if (lowerText.includes('[dip]')) return DipIcon;
  if (lowerText.includes('[recovery]')) return RecoveryIcon;
  if (lowerText.includes('[volume]')) return VolumeIcon;
  if (lowerText.includes('[cycle]')) return CycleIcon;
  
  return null;
};

// Remove trend indicators from text
export const cleanTrendText = (text: string): string => {
  return text.replace(/\[(exponential|growth|decline|volatile|stable|peak|dip|recovery|volume|cycle)\]/gi, '');
};

// Format numbers in K, M, B, T format
export const formatNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
};