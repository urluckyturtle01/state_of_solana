const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = '../../.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !line.startsWith('#')) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
  console.log('📋 Loaded environment variables from .env.local');
}

// Configure AWS SDK v3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
  },
});

// Get S3 bucket name from environment variables
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';

console.log(`🔧 Starting update process for S3 bucket: ${BUCKET_NAME}`);
console.log(`🔍 Will replace "solanafm" with "tl-research" in chart API URLs`);

// Get JSON data from S3
async function getFromS3(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const data = await s3Client.send(command);
    if (data.Body) {
      const bodyText = await data.Body.transformToString('utf-8');
      return JSON.parse(bodyText);
    }
    return null;
  } catch (error) {
    if (error.name !== 'NoSuchKey') {
      console.error(`Error getting ${key} from S3:`, error.message);
    }
    return null;
  }
}

// Save JSON data to S3
async function saveToS3(key, data) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to S3:`, error.message);
    return false;
  }
}

// List all objects with a specific prefix from S3
async function listFromS3(prefix) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const data = await s3Client.send(command);
    return (data.Contents || []).map(item => item.Key || '').filter(key => key !== '');
  } catch (error) {
    console.error(`Error listing objects from S3:`, error.message);
    return [];
  }
}

// Check if an object (chart config) contains solanafm URLs
function containsSolanaFM(obj) {
  const jsonStr = JSON.stringify(obj);
  return jsonStr.includes('solanafm');
}

// Update solanafm to tl-research in an object
function updateSolanaFMtoTLResearch(obj) {
  const jsonStr = JSON.stringify(obj);
  const updatedStr = jsonStr.replace(/solanafm/g, 'tl-research');
  return JSON.parse(updatedStr);
}

// Get all chart config keys from S3
async function getAllChartKeys() {
  console.log('📋 Fetching all chart configuration keys from S3...');
  const keys = await listFromS3('charts/');
  
  // Filter to only actual chart config files (not batches or indexes)
  const chartKeys = keys.filter(key => 
    key.endsWith('.json') && 
    !key.includes('/batches/') && 
    !key.includes('/indexes/')
  );
  
  console.log(`📊 Found ${chartKeys.length} chart configuration files`);
  return chartKeys;
}

// Main function to update all charts
async function updateAllCharts() {
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalWithSolanaFM = 0;
  let errors = 0;

  try {
    const chartKeys = await getAllChartKeys();

    console.log('🔍 Scanning charts for solanafm URLs...\n');

    for (const key of chartKeys) {
      totalProcessed++;
      
      try {
        // Get the chart config
        const chartConfig = await getFromS3(key);
        
        if (!chartConfig) {
          console.log(`⚠️  Skipping ${key} - could not retrieve`);
          continue;
        }

        // Check if it contains solanafm
        if (containsSolanaFM(chartConfig)) {
          totalWithSolanaFM++;
          console.log(`🔍 Found solanafm in: ${key}`);
          
          // Show the original API URL if available
          if (chartConfig.apiEndpoint) {
            console.log(`   Original: ${chartConfig.apiEndpoint}`);
          }
          
          // Update the config
          const updatedConfig = updateSolanaFMtoTLResearch(chartConfig);
          
          // Show the updated API URL
          if (updatedConfig.apiEndpoint) {
            console.log(`   Updated:  ${updatedConfig.apiEndpoint}`);
          }
          
          // Save back to S3
          const saveSuccess = await saveToS3(key, updatedConfig);
          
          if (saveSuccess) {
            totalUpdated++;
            console.log(`✅ Updated: ${key}\n`);
          } else {
            errors++;
            console.log(`❌ Failed to update: ${key}\n`);
          }
        } else {
          // Log every 10th chart to show progress
          if (totalProcessed % 10 === 0) {
            console.log(`⏭️  Processed ${totalProcessed} charts (no solanafm found in last 10)`);
          }
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${key}:`, error.message);
      }
    }

    // Summary
    console.log('\n📊 UPDATE SUMMARY:');
    console.log(`   Total charts processed: ${totalProcessed}`);
    console.log(`   Charts with solanafm URLs: ${totalWithSolanaFM}`);
    console.log(`   Charts successfully updated: ${totalUpdated}`);
    console.log(`   Errors encountered: ${errors}`);
    
    if (totalUpdated > 0) {
      console.log('\n✅ Update process completed successfully!');
      console.log('🚀 The charts should now use the tl-research endpoints.');
    } else if (totalWithSolanaFM === 0) {
      console.log('\n✅ No charts found with solanafm URLs. All good!');
    } else {
      console.log('\n⚠️  Some charts could not be updated. Check the errors above.');
    }

  } catch (error) {
    console.error('💥 Fatal error during update process:', error);
  }
}

// Run the update
updateAllCharts().catch(console.error);
