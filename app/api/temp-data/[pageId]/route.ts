import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params;
    
    // Try multiple paths for chart data files (production vs development)
    const possiblePaths = [
      path.join(process.cwd(), 'temp', 'chart-data', `${pageId}.json`), // Development
      path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json`) // Production
    ];
    
    let filePath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
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