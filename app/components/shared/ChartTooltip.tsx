import React from 'react';

// Shape options for legend items
type ShapeType = 'circle' | 'square';

// Tooltip item interface
interface TooltipItem {
  color: string;
  label: string;
  value: string | number;
  shape?: ShapeType;
  axis?: 'left' | 'right';
}

// Tooltip component props
interface ChartTooltipProps {
  title: string;
  items: TooltipItem[];
  top: number;
  left: number;
  isModal?: boolean;
  timeFilter?: string;
  currencyFilter?: string;
  showTotal?: boolean;
}

// Function to render the shape for a legend item
const LegendShape: React.FC<{ type: ShapeType; color: string }> = ({ type, color }) => {
  if (type === 'circle') {
    return <div className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: color }}></div>;
  }
  return <div className="h-2 w-2 rounded-sm mr-1.5" style={{ backgroundColor: color }}></div>;
};

// Function to format date title based on timeFilter
const formatTooltipTitle = (title: string, timeFilter?: string): string => {
  // Check if it's a date format
  if (/^\d{4}-\d{2}-\d{2}/.test(title) || /^\d{2}\/\d{2}\/\d{4}/.test(title)) {
    const d = new Date(title);
    if (!isNaN(d.getTime())) {
      // Weekly data
      if (timeFilter === 'W') {
        return `Week of ${d.toLocaleDateString('en-US', { 
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        })}`;
      } 
      // Monthly data
      else if (timeFilter === 'M') {
        return d.toLocaleDateString('en-US', { 
          month: 'short',
          year: 'numeric'
        });
      } 
      // Quarterly data
      else if (timeFilter === 'Q') {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `Q${quarter}, ${d.getFullYear()}`;
      } 
      // Yearly data
      else if (timeFilter === 'Y') {
        return d.getFullYear().toString();
      }
      
      // Default format (daily)
      return d.toLocaleDateString('en-US', { 
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    }
  }
  
  // For month-year format like "Jan 2023"
  if (/^[A-Za-z]{3}\s\d{4}$/.test(title)) {
    return title;
  }
  
  // For quarterly format like "Q1 2023"
  if (/^Q[1-4]\s\d{4}$/.test(title)) {
    return title;
  }
  
  // For year only
  if (/^\d{4}$/.test(title)) {
    return title;
  }
  
  return title;
};

// Helper function to apply currency formatting based on the selected currency
const formatValueWithCurrency = (value: string | number, currencyFilter?: string): string => {
  // If value is already a string (possibly pre-formatted), return it as is
  if (typeof value === 'string') {
    // Only apply currency conversion for known currency codes
    // If the currencyFilter is not a standard currency, don't override existing formatting
    if (currencyFilter) {
      // Common currency symbols to detect and replace
      const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'SOL': 'SOL'
      };
      
      // Only apply currency conversion if the currencyFilter is a known currency code
      const isKnownCurrency = currencyFilter in currencySymbols;
      
      if (isKnownCurrency) {
      // Get the selected currency symbol
        const selectedSymbol = currencySymbols[currencyFilter as keyof typeof currencySymbols];
      
      // Handle SOL currency specially because it goes after the number
      if (currencyFilter === 'SOL') {
        // Check if value already has SOL
        if (value.includes('SOL')) {
          return value;
        }
        
        // Check for other currency symbols at the beginning and remove them
        for (const [currency, symbol] of Object.entries(currencySymbols)) {
          if (currency !== 'SOL' && value.startsWith(symbol)) {
            // Remove the symbol and add SOL at the end with a space
            return `${value.substring(symbol.length)} SOL`;
          }
        }
        
        // If no currency symbol was found, just add SOL at the end
        return `${value} SOL`;
      }
      
      // For other currencies, use normal replacement
      // Check if the value starts with a different currency symbol
      for (const [currency, symbol] of Object.entries(currencySymbols)) {
        if (value.startsWith(symbol) && currency !== currencyFilter) {
          // Replace the symbol with the selected currency
          return value.replace(symbol, selectedSymbol);
          }
        }
      }
    }
    return value;
  }
  
  // For numeric values without pre-formatting
  if (typeof value === 'number') {
    if (currencyFilter) {
      // Only apply currency formatting for known currency codes
      const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'SOL': 'SOL'
      };
      
      const isKnownCurrency = currencyFilter in currencySymbols;
      
      if (isKnownCurrency) {
      // Apply the selected currency to the number
      switch (currencyFilter) {
        case 'USD':
          return `$${value.toLocaleString()}`;
        case 'EUR':
          return `€${value.toLocaleString()}`;
        case 'GBP':
          return `£${value.toLocaleString()}`;
        case 'JPY':
        case 'CNY':
          return `¥${value.toLocaleString()}`;
        case 'SOL':
          return `${value.toLocaleString()} SOL`;
        default:
            return value.toLocaleString();
        }
      }
    }
    
    // Default formatting if no currency filter or unknown currency
    return value.toLocaleString();
  }
  
  // Fallback
  return String(value);
};

