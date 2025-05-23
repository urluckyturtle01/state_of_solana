import { NextRequest, NextResponse } from 'next/server';
import { TableConfig } from '@/app/admin/types';
import { 
  getFromS3, 
  deleteFromS3,
  getPageIndex, 
  savePageIndex, 
  getTablesBatch, 
  saveTablesBatch 
} from '@/lib/s3';

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

// DELETE /api/tables/[id] - Delete a specific table by ID
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
    
    // First get the table to determine its page
    const table = await getFromS3<TableConfig>(`tables/${id}.json`);
    
    if (!table) {
      console.log(`API: Table with ID ${id} not found`);
      return NextResponse.json(
        { error: `Table with ID ${id} not found` },
        { status: 404 }
      );
    }
    
    const pageId = table.page;
    
    // Delete the table file
    const deleteResult = await deleteFromS3(`tables/${id}.json`);
    
    if (!deleteResult) {
      return NextResponse.json(
        { error: 'Failed to delete table from S3' },
        { status: 500 }
      );
    }
    
    // Update page index if page ID is provided
    if (pageId) {
      // Get existing index
      const existingIds = await getPageIndex(`tables_${pageId}`) || [];
      
      // Remove this table from the index
      if (existingIds.includes(id)) {
        await savePageIndex(
          `tables_${pageId}`, 
          existingIds.filter((tableId: string) => tableId !== id)
        );
      }
      
      // Update batch file by removing this table
      const pageTables = await getTablesBatch(pageId) || [];
      
      // Remove the table from the batch
      const updatedTables = pageTables.filter((t: TableConfig) => t.id !== id);
      
      // Save updated batch
      if (updatedTables.length > 0) {
        await saveTablesBatch(pageId, updatedTables);
      } else {
        // If no tables left, delete the batch file
        await deleteFromS3(`tables/batches/page_${pageId}.json`);
      }
    }
    
    console.log(`API: Table deleted successfully from S3 with ID ${id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Table deleted from S3 successfully',
      tableId: id
    });
  } catch (error) {
    console.error('API: Error deleting table:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete table', details: String(error) },
      { status: 500 }
    );
  }
} 