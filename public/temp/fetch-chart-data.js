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
async function fetchChartData(chart, filterParams = {}) {
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

    // Build parameters object for POST request based on chart filters
    const parameters = {};
    let hasParameters = false;
    
    const filterConfig = chart.additionalOptions?.filters;
    const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
    
    if (filterConfig) {
      // Add currency parameter if configured
      if (filterConfig.currencyFilter && filterParams.currency) {
        parameters[filterConfig.currencyFilter.paramName] = filterParams.currency;
        hasParameters = true;
        console.log(`  Using currency parameter: ${filterConfig.currencyFilter.paramName}=${filterParams.currency}`);
      } else if (filterConfig.currencyFilter && filterConfig.currencyFilter.options && filterConfig.currencyFilter.options.length > 0) {
        // Use first currency option as default
        parameters[filterConfig.currencyFilter.paramName] = filterConfig.currencyFilter.options[0];
        hasParameters = true;
        console.log(`  Using default currency: ${filterConfig.currencyFilter.paramName}=${filterConfig.currencyFilter.options[0]}`);
      }
      
      // IMPORTANT: Only add time filter parameter if time aggregation is NOT enabled
      // Charts with enableTimeAggregation=true should get full raw data for client-side aggregation
      if (filterConfig.timeFilter && !isTimeAggregationEnabled) {
        if (filterParams.timeFilter) {
          parameters[filterConfig.timeFilter.paramName] = filterParams.timeFilter;
          hasParameters = true;
          console.log(`  Using time parameter: ${filterConfig.timeFilter.paramName}=${filterParams.timeFilter}`);
        } else if (filterConfig.timeFilter.options && filterConfig.timeFilter.options.length > 0) {
          // Use first time option as default
          parameters[filterConfig.timeFilter.paramName] = filterConfig.timeFilter.options[0];
          hasParameters = true;
          console.log(`  Using default time filter: ${filterConfig.timeFilter.paramName}=${filterConfig.timeFilter.options[0]}`);
        }
      } else if (filterConfig.timeFilter && isTimeAggregationEnabled) {
        console.log(`  Skipping time filter parameter for time aggregation enabled chart: ${chart.title}`);
      }
      
      // Add display mode filter parameter if configured
      if (filterConfig.displayModeFilter && filterParams.displayMode) {
        parameters[filterConfig.displayModeFilter.paramName] = filterParams.displayMode;
        hasParameters = true;
        console.log(`  Using display mode parameter: ${filterConfig.displayModeFilter.paramName}=${filterParams.displayMode}`);
      } else if (filterConfig.displayModeFilter && filterConfig.displayModeFilter.options && filterConfig.displayModeFilter.options.length > 0) {
        // Use first display mode option as default
        parameters[filterConfig.displayModeFilter.paramName] = filterConfig.displayModeFilter.options[0];
        hasParameters = true;
        console.log(`  Using default display mode: ${filterConfig.displayModeFilter.paramName}=${filterConfig.displayModeFilter.options[0]}`);
      }
    }

    console.log(`Fetching data for ${chart.title} (${chart.id})...`);
    if (hasParameters) {
      console.log(`  Parameters:`, JSON.stringify(parameters));
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for POST requests

    // Configure request options
    const requestOptions = {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // Use POST with parameters if needed, otherwise GET
    if (hasParameters) {
      requestOptions.method = 'POST';
      requestOptions.body = JSON.stringify({ parameters });
    } else {
      requestOptions.method = 'GET';
    }

    const response = await fetch(url.toString(), requestOptions);

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Handle different API response formats
    let parsedData = [];
    
    // Check if this is a job response (for parameterized queries)
    if (result?.job) {
      if (result.job.status === 4 && result.job.error) {
        throw new Error(`Query error: ${result.job.error}`);
      } else if (result.job.status === 3) {
        // Job completed successfully, get the result
        if (result.job.query_result?.data?.rows) {
          parsedData = result.job.query_result.data.rows;
        } else {
          throw new Error('Query completed but no data found');
        }
      } else {
        throw new Error(`Query is still running (status: ${result.job.status}). Retrying...`);
      }
    }
    // Standard response formats
    else if (result?.query_result?.data?.rows) {
      parsedData = result.query_result.data.rows;
    } else if (Array.isArray(result)) {
      parsedData = result;
    } else if (result?.data && Array.isArray(result.data)) {
      parsedData = result.data;
    } else if (result?.rows && Array.isArray(result.rows)) {
      parsedData = result.rows;
    } else if (result?.results && Array.isArray(result.results)) {
      parsedData = result.results;
    } else if (result?.error) {
      throw new Error(`API returned an error: ${result.error}`);
    }

    return {
      success: true,
      data: parsedData,
      timestamp: Date.now(),
      chartId: chart.id,
      title: chart.title,
      parameters: hasParameters ? parameters : undefined
    };

  } catch (error) {
    console.error(`Error fetching data for ${chart.title}:`, error.message);
    return {
      success: false,
      error: error.message,
      chartId: chart.id,
      title: chart.title,
      parameters: filterParams
    };
  }
}

// Function to fetch chart data with all parameter combinations
async function fetchChartDataWithAllParameters(chart) {
  const filterConfig = chart.additionalOptions?.filters;
  const isTimeAggregationEnabled = chart.additionalOptions?.enableTimeAggregation;
  
  // If no filters are configured, fetch with default parameters
  if (!filterConfig) {
    return await fetchChartData(chart);
  }
  
  // Build all parameter combinations
  const parameterCombinations = [{}]; // Start with empty params
  
  // Add currency parameter combinations
  if (filterConfig.currencyFilter && filterConfig.currencyFilter.options) {
    const currencyOptions = filterConfig.currencyFilter.options;
    const newCombinations = [];
    
    for (const combination of parameterCombinations) {
      for (const currency of currencyOptions) {
        newCombinations.push({
          ...combination,
          currency
        });
      }
    }
    
    parameterCombinations.length = 0;
    parameterCombinations.push(...newCombinations);
  }
  
  // IMPORTANT: Only add time filter combinations for charts WITHOUT enableTimeAggregation
  // Charts with enableTimeAggregation=true need full raw data for client-side processing
  if (filterConfig.timeFilter && filterConfig.timeFilter.options && !filterConfig.currencyFilter && !isTimeAggregationEnabled) {
    const timeOptions = filterConfig.timeFilter.options;
    const newCombinations = [];
    
    for (const combination of parameterCombinations) {
      for (const timeFilter of timeOptions) {
        newCombinations.push({
          ...combination,
          timeFilter
        });
      }
    }
    
    parameterCombinations.length = 0;
    parameterCombinations.push(...newCombinations);
  } else if (filterConfig.timeFilter && isTimeAggregationEnabled) {
    console.log(`  Skipping time filter combinations for time aggregation enabled chart: ${chart.title}`);
  }
  
  console.log(`  Will fetch ${parameterCombinations.length} parameter combinations for ${chart.title}`);
  
  // Fetch data for each parameter combination
  const results = [];
  const datasets = [];
  let firstSuccessfulData = null;
  let successfulCombinations = 0;
  let failedCombinations = 0;
  
  for (const params of parameterCombinations) {
    const result = await fetchChartData(chart, params);
    results.push(result);
    
    if (result.success && result.data && result.data.length > 0) {
      successfulCombinations++;
      
      // Store the first successful result as the main data
      if (!firstSuccessfulData) {
        firstSuccessfulData = result;
      }
      
      // Add this dataset to the datasets array
      datasets.push({
        data: result.data,
        parameters: result.parameters,
        timestamp: result.timestamp
      });
      
      console.log(`    ✅ Successfully fetched data for parameters: ${JSON.stringify(params)}`);
    } else {
      failedCombinations++;
      console.log(`    ❌ Failed to fetch data for parameters: ${JSON.stringify(params)} - ${result.error}`);
    }
    
    // Small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // If we have any successful data, combine it all
  if (firstSuccessfulData && datasets.length > 0) {
    return {
      success: true,
      datasets: datasets, // All parameter combinations
      data: firstSuccessfulData.data, // Primary data (first successful combination)
      timestamp: Date.now(),
      chartId: chart.id,
      title: chart.title,
      parameters: firstSuccessfulData.parameters,
      totalCombinations: parameterCombinations.length,
      successfulCombinations: successfulCombinations,
      failedCombinations: failedCombinations,
      availableParameters: datasets.map(d => d.parameters)
    };
  }
  
  // If all failed, return the last result
  return results[results.length - 1] || {
    success: false,
    error: 'All parameter combinations failed',
    chartId: chart.id,
    title: chart.title,
    totalCombinations: parameterCombinations.length,
    successfulCombinations: 0,
    failedCombinations: parameterCombinations.length
  };
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
        
        // Check which charts need parameter handling
        const batchPromises = batch.map(chart => {
          const hasFilters = chart.additionalOptions?.filters;
          if (hasFilters) {
            console.log(`    📊 Chart "${chart.title}" has filters, using parameter-aware fetching`);
            return fetchChartDataWithAllParameters(chart);
          } else {
            return fetchChartData(chart);
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            const chartResult = result.value;
            if (chartResult.success) {
              successCount++;
              console.log(`    ✅ ${chartResult.title}`);
              if (chartResult.parameters) {
                console.log(`      🔧 Used parameters: ${JSON.stringify(chartResult.parameters)}`);
              }
            } else {
              errorCount++;
              console.log(`    ❌ ${chartResult.title}: ${chartResult.error}`);
            }
            pageResults.push(chartResult);
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
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay for POST requests
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