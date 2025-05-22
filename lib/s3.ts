import AWS from 'aws-sdk';

// Configure AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
  },
});

// Get S3 bucket name from environment variables
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';

// Performance metrics tracking
const startTimer = () => {
  return process.hrtime();
};

const endTimer = (start: [number, number], label: string) => {
  const diff = process.hrtime(start);
  const time = (diff[0] * 1e9 + diff[1]) / 1e6; // convert to milliseconds
  console.log(`⏱️ S3: ${label}: ${time.toFixed(2)}ms`);
  return time;
};

// Save JSON data to S3
export async function saveToS3(key: string, data: any): Promise<boolean> {
  const timer = startTimer();
  try {
    // Validate that we have credentials before attempting to save
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.S3_ACCESS_KEY) {
      console.error('S3 access key is not configured');
      return false;
    }
    
    // Debug log - remove or comment out in production
    console.log(`Saving to S3: bucket=${BUCKET_NAME}, key=${key}, credentials available: ${!!process.env.AWS_ACCESS_KEY_ID || !!process.env.S3_ACCESS_KEY}`);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    };

    const result = await s3.upload(params).promise();
    console.log(`Successfully uploaded data to ${result.Location}`);
    endTimer(timer, `Saved data to ${key}`);
    return true;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    endTimer(timer, `Error saving to ${key}`);
    return false;
  }
}

// Get JSON data from S3
export async function getFromS3<T>(key: string): Promise<T | null> {
  const timer = startTimer();
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const data = await s3.getObject(params).promise();
    if (data.Body) {
      const result = JSON.parse(data.Body.toString('utf-8')) as T;
      endTimer(timer, `Retrieved data from ${key}`);
      return result;
    }
    endTimer(timer, `No data found at ${key}`);
    return null;
  } catch (error) {
    // Only log a warning for NoSuchKey errors, as they're common and expected
    if ((error as AWS.AWSError).code === 'NoSuchKey') {
      console.warn(`Object not found at ${key}`);
    } else {
      console.error('Error getting data from S3:', error);
    }
    endTimer(timer, `Error retrieving from ${key}`);
    return null;
  }
}

// Delete an object from S3
export async function deleteFromS3(key: string): Promise<boolean> {
  const timer = startTimer();
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted ${key} from S3`);
    endTimer(timer, `Deleted ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    endTimer(timer, `Error deleting ${key}`);
    return false;
  }
}

// List all objects with a specific prefix from S3
export async function listFromS3(prefix: string): Promise<string[]> {
  const timer = startTimer();
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const data = await s3.listObjectsV2(params).promise();
    const keys = (data.Contents || []).map(item => item.Key || '').filter(key => key !== '');
    endTimer(timer, `Listed ${keys.length} objects with prefix ${prefix}`);
    return keys;
  } catch (error) {
    console.error('Error listing objects from S3:', error);
    endTimer(timer, `Error listing objects with prefix ${prefix}`);
    return [];
  }
}

// Save a page index file containing counter IDs for a specific page
export async function savePageIndex(pageId: string, counterIds: string[]): Promise<boolean> {
  try {
    const key = `counters/indexes/page_${pageId}.json`;
    const data = {
      pageId,
      counterIds,
      updatedAt: new Date().toISOString()
    };
    
    return await saveToS3(key, data);
  } catch (error) {
    console.error(`Error saving page index for page ${pageId}:`, error);
    return false;
  }
}

// Get the counter IDs for a specific page from the index file
export async function getPageIndex(pageId: string): Promise<string[] | null> {
  try {
    const key = `counters/indexes/page_${pageId}.json`;
    const data = await getFromS3<{ counterIds: string[], updatedAt: string }>(key);
    
    if (data && Array.isArray(data.counterIds)) {
      return data.counterIds;
    }
    return null;
  } catch (error) {
    console.error(`Error getting page index for page ${pageId}:`, error);
    return null;
  }
}

// Create a cached version of multiple counters in a single file
export async function saveCountersBatch(pageId: string, counters: any[]): Promise<boolean> {
  try {
    const key = `counters/batches/page_${pageId}.json`;
    const data = {
      pageId,
      counters,
      updatedAt: new Date().toISOString()
    };
    
    return await saveToS3(key, data);
  } catch (error) {
    console.error(`Error saving counters batch for page ${pageId}:`, error);
    return false;
  }
}

