import { NextRequest, NextResponse } from 'next/server';
import { TableConfig } from '@/app/admin/types';
import { 
  saveToS3, 
  getFromS3, 
  listFromS3, 
  deleteFromS3,
  getPageIndex,
  savePageIndex,
  getTablesBatch,
  saveTablesBatch
} from '@/lib/s3';

// Enable server-side rendering for the API route
export const dynamic = 'force-dynamic';
export const revalidate = 30;

// Performance metrics tracking
const startTimer = () => {
  return process.hrtime();
};

const endTimer = (start: [number, number], label: string) => {
  const diff = process.hrtime(start);
  const time = (diff[0] * 1e9 + diff[1]) / 1e6; // convert to milliseconds
  console.log(`⏱️ ${label}: ${time.toFixed(2)}ms`);
  return time;
};

// GET /api/tables - Get all tables or filtered by page
export async function GET(req: NextRequest) {
  const overallStart = startTimer();
  try {
    // Get optional page parameter from URL
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page');
    const useBatch = searchParams.get('batch') !== 'false';
    
    console.log(`API: Fetching tables... ${pageId ? `for page: ${pageId}` : "all tables"}`);
    
    // If pageId is provided, try to use the optimized path
    if (pageId && useBatch) {
      // First try to get from batch file (fastest)
      const batchStart = startTimer();
      const batchTables = await getTablesBatch(pageId);
      
      if (batchTables) {
        endTimer(batchStart, `Retrieved ${batchTables.length} tables from batch file`);
        endTimer(overallStart, "Total GET request time");
        
        console.log(`API: Found ${batchTables.length} tables in batch file for page ${pageId}`);
        return NextResponse.json({ 
          tables: batchTables,
          source: 'batch',
          pageId
        });
      }
      
      // Then try the page index
      const indexStart = startTimer();
      const tableIds = await getPageIndex(`tables_${pageId}`);
      
      if (tableIds && tableIds.length > 0) {
        endTimer(indexStart, `Retrieved ${tableIds.length} table IDs from index`);
        console.log(`API: Found ${tableIds.length} table IDs in index for page ${pageId}`);
        
        // Get each table in parallel
        const fetchStart = startTimer();
        const tablePromises = tableIds.map(id => 
          getFromS3<TableConfig>(`tables/${id}.json`)
        );
        
        const tables = await Promise.all(tablePromises);
        const validTables = tables.filter(table => table !== null) as TableConfig[];
        
        endTimer(fetchStart, `Fetched ${validTables.length} tables using index`);
        
        // Create a batch file for future requests
        if (validTables.length > 0) {
          const batchSaveStart = startTimer();
          await saveTablesBatch(pageId, validTables);
          endTimer(batchSaveStart, `Created batch file for page ${pageId}`);
        }
        
        endTimer(overallStart, "Total GET request time");
        
        console.log(`API: Returning ${validTables.length} tables for page ${pageId} from index`);
        return NextResponse.json({ 
          tables: validTables,
          source: 'index',
          pageId
        });
      } else {
        console.log(`API: No table IDs found in index for page ${pageId}`);
      }
    }
    
    // Fallback to the original implementation (slower)
    console.log("API: Using fallback table fetching method");
    const fallbackStart = startTimer();
    
    // Get all tables from S3
    const tableKeys = await listFromS3('tables/');
    
    // Filter out index and batch files
    const actualTableKeys = tableKeys.filter(key => 
      !key.startsWith('tables/indexes/') && !key.startsWith('tables/batches/')
    );
    
    console.log(`API: Found ${actualTableKeys.length} table keys in S3`);
    
    if (actualTableKeys.length > 0) {
      const tablePromises = actualTableKeys.map(key => getFromS3<TableConfig>(key));
      const tables = await Promise.all(tablePromises);
      let validTables = tables.filter(table => table !== null) as TableConfig[];
      
      console.log(`API: Loaded ${validTables.length} valid tables from S3`);
      
      // Filter by page if specified
      if (pageId) {
        const beforeFilter = validTables.length;
        validTables = validTables.filter(table => table.page === pageId);
        console.log(`API: Filtered ${beforeFilter} tables to ${validTables.length} tables for page ${pageId}`);
        
        // Create index and batch files for this page for future requests
        if (validTables.length > 0) {
          const indexSaveStart = startTimer();
          
          // Save page index
          await savePageIndex(
            `tables_${pageId}`, 
            validTables.map(table => table.id)
          );
          
          // Save batch file
          await saveTablesBatch(pageId, validTables);
          
          endTimer(indexSaveStart, `Created index and batch files for page ${pageId}`);
          console.log(`API: Created index and batch files for ${validTables.length} tables on page ${pageId}`);
        }
      }
      
      endTimer(fallbackStart, `Found ${validTables.length} tables using fallback method`);
      endTimer(overallStart, "Total GET request time");
      
      console.log(`API: Returning ${validTables.length} tables from fallback method`);
      return NextResponse.json({ 
        tables: validTables,
        source: 'fallback',
        pageId
      });
    }
    
    // No tables found
    console.log("API: No tables found");
    endTimer(overallStart, "Total GET request time (empty result)");
    
    return NextResponse.json({ tables: [] });
  } catch (error) {
    console.error('API: Error fetching tables:', error);
    endTimer(overallStart, "Total GET request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to fetch tables', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/tables - Create or update a table
export async function POST(req: NextRequest) {
  const overallStart = startTimer();
  try {
    console.log("API: Creating/updating table...");
    const tableConfig = await req.json() as TableConfig;
    const pageId = tableConfig.page;
    
    // Log the table config we're trying to save
    console.log(`API: Saving table with ID ${tableConfig.id}, title: ${tableConfig.title}`);
    
    // Validate the table config
    if (!tableConfig.title || !tableConfig.page || !tableConfig.apiEndpoint) {
      console.log("API: Invalid table configuration - missing required fields");
      return NextResponse.json(
        { error: 'Invalid table configuration' },
        { status: 400 }
      );
    }
    
    // Update timestamps
    tableConfig.updatedAt = new Date().toISOString();
    if (!tableConfig.createdAt) {
      tableConfig.createdAt = tableConfig.updatedAt;
    }
    
    // Save to S3
    const s3Start = startTimer();
    const s3Result = await saveToS3(`tables/${tableConfig.id}.json`, tableConfig);
    endTimer(s3Start, `Saved table ${tableConfig.id} to S3`);
    
    if (!s3Result) {
      console.log(`API: Failed to save table to S3`);
      return NextResponse.json(
        { error: 'Failed to save table to S3' },
        { status: 500 }
      );
    }
    
    // Update page index if page ID is provided
    if (pageId) {
      const indexStart = startTimer();
      
      // Get existing index
      const existingIds = await getPageIndex(`tables_${pageId}`) || [];
      
      // Add this table if not already in the index
      if (!existingIds.includes(tableConfig.id)) {
        await savePageIndex(`tables_${pageId}`, [...existingIds, tableConfig.id]);
      }
      
      // Update batch file with the latest tables
      // Get all tables for this page
      const pageTables = await getTablesBatch(pageId) || [];
      
      // Find and update the table in the batch, or add it if not present
      const tableIndex = pageTables.findIndex((t: TableConfig) => t.id === tableConfig.id);
      if (tableIndex >= 0) {
        pageTables[tableIndex] = tableConfig;
      } else {
        pageTables.push(tableConfig);
      }
      
      // Save updated batch
      await saveTablesBatch(pageId, pageTables);
      
      endTimer(indexStart, `Updated index and batch for page ${pageId}`);
    }
    
    console.log(`API: Table saved successfully to S3 with ID ${tableConfig.id}`);
    endTimer(overallStart, "Total POST request time");
    
    return NextResponse.json({ 
      message: 'Table saved to S3 successfully',
      tableId: tableConfig.id
    });
  } catch (error) {
    console.error('API: Error creating/updating table:', error);
    endTimer(overallStart, "Total POST request time (error)");
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update table', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// DELETE /api/tables - Delete a table
export async function DELETE(req: NextRequest) {
  const overallStart = startTimer();
  try {
    // Get the table ID from the query parameters
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('id');
    
    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Deleting table with ID ${tableId}`);
    
    // Get the table to determine its page
    const tableConfig = await getFromS3<TableConfig>(`tables/${tableId}.json`);
    
    if (!tableConfig) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }
    
    // Delete the table from S3
    const deleteStart = startTimer();
    const deleteResult = await deleteFromS3(`tables/${tableId}.json`);
    endTimer(deleteStart, `Deleted table ${tableId} from S3`);
    
    if (!deleteResult) {
      return NextResponse.json(
        { error: 'Failed to delete table from S3' },
        { status: 500 }
      );
    }
    
    // Update the page index and batch file
    const pageId = tableConfig.page;
    if (pageId) {
      const indexStart = startTimer();
      
      // Get existing index
      const existingIds = await getPageIndex(`tables_${pageId}`) || [];
      
      // Remove this table from the index
      if (existingIds.includes(tableId)) {
        await savePageIndex(
          `tables_${pageId}`, 
          existingIds.filter(id => id !== tableId)
        );
      }
      
      // Update batch file by removing this table
      const pageTables = await getTablesBatch(pageId) || [];
      
      // Remove the table from the batch
      const updatedTables = pageTables.filter((t: TableConfig) => t.id !== tableId);
      
      // Save updated batch
      if (updatedTables.length > 0) {
        await saveTablesBatch(pageId, updatedTables);
      } else {
        // If no tables left, delete the batch file
        await deleteFromS3(`tables/batches/${pageId}.json`);
      }
      
      endTimer(indexStart, `Updated index and batch for page ${pageId}`);
    }
    
    console.log(`API: Table deleted successfully from S3 with ID ${tableId}`);
    endTimer(overallStart, "Total DELETE request time");
    
    return NextResponse.json({ 
      message: 'Table deleted from S3 successfully',
      tableId
    });
  } catch (error) {
    console.error('API: Error deleting table:', error);
    endTimer(overallStart, "Total DELETE request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to delete table', details: String(error) },
      { status: 500 }
    );
  }
} 