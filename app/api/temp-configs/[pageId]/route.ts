import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params;
    
    // Read the chart config file for the page from the correct directory
    const filePath = path.join(process.cwd(), 'temp', 'chart-configs', `${pageId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Page config not found' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const pageConfig = JSON.parse(fileContent);
    
    return NextResponse.json(pageConfig);
  } catch (error) {
    console.error('Error reading temp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 