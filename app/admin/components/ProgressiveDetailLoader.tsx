import React, { useState, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ProgressiveDetailLoaderProps {
  chartId: string;
  pageId: string;
  currentLevel: string;
  availableLevels: string[];
  onLevelChange: (level: string) => void;
  isLoading?: boolean;
  compressionStats?: Record<string, any>;
}

const LEVEL_DESCRIPTIONS = {
  raw: { label: 'Raw Data', description: 'Original data points', detail: 'Maximum detail' },
  daily: { label: 'Daily', description: 'Daily aggregated', detail: 'Day-by-day view' },
  weekly: { label: 'Weekly', description: 'Weekly aggregated', detail: 'Week-by-week view' },
  monthly: { label: 'Monthly', description: 'Monthly aggregated', detail: 'Month-by-month view' },
  quarterly: { label: 'Quarterly', description: 'Quarterly aggregated', detail: 'Quarter-by-quarter view' },
  yearly: { label: 'Yearly', description: 'Yearly aggregated', detail: 'Year-by-year view' }
};

const LEVEL_ORDER = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily', 'raw'];

export default function ProgressiveDetailLoader({
  chartId,
  pageId,
  currentLevel,
  availableLevels,
  onLevelChange,
  isLoading = false,
  compressionStats
}: ProgressiveDetailLoaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get level information
  const currentLevelInfo = LEVEL_DESCRIPTIONS[currentLevel as keyof typeof LEVEL_DESCRIPTIONS];
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
  
  // Find adjacent levels for quick navigation
  const canIncreaseDetail = currentIndex > 0 && availableLevels.includes(LEVEL_ORDER[currentIndex - 1]);
  const canDecreaseDetail = currentIndex < LEVEL_ORDER.length - 1 && availableLevels.includes(LEVEL_ORDER[currentIndex + 1]);
  
  const increaseDetailLevel = useCallback(() => {
    if (canIncreaseDetail) {
      const nextLevel = LEVEL_ORDER[currentIndex - 1];
      onLevelChange(nextLevel);
    }
  }, [canIncreaseDetail, currentIndex, onLevelChange]);

  const decreaseDetailLevel = useCallback(() => {
    if (canDecreaseDetail) {
      const nextLevel = LEVEL_ORDER[currentIndex + 1];
      onLevelChange(nextLevel);
    }
  }, [canDecreaseDetail, currentIndex, onLevelChange]);

  // Get performance benefits for current level
  const getPerformanceBenefit = (level: string) => {
    if (!compressionStats || !compressionStats[level]) return null;
    
    const stats = compressionStats[level];
    return {
      pointReduction: stats.pointReduction,
      sizeReduction: stats.dataSizeReduction,
      points: stats.aggregatedPoints
    };
  };

  const currentBenefit = getPerformanceBenefit(currentLevel);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              {currentLevelInfo?.label || currentLevel}
            </span>
            {currentBenefit && (
              <span className="text-xs text-gray-500">
                ({currentBenefit.points.toLocaleString()} points)
              </span>
            )}
          </div>
          
          {currentBenefit && (
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              {currentBenefit.pointReduction} optimized
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick navigation buttons */}
          <button
            onClick={increaseDetailLevel}
            disabled={!canIncreaseDetail || isLoading}
            className={`p-1 rounded text-xs ${
              canIncreaseDetail && !isLoading
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Increase detail level"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={decreaseDetailLevel}
            disabled={!canDecreaseDetail || isLoading}
            className={`p-1 rounded text-xs ${
              canDecreaseDetail && !isLoading
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Decrease detail level"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {LEVEL_ORDER.filter(level => availableLevels.includes(level)).map((level) => {
              const levelInfo = LEVEL_DESCRIPTIONS[level as keyof typeof LEVEL_DESCRIPTIONS];
              const benefit = getPerformanceBenefit(level);
              const isCurrentLevel = level === currentLevel;
              
              return (
                <button
                  key={level}
                  onClick={() => onLevelChange(level)}
                  disabled={isCurrentLevel || isLoading}
                  className={`text-left p-2 rounded border text-xs ${
                    isCurrentLevel
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : isLoading
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{levelInfo.label}</div>
                  <div className="text-gray-500 mt-1">{levelInfo.description}</div>
                  {benefit && (
                    <div className="text-green-600 mt-1">
                      {benefit.points.toLocaleString()} pts
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>💡 Higher detail levels may load slower but show more data points</span>
              {isLoading && (
                <span className="text-blue-600">Loading...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 