import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { curveMonotoneX, curveLinear, curveStep, curveBasis, curveCardinal, curveCatmullRom } from '@visx/curve';

// Define a constant for the handle color
const axisColor = '#374151';

// Simple brush handle component
const BrushHandle = ({ 
  x, 
  height
}: { 
  x: number; 
  height: number;
  isBrushActive?: boolean;
}) => {
  const pathWidth = 8;
  const pathHeight = 15;
  
  return (
    <Group left={x + pathWidth / 2} top={(height - pathHeight) / 2}>
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
  // Simple refs for basic functionality
  const brushRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map curve type string to actual curve function
  const getCurveFunction = useCallback((type: string | null) => {
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
        return curveMonotoneX;
    }
  }, []);
  
  // Get the actual curve function
  const curveFunction = React.useMemo(() => {
    return getCurveFunction(curveType);
  }, [curveType, getCurveFunction]);

  // Simple brush handle renderer
  const renderBrushHandle = useCallback(({ x, y, height: handleHeight }: { x: number; y: number; height: number }) => {
    return (
      <BrushHandle 
        x={x} 
        height={handleHeight} 
      />
    );
  }, []);

  // Simple change handler
  const handleBrushChange = useCallback((domain: any) => {
    if (domain) {
      onBrushChange(domain);
    } else {
      onClearBrush();
    }
  }, [onBrushChange, onClearBrush]);

  if (data.length === 0) return null;
  
  return (
    <div 
      className="h-full w-full" 
      ref={containerRef}
      data-brush-container
      style={{
        touchAction: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <ParentSize>
        {({ width, height }) => {
          if (width <= 0 || height <= 0) return null;
          
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          if (innerWidth <= 0 || innerHeight <= 0) return null;
          
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
          const initialBrushPosition = activeBrushDomain
            ? { 
                start: { x: brushDateScale(activeBrushDomain[0]) }, 
                end: { x: brushDateScale(activeBrushDomain[1]) } 
              }
            : { 
                start: { x: 0 },
                end: { x: innerWidth }
              };
          
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
              
          return (
            <svg 
              width={width} 
              height={height} 
              ref={svgRef} 
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
                  useWindowMoveEvents={true}
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