// Main tooltip component
const ChartTooltip: React.FC<ChartTooltipProps> = ({ 
  title, 
  items, 
  top, 
  left, 
  isModal = false,
  timeFilter,
  currencyFilter,
  showTotal = false
}) => {
  // Calculate if tooltip should be positioned right to left (to avoid edge cutoff)
  const shouldFlipX = left > (isModal ? 500 : 250);
  
  // Check if we have any axis information (dual-axis chart)
  const hasDualAxisItems = items.some(item => item.axis);
  
  // Format the title based on timeFilter if provided
  const formattedTitle = formatTooltipTitle(title, timeFilter);

  // Helper function to convert formatted values to raw numbers
  const parseValueWithUnits = (value: string | number): number => {
    if (typeof value === 'number') return value;
    
    // Extract the numeric part and any suffix
    const matches = value.replace(/,/g, '').match(/^[^\d]*([0-9.]+)([KMBT])?/i);
    if (!matches) return 0;
    
    const numericPart = parseFloat(matches[1]);
    if (isNaN(numericPart)) return 0;
    
    const unitSuffix = matches[2]?.toUpperCase();
    
    // Apply multiplier based on suffix
    if (unitSuffix === 'K') return numericPart * 1000;
    if (unitSuffix === 'M') return numericPart * 1000000;
    if (unitSuffix === 'B') return numericPart * 1000000000;
    if (unitSuffix === 'T') return numericPart * 1000000000000;
    
    return numericPart;
  };
  
  // Sort items by value in descending order
  const sortedItems = [...items].sort((a, b) => {
    const valueA = parseValueWithUnits(a.value);
    const valueB = parseValueWithUnits(b.value);
    
    // Sort descending (higher values first)
    return valueB - valueA;
  });

  // Limit to maximum 12 items
  const maxItems = 12;
  const displayItems = sortedItems.slice(0, maxItems);
  const hasMoreItems = sortedItems.length > maxItems;
  const hiddenItemsCount = sortedItems.length - maxItems;

  // Calculate total if showTotal is enabled
  const totalValue = showTotal ? items.reduce((sum, item) => {
    return sum + parseValueWithUnits(item.value);
  }, 0) : 0;

  // Format the total value with M, K, T, B abbreviations
  const formatTotal = (total: number): string => {
    let formattedValue: string;
    
    // Format with appropriate scale
    if (total >= 1000000000000) {
      formattedValue = `${(total / 1000000000000).toFixed(2)}T`;
    } else if (total >= 1000000000) {
      formattedValue = `${(total / 1000000000).toFixed(2)}B`;
    } else if (total >= 1000000) {
      formattedValue = `${(total / 1000000).toFixed(2)}M`;
    } else if (total >= 1000) {
      formattedValue = `${(total / 1000).toFixed(2)}K`;
    } else {
      formattedValue = total.toFixed(2);
    }
    
    // Apply currency formatting if needed
    if (currencyFilter) {
      // Only apply currency formatting for known currency codes
      const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'SOL': 'SOL'
      };
      
      const isKnownCurrency = currencyFilter in currencySymbols;
      
      if (isKnownCurrency) {
      switch (currencyFilter) {
        case 'USD':
          return `$${formattedValue}`;
        case 'EUR':
          return `€${formattedValue}`;
        case 'GBP':
          return `£${formattedValue}`;
        case 'JPY':
        case 'CNY':
          return `¥${formattedValue}`;
        case 'SOL':
          return `${formattedValue} SOL`;
        default:
            return formattedValue;
        }
      }
    }
    
    return formattedValue;
  };

  return (
    <div 
      className="absolute z-10 pointer-events-none bg-gray-900/95 shadow-lg border border-gray-800 rounded-md p-2 text-xs min-w-[180px] w-auto whitespace-nowrap"
      style={{
        top: `${top}px`,
        left: shouldFlipX ? `${left - 160}px` : `${left + 10}px`,
        transform: `translateY(-100%)`,
      }}
    >
      {/* Title */}
      <div className="text-gray-400 text-[10px] font-normal pb-1 mb-1 border-b border-gray-800">
        {formattedTitle}
      </div>
      
      {/* Items */}
      <div className="space-y-1">
        {displayItems.map((item, idx) => (
          <div key={`tooltip-item-${idx}`} className="flex items-center mt-2 justify-between whitespace-nowrap">
            <div className="flex items-center text-gray-400">
              <LegendShape type={item.shape || 'circle'} color={item.color} />
              <span className="text-gray-400 text-[10px] font-normal ml-2">{item.label}</span>
              
              {/* Show axis indicator for dual-axis charts */}
              {hasDualAxisItems && item.axis && (
                <span className="ml-1 text-[9px] text-gray-500">
                  ({item.axis} axis)
                </span>
              )}
            </div>
            
            {/* Value with color matching the data point */}
            <span 
              className="text-gray-200 font-medium ml-4"
             
            >
              {formatValueWithCurrency(item.value, currencyFilter)}
            </span>
          </div>
        ))}
        
        {/* Show indicator for hidden items */}
        {hasMoreItems && (
          <div className="flex items-center justify-center whitespace-nowrap py-1">
            <span className="text-gray-500 text-[9px] font-normal italic">
              ... and {hiddenItemsCount} more item{hiddenItemsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {/* Show total if enabled */}
        {showTotal && items.length > 1 && (
          <>
            {/* Separator line */}
            <div className="border-t border-gray-800 my-1"></div>
            
            {/* Total row */}
            <div className="flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center text-gray-300">
                <div className="h-2 w-2 mr-1.5"></div> {/* Empty space for alignment */}
                <span className="text-gray-300 text-[10px] font-normal ml-2">Total</span>
              </div>
              
              <span className="text-gray-100 font-regular ml-4">
                {formatTotal(totalValue)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChartTooltip; 