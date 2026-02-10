import React from 'react';

interface ChartProps {
  title: string;
  data: Array<{
    name: string;
    value1: number;
    value2: number;
    value3: number;
  }>;
}

export const LandingPageChart: React.FC<ChartProps> = ({ title, data }) => {
  const maxValue = Math.max(...data.flatMap(d => [d.value1, d.value2, d.value3]));

  return (
    <div className="w-full h-80 p-4">
      <h3 className="text-white text-lg font-medium mb-4 text-center">{title}</h3>
      <div className="h-64 flex items-end justify-center space-x-4">
        {data.map((item, index) => {
          const totalHeight = 200;
          const height1 = (item.value1 / maxValue) * totalHeight;
          const height2 = (item.value2 / maxValue) * totalHeight;
          const height3 = (item.value3 / maxValue) * totalHeight;

          return (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="flex flex-col justify-end h-52 space-y-1">
                {/* Stack 3 */}
                <div 
                  className="w-8 bg-purple-500 rounded-t transition-all duration-1000 ease-out"
                  style={{ height: `${height3}px` }}
                ></div>
                {/* Stack 2 */}
                <div 
                  className="w-8 bg-blue-500 transition-all duration-1000 ease-out delay-200"
                  style={{ height: `${height2}px` }}
                ></div>
                {/* Stack 1 */}
                <div 
                  className="w-8 bg-cyan-500 rounded-b transition-all duration-1000 ease-out delay-400"
                  style={{ height: `${height1}px` }}
                ></div>
              </div>
              <span className="text-gray-400 text-xs">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sample data for different chart types
export const sampleChartData = {
  fees: [
    { name: 'Raydium', value1: 120, value2: 80, value3: 45 },
    { name: 'Orca', value1: 95, value2: 110, value3: 60 },
    { name: 'Jupiter', value1: 140, value2: 75, value3: 85 },
    { name: 'Drift', value1: 85, value2: 95, value3: 70 },
    { name: 'Marinade', value1: 70, value2: 60, value3: 40 },
  ],
  users: [
    { name: 'Week 1', value1: 2500, value2: 1800, value3: 1200 },
    { name: 'Week 2', value1: 2800, value2: 2100, value3: 1400 },
    { name: 'Week 3', value1: 3200, value2: 2400, value3: 1600 },
    { name: 'Week 4', value1: 2900, value2: 2200, value3: 1300 },
    { name: 'Week 5', value1: 3500, value2: 2600, value3: 1800 },
  ],
  volume: [
    { name: 'Jan', value1: 180, value2: 120, value3: 90 },
    { name: 'Feb', value1: 220, value2: 150, value3: 110 },
    { name: 'Mar', value1: 280, value2: 180, value3: 140 },
    { name: 'Apr', value1: 350, value2: 220, value3: 160 },
    { name: 'May', value1: 320, value2: 200, value3: 150 },
  ],
  loans: [
    { name: 'Solend', value1: 45, value2: 30, value3: 20 },
    { name: 'Mango', value1: 38, value2: 42, value3: 25 },
    { name: 'Tulip', value1: 32, value2: 28, value3: 18 },
    { name: 'Larix', value1: 25, value2: 20, value3: 15 },
    { name: 'Port', value1: 28, value2: 35, value3: 22 },
  ],
  stablecoins: [
    { name: 'USDC', value1: 850, value2: 600, value3: 400 },
    { name: 'USDT', value1: 720, value2: 520, value3: 350 },
    { name: 'USDH', value1: 180, value2: 140, value3: 90 },
    { name: 'UXD', value1: 120, value2: 80, value3: 60 },
    { name: 'Others', value1: 95, value2: 70, value3: 45 },
  ],
}; 