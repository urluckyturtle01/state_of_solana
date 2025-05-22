import { NextRequest, NextResponse } from 'next/server';
import { getFromS3, deleteFromS3 } from '@/lib/s3';
import { TableConfig } from '@/app/admin/types';

// Enable server-side rendering for the API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/tables/[id] - Get a specific table by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`API: Fetching table with ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }
    
    // Try to get the table from S3
    const table = await getFromS3<TableConfig>(`tables/${id}.json`);
    
    if (!table) {
      console.log(`API: Table with ID ${id} not found`);
      return NextResponse.json(
        { error: `Table with ID ${id} not found` },
        { status: 404 }
      );
    }
    
    console.log(`API: Successfully retrieved table: ${table.title}`);
    return NextResponse.json(table);
  } catch (error) {
    console.error('API: Error fetching table:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/tables/[id] - Delete a table by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`API: Deleting table with ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the table from S3
    const success = await deleteFromS3(`tables/${id}.json`);
    
    if (!success) {
      console.log(`API: Failed to delete table with ID ${id}`);
      return NextResponse.json(
        { error: `Failed to delete table with ID ${id}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully deleted table with ID ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API: Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table', details: String(error) },
      { status: 500 }
    );
  }
} 