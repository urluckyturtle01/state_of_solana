import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { curveMonotoneX, curveLinear, curveStep, curveBasis, curveCardinal, curveCatmullRom } from '@visx/curve';

// Define a constant for the handle color
const axisColor = '#374151';

// Mobile detection utility
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || 'ontouchstart' in window;
};

// Custom brush handle component with enhanced mobile support
const BrushHandle = ({ 
  x, 
  height
}: { 
  x: number; 
  height: number;
  isBrushActive?: boolean;
}) => {
  const pathWidth = 8; // Keep consistent size
  const pathHeight = 15; // Keep consistent size
  
  return (
    <Group left={x + pathWidth / 2} top={(height - pathHeight) / 2}>
      {/* Invisible larger touch target for mobile only */}
      {isMobile() && (
        <rect
          x={-12}
          y={-8}
          width={24}
          height={31}
          fill="transparent"
          style={{ cursor: 'ew-resize' }}
        />
      )}
      <path
        className="stroke-[#374151] cursor-ew-resize"
        fill=""
        d="M -4.5 0.5 L 3.5 0.5 L 3.5 15.5 L -4.5 15.5 L -4.5 0.5 M -1.5 4 L -1.5 12 M 0.5 4 L 0.5 12"
        strokeWidth="0.7"
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      />
    </Group>
  );
};

// Type declaration for Brush handle props
interface BrushHandleRenderProps {
  x: number;
  height: number;
  isBrushActive?: boolean;
}

export interface BrushTimeScaleProps {
  data: any[];
  isModal?: boolean;
  activeBrushDomain: [Date, Date] | null;
  onBrushChange: (domain: any) => void;
  onClearBrush: () => void;
  // Function that extracts date from data point, can return string or Date
  getDate: (d: any) => string | Date;
  // Function that extracts value for the line from data point
  getValue: (d: any) => number;
  // Function for organizing data by unique dates
  getUniqueDates?: (data: any[]) => string[];
  // Line color
  lineColor: string;
  // Optional margin
  margin?: { top: number; right: number; bottom: number; left: number };
  // Custom curve type
  curveType?: string | null;
  // Stroke width
  strokeWidth?: number;
  // Filter values - when these change, brush should reset to fully selected mode
  filterValues?: Record<string, string>;
}

