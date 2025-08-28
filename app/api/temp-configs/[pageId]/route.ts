import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sanitizeChartConfigs, isAdminRequest } from '@/lib/chart-sanitizer';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params;
    
    // Read the chart config file for the page from the secure directory
    const filePath = path.join(process.cwd(), 'server', 'chart-configs', `${pageId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Page config not found' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const pageConfig = JSON.parse(fileContent);
    
    // Sanitize chart data for public consumption (unless admin request)
    const isAdmin = isAdminRequest(request);
    if (!isAdmin && pageConfig.charts) {
      pageConfig.charts = sanitizeChartConfigs(pageConfig.charts);
      pageConfig.sanitized = true;
    } else if (isAdmin) {
      pageConfig.sanitized = false;
    }
    
    return NextResponse.json(pageConfig);
  } catch (error) {
    console.error('Error reading temp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 