#!/usr/bin/env tsx

import { searchApiCatalog } from '../lib/api-search';
import { createChartSpecFromSearchResults, validateChartSpec } from '../lib/chart-spec';

async function main() {
  console.log('🧪 Testing Chart Spec Generation...');
  
  try {
    // Test queries for different chart types
    const testQueries = [
      {
        query: 'DEX trading volume over time',
        expectedChartType: 'area'
      },
      {
        query: 'stablecoin supply comparison',
        expectedChartType: 'bar'
      },
      {
        query: 'compute unit price trends',
        expectedChartType: 'line'
      },
      {
        query: 'MEV extraction vs trading volume',
        expectedChartType: 'scatter'
      }
    ];

    for (const test of testQueries) {
      console.log(`\n🔍 Testing Query: "${test.query}"`);
      
      // Search for relevant APIs
      const searchResult = await searchApiCatalog({
        query: test.query,
        top_k: 3
      });

      if (searchResult.apis.length === 0) {
        console.log('  ❌ No APIs found for query');
        continue;
      }

      console.log(`  📊 Found ${searchResult.apis.length} relevant APIs`);
      
      // Generate chart spec
      const chartSpec = createChartSpecFromSearchResults(
        searchResult.apis,
        test.query
      );

      console.log(`  📈 Generated Chart Spec:`);
      console.log(`    Title: ${chartSpec.title}`);
      console.log(`    Chart Type: ${chartSpec.chart_type}`);
      console.log(`    Primary API: ${chartSpec.primary_api}`);
      console.log(`    Secondary API: ${chartSpec.secondary_api || 'None'}`);
      
      if (chartSpec.x_axis) {
        console.log(`    X-Axis: ${chartSpec.x_axis.column} (${chartSpec.x_axis.type})`);
      }
      
      if (chartSpec.y_axis) {
        console.log(`    Y-Axis: ${chartSpec.y_axis.column} (${chartSpec.y_axis.type})`);
      }
      
      if (chartSpec.series && chartSpec.series.length > 0) {
        console.log(`    Series: ${chartSpec.series.map(s => s.column).join(', ')}`);
      }
      
      if (chartSpec.metadata) {
        console.log(`    Domain: ${chartSpec.metadata.domain}`);
        console.log(`    Confidence: ${chartSpec.metadata.confidence_score.toFixed(2)}`);
        console.log(`    Suggested Columns: ${chartSpec.metadata.suggested_columns.join(', ')}`);
      }

      // Validate chart spec
      const validation = validateChartSpec(chartSpec);
      console.log(`    Validation: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (validation.errors.length > 0) {
        console.log(`    Errors: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.log(`    Warnings: ${validation.warnings.join(', ')}`);
      }
    }

    // Test complex chart spec with multiple APIs
    console.log('\n🔄 Testing Complex Chart Spec (Multiple APIs)...');
    const complexQuery = 'compare DEX volume and stablecoin transfers';
    
    const complexSearch = await searchApiCatalog({
      query: complexQuery,
      top_k: 5
    });

    if (complexSearch.apis.length >= 2) {
      const complexSpec = createChartSpecFromSearchResults(
        complexSearch.apis,
        complexQuery,
        'line'
      );

      console.log(`  📈 Complex Chart Spec:`);
      console.log(`    Title: ${complexSpec.title}`);
      console.log(`    Chart Type: ${complexSpec.chart_type}`);
      console.log(`    Primary API: ${complexSpec.primary_api}`);
      console.log(`    Secondary API: ${complexSpec.secondary_api || 'None'}`);
      console.log(`    Transform: ${complexSpec.transform || 'None'}`);
      
      if (complexSpec.metadata) {
        console.log(`    Confidence: ${complexSpec.metadata.confidence_score.toFixed(2)}`);
      }
    }

    // Test validation edge cases
    console.log('\n🔍 Testing Validation Edge Cases...');
    
    // Invalid chart spec
    const invalidSpec = {
      title: '',
      primary_api: '',
      chart_type: 'invalid' as any
    };
    
    const invalidValidation = validateChartSpec(invalidSpec);
    console.log(`  Invalid Spec Validation: ${invalidValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`    Errors: ${invalidValidation.errors.join(', ')}`);

    console.log('\n✅ Chart spec testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 