import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
): Promise<Response> {
  try {
    const { pageId } = params;
    
    // Path to the compressed file
    const compressedFilePath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json.gz`);
    const originalFilePath = path.join(process.cwd(), 'public', 'temp', 'chart-data', `${pageId}.json`);
    
    // Check if compressed file exists first, then fallback to original
    let fileData: Buffer;
    let isCompressed = false;
    
    if (fs.existsSync(compressedFilePath)) {
      console.log(`📦 Serving compressed data for page: ${pageId}`);
      fileData = fs.readFileSync(compressedFilePath);
      isCompressed = true;
    } else if (fs.existsSync(originalFilePath)) {
      console.log(`📄 Serving original data for page: ${pageId} (no compressed version)`);
      fileData = fs.readFileSync(originalFilePath);
    } else {
      console.log(`❌ No data found for page: ${pageId}`);
      return NextResponse.json({ error: 'Page data not found' }, { status: 404 });
    }
    
    // Decompress if needed
    let jsonData: string;
    if (isCompressed) {
      try {
        const decompressed = zlib.gunzipSync(fileData);
        jsonData = decompressed.toString('utf8');
      } catch (decompressionError) {
        console.error(`❌ Failed to decompress data for page ${pageId}:`, decompressionError);
        return NextResponse.json({ error: 'Failed to decompress data' }, { status: 500 });
      }
    } else {
      jsonData = fileData.toString('utf8');
    }
    
    // Parse and return JSON
    try {
      const pageData = JSON.parse(jsonData);
      
      // Add compression info for debugging
      const compressionInfo = isCompressed ? {
        compressed: true,
        originalSize: `${(fileData.length / 1024).toFixed(1)}KB`,
        decompressedSize: `${(jsonData.length / 1024).toFixed(1)}KB`,
        compressionRatio: `${(((jsonData.length - fileData.length) / jsonData.length) * 100).toFixed(1)}%`
      } : {
        compressed: false,
        size: `${(fileData.length / 1024).toFixed(1)}KB`
      };
      
      console.log(`✅ Successfully served data for page ${pageId}:`, compressionInfo);
      
      return NextResponse.json(pageData, {
        headers: {
          'Cache-Control': 'public, max-age=1800, s-maxage=1800', // Cache for 30 minutes
          'X-Compression-Info': JSON.stringify(compressionInfo),
          'Content-Type': 'application/json',
        },
      });
      
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON for page ${pageId}:`, parseError);
      return NextResponse.json({ error: 'Invalid JSON data' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error in compressed data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 