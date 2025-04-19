import React from 'react';
import { ParentSize } from '@visx/responsive';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';

export interface BrushTimeScaleProps {
  data: any[];
  isModal?: boolean;
  activeBrushDomain: [Date, Date] | null;
  onBrushChange: (domain: any) => void;
  onClearBrush: () => void;
  // Function that extracts date from data point
  getDate: (d: any) => string;
  // Function that extracts value for the line from data point
  getValue: (d: any) => number;
  // Function for organizing data by unique dates
  getUniqueDates?: (data: any[]) => string[];
  // Line color
  lineColor: string;
  // Optional margin
  margin?: { top: number; right: number; bottom: number; left: number };
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
  margin = { top: 5, right: 25, bottom: 10, left: 45 }
}) => {
  // Add a dataKey to force remounting the brush when data changes
  const dataKey = React.useMemo(() => data.length, [data.length]);
  
  if (data.length === 0) return null;
  
  return (
    <div className="h-full w-full">
      <ParentSize>
        {({ width, height }) => {
          if (width <= 0 || height <= 0) return null;
          
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;
          if (innerWidth <= 0 || innerHeight <= 0) return null;
          
          // Handle unique dates if provided
          const uniqueDates = getUniqueDates 
            ? getUniqueDates(data)
            : [...new Set(data.map(d => getDate(d)))];
          
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
          
          // Find max value for Y axis scale
          const maxValue = Math.max(
            ...data.map(d => getValue(d)),
            1 // Ensure minimum scale even if all values are 0
          );
          
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
          
          // Initial brush position - default to full range if no specific selection
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
                const dataPoint = data.find(d => getDate(d) === date);
                return {
                  date,
                  idx,
                  value: dataPoint ? getValue(dataPoint) : 0
                };
              })
            // Otherwise use data directly with indices
            : data.map((d, idx) => ({
                date: getDate(d),
                idx,
                value: getValue(d)
              }));
          
          return (
            <svg width={width} height={height}>
              
              <Group left={margin.left} top={margin.top}>
                {/* Background rectangle to ensure brush is visible when empty */}
                <rect
                  x={0}
                  y={0}
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                />
                
                
                {/* Line representing the data */}

                
                <LinePath 
                  data={lineData}
                  x={(d) => indexScale(d.idx)}
                  y={(d) => valueScale(d.value)}
                  stroke="#53a7fe"
                  //fill="#53a7fe"
                  //fillOpacity={0.2}
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                  
                  curve={curveMonotoneX}
                />
                
                <Brush
                  key={dataKey} // Use dataKey to force remounting
                  xScale={brushDateScale}
                  yScale={valueScale}
                  width={innerWidth}
                  height={innerHeight}
                  handleSize={8}
                  resizeTriggerAreas={['left', 'right']}
                  brushDirection="horizontal"
                  initialBrushPosition={initialBrushPosition}
                  onChange={onBrushChange}
                  onClick={onClearBrush}
                  selectedBoxStyle={{ 
                    fill: 'rgba(96, 165, 250, 0)', // Transparent fill
                    stroke: '#374151', // Border color
                    strokeWidth: 0.5,
                    rx: 4,
                    ry: 4,
                  }}
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