const BrushTimeScale: React.FC<BrushTimeScaleProps> = ({
  data,
  isModal = false,
  activeBrushDomain,
  onBrushChange,
  onClearBrush,
  getDate,
  getValue,
  getUniqueDates,
  lineColor,
  margin = { top: 5, right: 25, bottom: 10, left: 45 },
  curveType = "monotoneX",
  strokeWidth,
  filterValues
}) => {
  // Prevent the initial render from triggering onChange
  const initialRenderRef = useRef(true);
  
  // Track the brush instance to prevent unnecessary updates
  const brushRef = useRef<any>(null);
  
  // Add a ref to the SVG container so we can find DOM elements more reliably
  const svgRef = useRef<SVGSVGElement | null>(null);
  
  // Add a ref to the component container to scope DOM queries
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Add a ref to store the current innerWidth for use in DOM manipulations
  const innerWidthRef = useRef<number>(0);
  
  // Generate a stable ID for this component instance
  const instanceIdRef = useRef(`brush-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track previous filter values to detect changes
  const prevFilterValuesRef = useRef<Record<string, string> | undefined>(filterValues);
  
  // Track if filters have changed
  const [filterChangeCount, setFilterChangeCount] = useState(0);
  
  // Track the last filter change counter value that affected positioning
  const lastFilterChangeRef = useRef(0);

  // Mobile touch handling state
  const [isTouching, setIsTouching] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Mobile touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile()) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    if (touch) {
      setIsTouching(true);
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile() || !isTouching) return;
    
    e.preventDefault();
    e.stopPropagation();
  }, [isTouching]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile()) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsTouching(false);
    touchStartRef.current = null;
  }, []);

  // Prevent default touch behaviors on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile()) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      // Allow scrolling on the page but prevent default on brush interactions
      if (e.target && (e.target as Element).closest('[data-brush-container]')) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    container.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    container.addEventListener('touchend', preventDefaultTouch, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefaultTouch);
      container.removeEventListener('touchmove', preventDefaultTouch);
      container.removeEventListener('touchend', preventDefaultTouch);
    };
  }, []);

  // Effect to reset brush when filter values change
  useEffect(() => {
    // Skip the initial render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    // Check if filterValues exist and have changed
    if (filterValues && prevFilterValuesRef.current) {
      // Check if any filter values have changed
      const hasFilterChanged = Object.keys(filterValues).some(key => 
        filterValues[key] !== prevFilterValuesRef.current?.[key]
      );

      if (hasFilterChanged) {
        console.log('Filter changed, resetting brush to show full dataset');
        
        // Reset the brush to show the full dataset
        onClearBrush();
        
        // Increment filter change counter to force brush remount
        setFilterChangeCount(prev => prev + 1);
      }
    }

    // Update ref for next comparison
    prevFilterValuesRef.current = filterValues;
  }, [filterValues, onClearBrush]);
  
  // Create a key that changes when filters change to force brush remount
  const brushKey = React.useMemo(() => {
    return `${instanceIdRef.current}-${data.length}-${filterChangeCount}`;
  }, [data.length, filterChangeCount]);
  
  // Effect to update lastFilterChangeRef when activeBrushDomain changes directly
  // This handles the case where a filter change happens but then a new domain is explicitly set
  useEffect(() => {
    if (activeBrushDomain) {
      // Update the ref to the current filter change count to sync them
      // This will ensure that a new activeBrushDomain is respected even after filter changes
      lastFilterChangeRef.current = filterChangeCount;
    }
  }, [activeBrushDomain, filterChangeCount]);
  
  // Map curve type string to actual curve function
  const getCurveFunction = useCallback((type: string | null) => {
    // Always return a valid curve function
    if (type === null) return curveLinear;
    
    switch (type) {
      case 'monotoneX':
        return curveMonotoneX;
      case 'linear':
        return curveLinear;
      case 'step':
        return curveStep;
      case 'basis':
        return curveBasis;
      case 'cardinal':
        return curveCardinal;
      case 'catmullRom':
        return curveCatmullRom;
      default:
        return curveMonotoneX; // Default
    }
  }, []);
  
  // Get the actual curve function
  const curveFunction = React.useMemo(() => {
    return getCurveFunction(curveType);
  }, [curveType, getCurveFunction]);
  
  if (data.length === 0) return null;
  
  return (
    <div 
      className="h-full w-full" 
      ref={containerRef}
      data-brush-container
      style={{
        touchAction: isMobile() ? 'pan-y' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <ParentSize>
        {({ width, height }) => {
          if (width <= 0 || height <= 0) return null;
          
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          if (innerWidth <= 0 || innerHeight <= 0) return null;
          
          // Store the current innerWidth in the ref for use outside this scope
          innerWidthRef.current = innerWidth;
          
          // Handle unique dates if provided
          const uniqueDates = getUniqueDates 
            ? getUniqueDates(data)
            : [...new Set(data.map(d => {
                const dateValue = getDate(d);
                return typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
              }))];
          
          // Convert dates to Date objects for the time scale
          const dateDomain = uniqueDates.map(d => new Date(d));
          const dateExtent = [
            new Date(Math.min(...dateDomain.map(d => d.getTime()))),
            new Date(Math.max(...dateDomain.map(d => d.getTime())))
          ];
          
          // Use scaleTime for the brush
          const brushDateScale = scaleTime<number>({
            domain: dateExtent,
            range: [0, innerWidth],
            nice: true
          });
          
          // Find max value for Y axis scale (ensuring we don't have bad values)
          let allValues = data.map(d => {
            const val = getValue(d);
            return (val === undefined || val === null || isNaN(val)) ? 0 : val;
          });
          
          // Ensure we have at least one positive value for scale
          if (allValues.length === 0 || Math.max(...allValues) <= 0) {
            allValues = [1];
          }
          
          const maxValue = Math.max(...allValues);
          
          const valueScale = scaleLinear<number>({
            domain: [0, maxValue * 1.1], // Add 10% headroom
            range: [innerHeight, 0],
            nice: true,
            round: false // Prevent rounding to ensure all gridlines show
          });
          
          // Create linear scale for distributing indices
          const indexScale = scaleLinear({
            domain: [0, uniqueDates.length - 1],
            range: [0, innerWidth],
          });
          
          // Calculate initial brush position
          // If we have an active domain AND either:
          // 1. The filter hasn't changed since our last check, OR
          // 2. We have a newly specified domain that we should respect
          const shouldUseActiveDomain = activeBrushDomain && 
            (filterChangeCount === lastFilterChangeRef.current || lastFilterChangeRef.current === 0);
          
          const initialBrushPosition = shouldUseActiveDomain
            ? { 
                start: { x: brushDateScale(activeBrushDomain[0]) }, 
                end: { x: brushDateScale(activeBrushDomain[1]) } 
              }
            : { 
                start: { x: 0 },           // ← Minimum position
                end: { x: innerWidth }     // ← Maximum position (full width)
              };
          
          // Update our ref to the current filter change count
          lastFilterChangeRef.current = filterChangeCount;
          
          // If getUniqueDates is provided, we need to create line data by dates
          const lineData = getUniqueDates 
            ? uniqueDates.map((date, idx) => {
                // Find data point for this date - assumes first match is representative
                const dataPoint = data.find(d => {
                  const dateValue = getDate(d);
                  return typeof dateValue === 'string' 
                    ? dateValue === date 
                    : dateValue.toISOString() === date;
                });
                return {
                  date,
                  idx,
                  value: dataPoint ? getValue(dataPoint) : 0
                };
              })
            // Otherwise use data directly with indices
            : data.map((d, idx) => {
                // Ensure valid values for the line path
                const val = getValue(d);
                const safeValue = (val === undefined || val === null || isNaN(val)) ? 0 : val;
                
                return {
                  date: typeof getDate(d) === 'string' ? getDate(d) as string : (getDate(d) as Date).toISOString(),
                  idx,
                  value: safeValue
                };
              });
              
          // Create a wrapped change handler that prevents the initial render from triggering updates
          const handleBrushChange = (domain: any) => {
            if (domain) {
              // Use requestAnimationFrame to avoid React update loops
              window.requestAnimationFrame(() => {
                onBrushChange(domain);
              });
            } else {
              onClearBrush();
            }
          };
          
          // Custom render function for the brush handles
          const renderBrushHandle = ({ x, y, height: handleHeight }: { x: number; y: number; height: number }) => {
            return (
              <BrushHandle 
                x={x} 
                height={innerHeight} 
              />
            );
          };
          
          return (
            <svg 
              width={width} 
              height={height} 
              ref={svgRef} 
              data-instance-id={instanceIdRef.current}
              style={{
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
            >
              <Group left={margin.left} top={margin.top}>
                {/* Background rectangle to ensure brush is visible when empty */}
                <rect
                  x={0}
                  y={0}
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  style={{ touchAction: 'none' }}
                />
                
                {/* Line representing the data */}
                <LinePath 
                  data={lineData}
                  x={(d) => indexScale(d.idx)}
                  y={(d) => {
                    // Ensure we have valid values
                    const val = d.value;
                    if (val === undefined || val === null || isNaN(val)) {
                      return valueScale(0);
                    }
                    return valueScale(val);
                  }}
                  stroke={lineColor || "#53a7fe"}
                  strokeOpacity={0.3}
                  strokeWidth={strokeWidth || 1.5}
                  curve={curveFunction}
                />
                
                <Brush
                  key={brushKey}
                  ref={brushRef}
                  xScale={brushDateScale}
                  yScale={valueScale}
                  width={innerWidth}
                  height={innerHeight}
                  handleSize={8}
                  resizeTriggerAreas={['left', 'right']}
                  brushDirection="horizontal"
                  initialBrushPosition={initialBrushPosition}
                  onChange={handleBrushChange}
                  onClick={onClearBrush}
                  useWindowMoveEvents={!isMobile()}
                  selectedBoxStyle={{ 
                    fill: 'rgba(18, 24, 43, 0.2)',
                    stroke: '#374151',
                    strokeWidth: 0.4,
                    rx: 4,
                    ry: 4,
                  }}
                  renderBrushHandle={renderBrushHandle}
                />
              </Group>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
};

export default BrushTimeScale; 