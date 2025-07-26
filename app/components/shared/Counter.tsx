"use client";

import React, { useState, useEffect, useRef } from "react";

type CounterVariant = "indigo" | "blue" | "purple" | "emerald" | "amber" | "rose";

interface CounterProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    label: string;
  };
  icon: React.ReactNode;
  variant?: CounterVariant;
  isLoading?: boolean;
  className?: string;
}

const variantStyles: Record<CounterVariant, { bg: string, text: string, shadow: string }> = {
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    shadow: "hover:shadow-indigo-900/20"
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    shadow: "hover:shadow-blue-900/20"
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    shadow: "hover:shadow-purple-900/20"
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    shadow: "hover:shadow-emerald-900/20"
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    shadow: "hover:shadow-amber-900/20"
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    shadow: "hover:shadow-rose-900/20"
  }
};

// Helper function to extract suffix from a value string
const extractSuffix = (value: string): string => {
  // Match any non-numeric, non-comma suffix after the last number
  const match = value.match(/[\d,]+([^\d,]+)$/);
  return match ? match[1].trim() : '';
};

// Helper function to extract SOL-related suffix (jitoSOL, mSOL, SOL, etc.)
const extractSOLSuffix = (value: string): string => {
  // Match any suffix that contains "SOL" (case insensitive)
  const match = value.match(/[\d,.\s]*([a-zA-Z]*SOL[a-zA-Z]*)/i);
  return match ? match[1] : '';
};

// Helper function to parse numeric values from formatted strings like "$1.95T" or "$950B" or "1,364"
const parseNumericValue = (value: string): number => {
  if (!value) return 0;
  
  // Remove any commas first
  const cleanValue = value.replace(/,/g, '');
  
  // Extract numeric part and multiplier (B, M, T, K), ignoring any SOL-related suffix
  const match = cleanValue.match(/([^\d]*)?([\d.]+)\s*([BMTK])?\s*([a-zA-Z]*SOL[a-zA-Z]*)?/i);
  if (!match) return 0;
  
  const number = parseFloat(match[2]);
  const multiplier = match[3];
  
  // Return actual numeric value
  switch(multiplier) {
    case 'T': return number * 1000000000000; // Trillion
    case 'B': return number * 1000000000;    // Billion
    case 'M': return number * 1000000;       // Million
    case 'K': return number * 1000;          // Thousand
    default: return number;                  // No multiplier
  }
};

// Format numbers based on their value range
const formatAnimatedValue = (value: number, targetValue: string): string => {
  // Check if the target value contains SOL and extract the actual SOL suffix
  const solSuffix = extractSOLSuffix(targetValue);
  const prefixMatch = targetValue.match(/^([^\d]*)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  let formattedValue: string;

  // If target has commas and no currency symbol, format as integer with commas
  if (targetValue.includes(',') && !targetValue.includes('$')) {
    formattedValue = Math.round(value).toLocaleString('en-US');
  }
  // Format based on actual numeric value ranges
  else if (value >= 1000000000000) {
    formattedValue = `${(value / 1000000000000).toFixed(1)}T`;
  }
  else if (value >= 1000000000) {
    formattedValue = `${(value / 1000000000).toFixed(1)}B`;
  }
  else if (value >= 1000000) {
    formattedValue = `${(value / 1000000).toFixed(1)}M`;
  }
  else if (value >= 1000) {
    formattedValue = `${(value / 1000).toFixed(1)}K`;
  }
  // For percentages
  else if (targetValue.includes('%')) {
    formattedValue = `${value.toFixed(1)}%`;
  }
  // For plain integers (no commas in original)
  else if (!isNaN(Number(targetValue))) {
    formattedValue = value.toFixed(1);
  }
  // Default format - also use one decimal place
  else {
    formattedValue = value.toFixed(1);
  }

  // Handle unit conversions: 1000.0B -> 1.0T, 1000.0M -> 1.0B, etc.
  const unitConversions: Record<string, string> = {
    'K': 'M',
    'M': 'B', 
    'B': 'T'
  };
  
  // Check if we need to convert units (e.g., 1000.0B to 1.0T)
  // Look for pattern: number + unit (without prefix yet)
  const unitMatch = formattedValue.match(/^(\d+(?:\.\d+)?)([KMBT])$/);
  if (unitMatch) {
    const [, numberPart, unit] = unitMatch;
    const number = parseFloat(numberPart);
    
    if (number >= 1000.0 && unitConversions[unit]) {
      const newUnit = unitConversions[unit];
      const newNumber = (number / 1000).toFixed(1);
      formattedValue = `${newNumber}${newUnit}`;
    }
  }

  // Add prefix if it exists
  if (prefix) {
    formattedValue = `${prefix}${formattedValue}`;
  }

  // Add the actual SOL suffix if present in target value (jitoSOL, mSOL, SOL, etc.)
  if (solSuffix) {
    formattedValue = `${formattedValue} ${solSuffix}`;
  }

  return formattedValue;
};

export default function Counter({ 
  title, 
  value, 
  trend, 
  icon, 
  variant = "indigo", 
  isLoading = false,
  className = ""
}: CounterProps) {
  const styles = variantStyles[variant];
  const [animatedValue, setAnimatedValue] = useState<string>("0");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const targetValue = useRef<string>(value);
  const frameRef = useRef<number>(0);
  
  useEffect(() => {
    // Don't animate on first render or if value is "Loading..."
    if (value === "Loading..." || value === animatedValue) {
      return;
    }
    
    targetValue.current = value;
    const startValue = parseNumericValue(animatedValue);
    const endValue = parseNumericValue(value);
    
    if (startValue === endValue) {
      return;
    }
    
    // Cancel any existing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    setIsAnimating(true);
    
    // Define animation parameters
    const duration = 300; // animation duration in ms (reduced from 1500)
    const startTime = performance.now();
    
    // Animation function
    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      // Calculate current value
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setAnimatedValue(formatAnimatedValue(currentValue, value));
      
      // Continue animation if not complete
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedValue(value);
        setIsAnimating(false);
      }
    };
    
    // Start animation
    frameRef.current = requestAnimationFrame(animate);
    
    // Clean up on unmount
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, animatedValue]);
  
  return (
    <div className={`bg-black/80 backdrop-blur-sm p-4 md:p-5 rounded-xl border border-gray-900 shadow-lg ${styles.shadow} transition-all duration-300 min-h-[90px] ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs md:text-sm font-normal text-gray-500">{title}</h2>
        <div className={`p-1 md:p-1.5 ${styles.bg} rounded-md`}>
          <div className={`${styles.text} w-4 h-4 md:w-5 md:h-5`}>
            {icon}
          </div>
        </div>
      </div>
      <div className="mt-1">
        <div className="text-xl md:text-2xl font-medium text-gray-300 leading-relaxed truncate">
          {value === "Loading..." ? animatedValue : isAnimating ? animatedValue : value}
        </div>
        {trend && (
          <div className="flex items-center mt-1 text-xs md:text-sm">
            <span className={`${trend.value >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center`}>
              <svg 
                className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={trend.value >= 0 
                    ? "M5 10l7-7m0 0l7 7m-7-7v18"  // up arrow
                    : "M19 14l-7 7m0 0l-7-7m7 7V3" // down arrow
                  } 
                />
              </svg>
              {Math.abs(trend.value).toFixed(1)}%
            </span>
            <span className="text-gray-500 ml-1 md:ml-1.5">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
} 