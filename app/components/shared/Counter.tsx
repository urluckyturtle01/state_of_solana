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

// Helper function to parse numeric values from formatted strings like "$1.95T" or "$950B"
const parseNumericValue = (value: string): number => {
  if (!value) return 0;
  
  // Extract numeric part and multiplier (B, M, T)
  const match = value.match(/\$?([\d.]+)([BMT])?/);
  if (!match) return 0;
  
  const number = parseFloat(match[1]);
  const multiplier = match[2];
  
  // Return raw numeric value in a consistent scale
  switch(multiplier) {
    case 'T': return number * 1000000; // Convert T to millions for consistency
    case 'B': return number * 1000;    // Convert B to millions for consistency
    case 'M': return number;           // Already in millions
    default: return number;
  }
};

// Format numbers based on their value range
const formatAnimatedValue = (value: number, targetValue: string): string => {
  // If target ends with T, format as trillion
  if (targetValue.includes('T')) {
    return `$${(value / 1000000).toFixed(2)}T`;
  }
  // If target ends with B, format as billion
  else if (targetValue.includes('B')) {
    return `$${(value / 1000).toFixed(2)}B`;
  }
  // If target ends with M, format as million
  else if (targetValue.includes('M')) {
    return `${value.toFixed(1)}M`;
  }
  // For percentages
  else if (targetValue.includes('%')) {
    return `${value.toFixed(1)}%`;
  }
  // Default format
  return value.toString();
};

export default function Counter({ title, value, trend, icon, variant = "indigo", isLoading = false }: CounterProps) {
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
    const duration = 1500; // animation duration in ms
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
    <div className={`bg-black/80 backdrop-blur-sm p-5 rounded-xl border border-gray-900 shadow-lg ${styles.shadow} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-medium text-gray-300">{title}</h2>
        <div className={`p-1.5 ${styles.bg} rounded-md`}>
          <div className={styles.text}>
            {icon}
          </div>
        </div>
      </div>
      <div className="mt-0.5">
        <div className="text-2xl font-semibold text-white leading-tight">
          {value === "Loading..." ? animatedValue : isAnimating ? animatedValue : value}
        </div>
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            <span className={`${trend.value >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center`}>
              <svg 
                className="w-2.5 h-2.5 mr-0.5" 
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
              {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 ml-1.5">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
} 