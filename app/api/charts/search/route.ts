import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface ChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  chartType: string;
  apiEndpoint: string;
  dataMapping: any;
  additionalOptions?: any;
  updatedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { chartId } = await request.json();
    
    if (!chartId) {
      return NextResponse.json({ error: 'Chart ID is required' }, { status: 400 });
    }

    // Search through all chart config files
    const tempConfigsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
    
    try {
      const files = await fs.readdir(tempConfigsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(tempConfigsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const pageConfig = JSON.parse(fileContent);
          
          if (pageConfig.charts && Array.isArray(pageConfig.charts)) {
            const chart = pageConfig.charts.find((c: ChartConfig) => c.id === chartId);
            if (chart) {
              return NextResponse.json({
                ...chart,
                foundIn: file // Include which file it was found in for debugging
              });
            }
          }
        } catch (fileError) {
          console.warn(`Error reading file ${file}:`, fileError);
          // Continue searching other files
        }
      }
      
      // Chart not found in any file
      return NextResponse.json(
        { error: `Chart with ID "${chartId}" not found in any configuration` }, 
        { status: 404 }
      );
      
    } catch (dirError) {
      console.error('Error reading temp configs directory:', dirError);
      return NextResponse.json(
        { error: 'Failed to access chart configurations directory' }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error searching for chart:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 