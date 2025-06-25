import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params;
    
    // Read the chart data file for the page from the correct directory
    const filePath = path.join(process.cwd(), 'temp', 'chart-data', `${pageId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Page data not found' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const pageData = JSON.parse(fileContent);
    
    return NextResponse.json(pageData);
  } catch (error) {
    console.error('Error reading temp data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 