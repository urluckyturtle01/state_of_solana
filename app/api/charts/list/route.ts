import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const chartsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
    
    if (!fs.existsSync(chartsDir)) {
      return NextResponse.json({
        charts: [],
        message: 'Charts directory not found'
      });
    }

    const files = fs.readdirSync(chartsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const charts: any[] = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(chartsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const chartConfig = JSON.parse(fileContent);
        
        // Extract charts from the config file
        if (chartConfig.charts && Array.isArray(chartConfig.charts)) {
          charts.push(...chartConfig.charts.map((chart: any) => ({
            ...chart,
            sourceFile: file
          })));
        }
      } catch (error) {
        console.error(`Error reading chart config file ${file}:`, error);
        // Continue with other files
      }
    }

    // Sort charts by title
    charts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return NextResponse.json({
      charts,
      count: charts.length,
      message: `Found ${charts.length} charts from ${jsonFiles.length} config files`
    });

  } catch (error) {
    console.error('Error listing charts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list charts', 
        details: (error as Error).message,
        charts: []
      },
      { status: 500 }
    );
  }
} 