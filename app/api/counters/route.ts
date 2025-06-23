import { NextRequest, NextResponse } from 'next/server';
import { CounterConfig } from '@/app/admin/types';
import { 
  saveToS3, 
  getFromS3, 
  listFromS3, 
  deleteFromS3,
  getPageIndex,
  savePageIndex,
  getCountersBatch,
  saveCountersBatch,
  getBatchedObjectsFromS3
} from '@/lib/s3';

// Enable ISR for this API route with 30-second revalidation
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

// GET /api/counters - Get all counters or filtered by page
export async function GET(req: NextRequest) {
  const overallStart = startTimer();
  try {
    // Get optional page parameter from URL
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get('page');
    const useBatch = searchParams.get('batch') !== 'false';
    
    console.log("API: Fetching counters...", pageId ? `for page: ${pageId}` : "all counters");
    
    // If pageId is provided, try to use the optimized path
    if (pageId && useBatch) {
      // First try to get from batch file (fastest)
      const batchStart = startTimer();
      const batchCounters = await getCountersBatch(pageId);
      
      if (batchCounters) {
        endTimer(batchStart, `Retrieved ${batchCounters.length} counters from batch file`);
        endTimer(overallStart, "Total GET request time");
        
        return NextResponse.json({ 
          counters: batchCounters,
          source: 'batch',
          pageId
        });
      }
      
      // Then try the page index
      const indexStart = startTimer();
      const counterIds = await getPageIndex(pageId);
      
      if (counterIds && counterIds.length > 0) {
        endTimer(indexStart, `Retrieved ${counterIds.length} counter IDs from index`);
        
        // Get each counter in parallel
        const fetchStart = startTimer();
        const counterPromises = counterIds.map(id => 
          getFromS3<CounterConfig>(`counters/${id}.json`)
        );
        
        const counters = await Promise.all(counterPromises);
        const validCounters = counters.filter(counter => counter !== null) as CounterConfig[];
        
        endTimer(fetchStart, `Fetched ${validCounters.length} counters using index`);
        
        // Create a batch file for future requests
        if (validCounters.length > 0) {
          const batchSaveStart = startTimer();
          await saveCountersBatch(pageId, validCounters);
          endTimer(batchSaveStart, `Created batch file for page ${pageId}`);
        }
        
        endTimer(overallStart, "Total GET request time");
        
        return NextResponse.json({ 
          counters: validCounters,
          source: 'index',
          pageId
        });
      }
    }
    
    // Fallback to the original implementation (slower)
    console.log("API: Using fallback counter fetching method");
    const fallbackStart = startTimer();
    
    // Get all counters from S3
    const counterKeys = await listFromS3('counters/');
    
    // Filter out index and batch files
    const actualCounterKeys = counterKeys.filter(key => 
      !key.startsWith('counters/indexes/') && !key.startsWith('counters/batches/')
    );
    
    if (actualCounterKeys.length > 0) {
      const counterPromises = actualCounterKeys.map(key => getFromS3<CounterConfig>(key));
      const counters = await Promise.all(counterPromises);
      let validCounters = counters.filter(counter => counter !== null) as CounterConfig[];
      
      // Filter by page if specified
      if (pageId) {
        validCounters = validCounters.filter(counter => counter.page === pageId);
        
        // Create index and batch files for this page for future requests
        if (validCounters.length > 0) {
          const indexSaveStart = startTimer();
          
          // Save page index
          await savePageIndex(
            pageId, 
            validCounters.map(counter => counter.id)
          );
          
          // Save batch file
          await saveCountersBatch(pageId, validCounters);
          
          endTimer(indexSaveStart, `Created index and batch files for page ${pageId}`);
        }
      }
      
      endTimer(fallbackStart, `Found ${validCounters.length} counters using fallback method`);
      endTimer(overallStart, "Total GET request time");
      
      return NextResponse.json({ 
        counters: validCounters,
        source: 'fallback',
        pageId
      });
    }
    
    // No counters found
    console.log("API: No counters found");
    endTimer(overallStart, "Total GET request time (empty result)");
    
    return NextResponse.json({ counters: [] });
  } catch (error) {
    console.error('API: Error fetching counters:', error);
    endTimer(overallStart, "Total GET request time (error)");
    
    return NextResponse.json(
      { error: 'Failed to fetch counters', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/counters - Create or update a counter
export async function POST(req: NextRequest) {
  const overallStart = startTimer();
  try {
    console.log("API: Creating/updating counter...");
    const counterConfig = await req.json() as CounterConfig;
    const pageId = counterConfig.page;
    
    // Log the counter config we're trying to save
    console.log(`API: Saving counter with ID ${counterConfig.id}, title: ${counterConfig.title}`);
    
    // Validate the counter config
    if (!counterConfig.title || !counterConfig.page || !counterConfig.apiEndpoint) {
      console.log("API: Invalid counter configuration - missing required fields");
      return NextResponse.json(
        { error: 'Invalid counter configuration' },
        { status: 400 }
      );
    }
    
    // Update timestamps
    counterConfig.updatedAt = new Date().toISOString();
    if (!counterConfig.createdAt) {
      counterConfig.createdAt = counterConfig.updatedAt;
    }
    
    // Save to S3
    const s3Start = startTimer();
    const s3Result = await saveToS3(`counters/${counterConfig.id}.json`, counterConfig);
    endTimer(s3Start, `Saved counter ${counterConfig.id} to S3`);
    
    if (!s3Result) {
      console.log(`API: Failed to save counter to S3`);
      return NextResponse.json(
        { error: 'Failed to save counter to S3' },
        { status: 500 }
      );
    }
    
    // Update page index if page ID is provided
    if (pageId) {
      const indexStart = startTimer();
      
      // Get existing index
      const existingIds = await getPageIndex(pageId) || [];
      
      // Add this counter if not already in the index
      if (!existingIds.includes(counterConfig.id)) {
        await savePageIndex(pageId, [...existingIds, counterConfig.id]);
      }
      
      // Update batch file with the latest counters
      // Get all counters for this page
      const pageCounters = await getCountersBatch(pageId) || [];
      
      // Find and update the counter in the batch, or add it if not present
      const counterIndex = pageCounters.findIndex(c => c.id === counterConfig.id);
      if (counterIndex >= 0) {
        pageCounters[counterIndex] = counterConfig;
      } else {
        pageCounters.push(counterConfig);
      }
      
      // Save updated batch
      await saveCountersBatch(pageId, pageCounters);
      
      endTimer(indexStart, `Updated index and batch for page ${pageId}`);
    }
    
    console.log(`API: Counter saved successfully to S3 with ID ${counterConfig.id}`);
    endTimer(overallStart, "Total POST request time");
    
    return NextResponse.json({ 
      message: 'Counter saved to S3 successfully',
      counterId: counterConfig.id
    });
  } catch (error) {
    console.error('API: Error creating/updating counter:', error);
    endTimer(overallStart, "Total POST request time (error)");
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update counter', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// DELETE /api/counters?id=counter_id - Delete a counter
export async function DELETE(req: NextRequest) {
  const overallStart = startTimer();
  try {
    const { searchParams } = new URL(req.url);
    const counterId = searchParams.get('id');
    
    if (!counterId) {
      return NextResponse.json(
        { error: 'Counter ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Deleting counter with ID ${counterId}`);
    
    // First, get the counter to determine its page
    const counterStart = startTimer();
    const counter = await getFromS3<CounterConfig>(`counters/${counterId}.json`);
    endTimer(counterStart, `Retrieved counter ${counterId}`);
    
    // Delete from S3
    const deleteStart = startTimer();
    const s3Result = await deleteFromS3(`counters/${counterId}.json`);
    endTimer(deleteStart, `Deleted counter ${counterId} from S3`);
    
    if (!s3Result) {
      console.log(`API: Failed to delete counter from S3`);
      return NextResponse.json(
        { error: 'Failed to delete counter from S3' },
        { status: 500 }
      );
    }
    
    // If we have page info, update the index and batch
    if (counter && counter.page) {
      const pageId = counter.page;
      const indexStart = startTimer();
      
      // Update page index
      const existingIds = await getPageIndex(pageId) || [];
      const updatedIds = existingIds.filter(id => id !== counterId);
      
      // Save updated index
      await savePageIndex(pageId, updatedIds);
      
      // Update batch file
      const pageCounters = await getCountersBatch(pageId) || [];
      const updatedCounters = pageCounters.filter(c => c.id !== counterId);
      
      // Save updated batch
      await saveCountersBatch(pageId, updatedCounters);
      
      endTimer(indexStart, `Updated index and batch for page ${pageId}`);
    }
    
    console.log(`API: Counter deleted successfully from S3 with ID ${counterId}`);
    endTimer(overallStart, "Total DELETE request time");
    
    return NextResponse.json({ 
      message: 'Counter deleted from S3 successfully',
      counterId
    });
  } catch (error) {
    console.error('API: Error deleting counter:', error);
    endTimer(overallStart, "Total DELETE request time (error)");
    
    return NextResponse.json(
      { 
        error: 'Failed to delete counter', 
        details: String(error)
      },
      { status: 500 }
    );
  }
} 