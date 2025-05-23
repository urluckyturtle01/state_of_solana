import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log("Received file save request");
    const data = await request.json();
    
    if (!data.path || !data.content) {
      console.error("Missing required fields", { path: !!data.path, content: !!data.content });
      return NextResponse.json(
        { error: 'Path and content are required' },
        { status: 400 }
      );
    }
    
    // Normalize the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(data.path);
    console.log(`Normalized path: ${normalizedPath}`);
    
    // Ensure the path starts with 'app/' to prevent writing to unauthorized locations
    if (!normalizedPath.startsWith('app/')) {
      console.error(`Invalid path: ${normalizedPath} - Must start with 'app/'`);
      return NextResponse.json(
        { error: 'Path must be within the app directory' },
        { status: 403 }
      );
    }
    
    // Get the absolute path
    const rootDir = process.cwd();
    const filePath = path.join(rootDir, normalizedPath);
    console.log(`Full file path: ${filePath}`);
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    console.log(`Creating directory if needed: ${dirPath}`);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Directory created/verified: ${dirPath}`);
    } catch (dirError) {
      console.error(`Error creating directory ${dirPath}:`, dirError);
      return NextResponse.json(
        { error: `Failed to create directory: ${dirError instanceof Error ? dirError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // Write file
    try {
      console.log(`Writing file: ${filePath} (${data.content.length} characters)`);
      await fs.writeFile(filePath, data.content);
      console.log(`File written successfully: ${filePath}`);
    } catch (writeError) {
      console.error(`Error writing file ${filePath}:`, writeError);
      return NextResponse.json(
        { error: `Failed to write file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      path: normalizedPath,
      message: `File saved successfully at ${normalizedPath}`
    });
  } catch (error) {
    console.error('Error in save-file API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 