// Get all counters for a page from the batch file
export async function getCountersBatch(pageId: string): Promise<any[] | null> {
  try {
    const key = `counters/batches/page_${pageId}.json`;
    const data = await getFromS3<{ counters: any[], updatedAt: string }>(key);
    
    if (data && Array.isArray(data.counters)) {
      return data.counters;
    }
    return null;
  } catch (error) {
    console.error(`Error getting counters batch for page ${pageId}:`, error);
    return null;
  }
}

// Save a page index file containing chart IDs for a specific page
export async function saveChartPageIndex(pageId: string, chartIds: string[]): Promise<boolean> {
  try {
    const key = `charts/indexes/page_${pageId}.json`;
    const data = {
      pageId,
      chartIds,
      updatedAt: new Date().toISOString()
    };
    
    return await saveToS3(key, data);
  } catch (error) {
    console.error(`Error saving chart page index for page ${pageId}:`, error);
    return false;
  }
}

// Get the chart IDs for a specific page from the index file
export async function getChartPageIndex(pageId: string): Promise<string[] | null> {
  try {
    const key = `charts/indexes/page_${pageId}.json`;
    const data = await getFromS3<{ chartIds: string[], updatedAt: string }>(key);
    
    if (data && Array.isArray(data.chartIds)) {
      return data.chartIds;
    }
    return null;
  } catch (error) {
    console.error(`Error getting chart page index for page ${pageId}:`, error);
    return null;
  }
}

// Create a cached version of multiple charts in a single file
export async function saveChartsBatch(pageId: string, charts: any[]): Promise<boolean> {
  try {
    const key = `charts/batches/page_${pageId}.json`;
    const data = {
      pageId,
      charts,
      updatedAt: new Date().toISOString()
    };
    
    return await saveToS3(key, data);
  } catch (error) {
    console.error(`Error saving charts batch for page ${pageId}:`, error);
    return false;
  }
}

// Get all charts for a page from the batch file
export async function getChartsBatch(pageId: string): Promise<any[] | null> {
  try {
    const key = `charts/batches/page_${pageId}.json`;
    const data = await getFromS3<{ charts: any[], updatedAt: string }>(key);
    
    if (data && Array.isArray(data.charts)) {
      return data.charts;
    }
    return null;
  } catch (error) {
    console.error(`Error getting charts batch for page ${pageId}:`, error);
    return null;
  }
}

// Create a cached version of multiple tables in a single file
export async function saveTablesBatch(pageId: string, tables: any[]): Promise<boolean> {
  try {
    const key = `tables/batches/page_${pageId}.json`;
    const data = {
      pageId,
      tables,
      updatedAt: new Date().toISOString()
    };
    
    return await saveToS3(key, data);
  } catch (error) {
    console.error(`Error saving tables batch for page ${pageId}:`, error);
    return false;
  }
}

// Get all tables for a page from the batch file
export async function getTablesBatch(pageId: string): Promise<any[] | null> {
  try {
    const key = `tables/batches/page_${pageId}.json`;
    const data = await getFromS3<{ tables: any[], updatedAt: string }>(key);
    
    if (data && Array.isArray(data.tables)) {
      return data.tables;
    }
    return null;
  } catch (error) {
    console.error(`Error getting tables batch for page ${pageId}:`, error);
    return null;
  }
}

// Get all objects as batched results
export async function getBatchedObjectsFromS3<T>(prefix: string, batchSize: number = 50): Promise<T[]> {
  const timer = startTimer();
  try {
    const results: T[] = [];
    const keys = await listFromS3(prefix);
    
    // Process in batches to avoid overwhelming S3
    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(keys.length / batchSize)}, size: ${batchKeys.length}`);
      
      // Get objects in parallel within the batch
      const batchPromises = batchKeys.map(key => getFromS3<T>(key));
      const batchResults = await Promise.all(batchPromises);
      
      // Add valid results
      for (const result of batchResults) {
        if (result !== null) {
          results.push(result);
        }
      }
    }
    
    endTimer(timer, `Retrieved ${results.length} objects from ${prefix} in batches`);
    return results;
  } catch (error) {
    console.error(`Error getting batched objects from S3 with prefix ${prefix}:`, error);
    endTimer(timer, `Error retrieving batched objects from ${prefix}`);
    return [];
  }
} 