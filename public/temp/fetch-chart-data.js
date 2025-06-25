const fs = require('fs');
const path = require('path');

// Extract all page IDs from temp configs
const tempDir = path.join(__dirname, 'chart-configs');
const dataDir = path.join(__dirname, 'chart-data');

// Create data directory
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to fetch chart data with timeout
async function fetchChartData(chart) {
  try {
    const url = new URL(chart.apiEndpoint);
    if (chart.apiKey) {
      const apiKeyValue = chart.apiKey.trim();
      if (apiKeyValue.includes('&max_age=')) {
        const [baseApiKey, maxAgePart] = apiKeyValue.split('&max_age=');
        if (baseApiKey) {
          url.searchParams.append('api_key', baseApiKey.trim());
        }
        if (maxAgePart) {
          url.searchParams.append('max_age', maxAgePart.trim());
        }
      } else {
        url.searchParams.append('api_key', apiKeyValue);
      }
    }

    console.log(`Fetching data for ${chart.title} (${chart.id})...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract data based on API response format
    let parsedData = [];
    if (result?.query_result?.data?.rows) {
      parsedData = result.query_result.data.rows;
    } else if (Array.isArray(result)) {
      parsedData = result;
    } else if (result?.data && Array.isArray(result.data)) {
      parsedData = result.data;
    } else if (result?.rows && Array.isArray(result.rows)) {
      parsedData = result.rows;
    } else if (result?.results && Array.isArray(result.results)) {
      parsedData = result.results;
    }

    return {
      success: true,
      data: parsedData,
      timestamp: Date.now(),
      chartId: chart.id,
      title: chart.title
    };

  } catch (error) {
    console.error(`Error fetching data for ${chart.title}:`, error.message);
    return {
      success: false,
      error: error.message,
      chartId: chart.id,
      title: chart.title
    };
  }
}

// Main function to fetch all chart data
async function fetchAllChartData() {
  console.log('🚀 Starting to fetch chart data for all pages...');
  
  const configFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  
  let totalCharts = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const configFile of configFiles) {
    const pageId = path.basename(configFile, '.json');
    console.log(`\n📄 Processing page: ${pageId}`);
    
    try {
      const configPath = path.join(tempDir, configFile);
      const pageConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      if (!pageConfig.charts || pageConfig.charts.length === 0) {
        console.log(`  ⏭️  No charts found for ${pageId}`);
        continue;
      }

      const charts = pageConfig.charts;
      totalCharts += charts.length;
      
      console.log(`  📊 Fetching data for ${charts.length} charts...`);
      
      // Process charts in smaller batches to avoid overwhelming the API
      const batchSize = 3;
      const pageResults = [];
      
      for (let i = 0; i < charts.length; i += batchSize) {
        const batch = charts.slice(i, i + batchSize);
        console.log(`    🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(charts.length / batchSize)}`);
        
        const batchPromises = batch.map(chart => fetchChartData(chart));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++;
              console.log(`    ✅ ${result.value.title}`);
            } else {
              errorCount++;
              console.log(`    ❌ ${result.value.title}: ${result.value.error}`);
            }
            pageResults.push(result.value);
          } else {
            errorCount++;
            console.log(`    ❌ ${batch[idx].title}: ${result.reason}`);
            pageResults.push({
              success: false,
              error: result.reason,
              chartId: batch[idx].id,
              title: batch[idx].title
            });
          }
        });
        
        // Small delay between batches
        if (i + batchSize < charts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Save page data
      const pageDataFile = path.join(dataDir, `${pageId}.json`);
      const pageDataContent = {
        pageId,
        pageName: pageConfig.pageName,
        fetchedAt: new Date().toISOString(),
        charts: pageResults,
        summary: {
          totalCharts: charts.length,
          successfulFetches: pageResults.filter(r => r.success).length,
          failedFetches: pageResults.filter(r => !r.success).length
        }
      };
      
      fs.writeFileSync(pageDataFile, JSON.stringify(pageDataContent, null, 2));
      console.log(`  💾 Saved data for ${pageId}`);
      
    } catch (error) {
      console.error(`❌ Error processing page ${pageId}:`, error);
    }
  }
  
  // Create summary
  const summary = {
    fetchedAt: new Date().toISOString(),
    totalPages: configFiles.length,
    totalCharts,
    successfulFetches: successCount,
    failedFetches: errorCount,
    successRate: totalCharts > 0 ? ((successCount / totalCharts) * 100).toFixed(2) + '%' : '0%'
  };
  
  fs.writeFileSync(path.join(dataDir, '_summary.json'), JSON.stringify(summary, null, 2));
  
  console.log('\n🎉 Chart data fetching complete!');
  console.log(`📊 Total charts: ${totalCharts}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📈 Success rate: ${summary.successRate}`);
}

// Run the script
fetchAllChartData().catch(console.error); 