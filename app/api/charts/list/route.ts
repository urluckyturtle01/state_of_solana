import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sanitizeChartConfigs, isAdminRequest } from '@/lib/chart-sanitizer';

export async function GET(request: NextRequest) {
  try {
    const chartsDir = path.join(process.cwd(), 'server', 'chart-configs');
    
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

    // Sanitize chart data for public consumption (unless admin request)
    const isAdmin = isAdminRequest(request);
    const responseCharts = isAdmin ? charts : sanitizeChartConfigs(charts);

    return NextResponse.json({
      charts: responseCharts,
      count: responseCharts.length,
      message: `Found ${responseCharts.length} charts from ${jsonFiles.length} config files`,
      sanitized: !isAdmin // Indicate if data was sanitized
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