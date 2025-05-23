import { NextRequest, NextResponse } from 'next/server';
import { listFromS3, deleteFromS3 } from '@/lib/s3';

// Enable server-side rendering for the API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/delete-batches - Delete all batch files from S3
export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting batch files cleanup...');
    
    // Get all batch files for tables, charts, and counters
    const tablesBatchesPrefix = 'tables/batches/';
    const chartsBatchesPrefix = 'charts/batches/';
    const countersBatchesPrefix = 'counters/batches/';
    
    // List all batch files
    console.log('API: Listing batch files...');
    const tablesBatches = await listFromS3(tablesBatchesPrefix);
    const chartsBatches = await listFromS3(chartsBatchesPrefix);
    const countersBatches = await listFromS3(countersBatchesPrefix);
    
    console.log(`API: Found ${tablesBatches.length} table batch files`);
    console.log(`API: Found ${chartsBatches.length} chart batch files`);
    console.log(`API: Found ${countersBatches.length} counter batch files`);
    
    // Delete all batch files
    const deletionResults = {
      tables: { success: 0, failed: 0 },
      charts: { success: 0, failed: 0 },
      counters: { success: 0, failed: 0 }
    };
    
    // Delete table batches
    for (const key of tablesBatches) {
      const success = await deleteFromS3(key);
      if (success) {
        deletionResults.tables.success++;
        console.log(`API: Successfully deleted ${key}`);
      } else {
        deletionResults.tables.failed++;
        console.error(`API: Failed to delete ${key}`);
      }
    }
    
    // Delete chart batches
    for (const key of chartsBatches) {
      const success = await deleteFromS3(key);
      if (success) {
        deletionResults.charts.success++;
        console.log(`API: Successfully deleted ${key}`);
      } else {
        deletionResults.charts.failed++;
        console.error(`API: Failed to delete ${key}`);
      }
    }
    
    // Delete counter batches
    for (const key of countersBatches) {
      const success = await deleteFromS3(key);
      if (success) {
        deletionResults.counters.success++;
        console.log(`API: Successfully deleted ${key}`);
      } else {
        deletionResults.counters.failed++;
        console.error(`API: Failed to delete ${key}`);
      }
    }
    
    // Calculate totals
    const totalFound = tablesBatches.length + chartsBatches.length + countersBatches.length;
    const totalDeleted = 
      deletionResults.tables.success + 
      deletionResults.charts.success + 
      deletionResults.counters.success;
    const totalFailed = 
      deletionResults.tables.failed + 
      deletionResults.charts.failed + 
      deletionResults.counters.failed;
    
    console.log(`API: Batch cleanup completed. Deleted ${totalDeleted}/${totalFound} batch files`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} batch files`,
      details: {
        found: totalFound,
        deleted: totalDeleted,
        failed: totalFailed,
        results: deletionResults
      }
    });
  } catch (error) {
    console.error('API: Error deleting batch files:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete batch files', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 