import { NextRequest, NextResponse } from 'next/server';

interface ColumnDefinition {
  name: string;
  type: string;
  description: string;
  example?: string;
}

// Enhanced AI-powered column description generator
function generateAIColumnDescription(columnName: string, value: any, type: string): string {
  const lowerName = columnName.toLowerCase();
  
  // Advanced pattern matching with AI-generated contextual descriptions
  const enhancedPatterns = [
    // Blockchain & Crypto specific
    { pattern: /^address$/i, description: 'Blockchain address for wallet, contract, or account identification on the network' },
    { pattern: /address$/i, description: 'Address field containing blockchain location identifiers for accounts or contracts' },
    { pattern: /^hash$/i, description: 'Cryptographic hash providing data integrity verification and unique content fingerprinting' },
    { pattern: /hash$/i, description: 'Hash field containing SHA-256 or similar cryptographic digests for verification' },
    { pattern: /^signature$/i, description: 'Digital signature proving transaction authenticity and authorization from private key holder' },
    { pattern: /signature$/i, description: 'Signature field containing cryptographic proofs validating transaction authenticity' },
    { pattern: /^slot$/i, description: 'Solana slot number indicating blockchain timing and consensus-based block positioning' },
    { pattern: /slot$/i, description: 'Slot field representing Solana\'s time-based consensus mechanism and block validation' },
    { pattern: /^epoch$/i, description: 'Blockchain epoch representing larger time periods for validator rotation and network governance' },
    { pattern: /epoch$/i, description: 'Epoch field indicating blockchain time cycles affecting validator sets and staking rewards' },
    { pattern: /^block$/i, description: 'Blockchain block number or reference for transaction ordering and network history' },
    { pattern: /block$/i, description: 'Block field referencing batched transactions in blockchain structure' },
    
    // Financial & Trading
    { pattern: /^price$/i, description: 'Market price value in specified currency for real-time trading and portfolio valuation' },
    { pattern: /price$/i, description: 'Price field containing current or historical market values for financial analysis' },
    { pattern: /^volume$/i, description: 'Trading volume indicating market liquidity, activity levels, and investor interest' },
    { pattern: /volume$/i, description: 'Volume field measuring transaction throughput, capacity, or market activity' },
    { pattern: /^amount$/i, description: 'Monetary or token amount for transactions, balances, and financial calculations' },
    { pattern: /amount$/i, description: 'Amount field storing quantitative values for financial operations and accounting' },
    { pattern: /^balance$/i, description: 'Account balance showing current available funds, tokens, or staked assets' },
    { pattern: /balance$/i, description: 'Balance field indicating current financial position and available resources' },
    { pattern: /^fee$/i, description: 'Network fee or transaction cost for blockchain operations and service usage' },
    { pattern: /fee$/i, description: 'Fee field containing charges for network usage, transactions, or protocol services' },
    { pattern: /^value$/i, description: 'Numeric value representing worth, measurement, or calculated result for analysis' },
    { pattern: /value$/i, description: 'Value field containing quantitative data for metrics, calculations, and reporting' },
    { pattern: /^total$/i, description: 'Aggregated sum of multiple values for comprehensive financial or statistical analysis' },
    { pattern: /total$/i, description: 'Total field containing cumulative amounts, final results, or sum calculations' },
    { pattern: /^revenue$/i, description: 'Protocol revenue from fees, trading, or service monetization for sustainability analysis' },
    { pattern: /revenue$/i, description: 'Revenue field tracking income generation and protocol economic performance' },
    
    // Token & Asset Management  
    { pattern: /^symbol$/i, description: 'Token ticker symbol for market identification, trading pairs, and user recognition' },
    { pattern: /symbol$/i, description: 'Symbol field containing standardized token identifiers for exchange listings' },
    { pattern: /^mint$/i, description: 'Token mint address controlling supply, metadata, and minting authority on Solana' },
    { pattern: /mint$/i, description: 'Mint field referencing SPL token creation authority and supply control mechanisms' },
    { pattern: /^supply$/i, description: 'Token supply metrics including total, circulating, or maximum amounts for tokenomics' },
    { pattern: /supply$/i, description: 'Supply field containing token availability, distribution, and inflation data' },
    { pattern: /^decimals$/i, description: 'Decimal precision defining token divisibility and display formatting for user interfaces' },
    { pattern: /decimals$/i, description: 'Decimals field specifying token subdivision levels and calculation precision' },
    { pattern: /^token$/i, description: 'Token reference, identifier, or metadata for digital asset management and tracking' },
    { pattern: /token$/i, description: 'Token field containing digital asset information, references, or ownership data' },
    
    // Time & Temporal Data
    { pattern: /^timestamp$/i, description: 'Unix timestamp recording exact moment for event sequencing and historical analysis' },
    { pattern: /timestamp$/i, description: 'Timestamp field enabling chronological ordering and time-based data correlation' },
    { pattern: /^date$/i, description: 'Calendar date for temporal organization, reporting periods, and trend analysis' },
    { pattern: /date$/i, description: 'Date field providing temporal context for data aggregation and filtering' },
    { pattern: /^time$/i, description: 'Precise time measurement for scheduling, latency analysis, and performance monitoring' },
    { pattern: /time$/i, description: 'Time field containing temporal data for event coordination and duration calculations' },
    { pattern: /^created$/i, description: 'Creation timestamp establishing entity genesis for lifecycle tracking and analysis' },
    { pattern: /created$/i, description: 'Creation time field enabling age calculations and historical trend analysis' },
    { pattern: /^updated$/i, description: 'Last modification timestamp for data freshness validation and change tracking' },
    { pattern: /updated$/i, description: 'Update time field indicating most recent changes for cache invalidation' },
    
    // Identity & References
    { pattern: /^id$/i, description: 'Unique identifier enabling database relationships, indexing, and entity referencing' },
    { pattern: /id$/i, description: 'ID field providing primary key functionality for data integrity and linkage' },
    { pattern: /^name$/i, description: 'Human-readable identifier for user recognition, categorization, and display purposes' },
    { pattern: /name$/i, description: 'Name field containing descriptive labels for entity identification and organization' },
    { pattern: /^title$/i, description: 'Primary heading or designation for content organization and hierarchical structure' },
    { pattern: /^key$/i, description: 'Primary key, cryptographic key, or unique identifier for security and data access' },
    { pattern: /key$/i, description: 'Key field enabling encryption, authentication, or database indexing operations' },
    
    // Network & Protocol
    { pattern: /^program$/i, description: 'Solana program address or smart contract reference for on-chain logic execution' },
    { pattern: /program$/i, description: 'Program field identifying smart contract deployment and interaction endpoints' },
    { pattern: /^account$/i, description: 'Solana account address storing data, tokens, or program state information' },
    { pattern: /account$/i, description: 'Account field referencing on-chain data storage and token holdings' },
    { pattern: /^owner$/i, description: 'Account or asset owner controlling permissions, transfers, and operational authority' },
    { pattern: /owner$/i, description: 'Owner field establishing control relationships and permission hierarchies' },
    { pattern: /^authority$/i, description: 'Authority address with special permissions for minting, freezing, or program upgrades' },
    { pattern: /authority$/i, description: 'Authority field containing administrative control and governance references' },
    
    // Metrics & Analytics
    { pattern: /^count$/i, description: 'Numerical count for frequency analysis, statistical reporting, and trend identification' },
    { pattern: /count$/i, description: 'Count field enabling aggregation, analytics, and performance measurement' },
    { pattern: /^rank$/i, description: 'Ranking position for competitive analysis, leaderboards, and comparative metrics' },
    { pattern: /rank$/i, description: 'Rank field providing ordered positioning for performance evaluation' },
    { pattern: /^score$/i, description: 'Calculated score for rating, risk assessment, or performance evaluation' },
    { pattern: /score$/i, description: 'Score field containing evaluation results for decision support systems' },
    { pattern: /^percentage$/i, description: 'Percentage value for proportional analysis, allocation ratios, and statistical reporting' },
    { pattern: /percentage$/i, description: 'Percentage field enabling ratio calculations and comparative analysis' },
    { pattern: /^ratio$/i, description: 'Mathematical ratio for financial analysis, risk metrics, and performance comparisons' },
    { pattern: /ratio$/i, description: 'Ratio field providing proportional relationships between financial metrics' },
    { pattern: /^rate$/i, description: 'Rate measurement indicating frequency, growth, or percentage change over time' },
    { pattern: /rate$/i, description: 'Rate field containing velocity, frequency, or temporal change measurements' },
    
    // Status & State Management
    { pattern: /^status$/i, description: 'Current operational status for system monitoring, error handling, and workflow control' },
    { pattern: /status$/i, description: 'Status field providing state information for process management and monitoring' },
    { pattern: /^state$/i, description: 'System state information for condition monitoring and operational decision making' },
    { pattern: /state$/i, description: 'State field indicating current condition and operational mode' },
    { pattern: /^active$/i, description: 'Activity flag controlling feature availability and operational status' },
    { pattern: /active$/i, description: 'Active field indicating whether entity is currently operational and accessible' },
    { pattern: /^enabled$/i, description: 'Enable flag for feature toggles, access control, and functionality management' },
    { pattern: /enabled$/i, description: 'Enabled field controlling feature activation and user permissions' },
    
    // Categories & Classification
    { pattern: /^type$/i, description: 'Entity type classification for processing logic, validation rules, and categorization' },
    { pattern: /type$/i, description: 'Type field enabling polymorphic behavior and category-based processing' },
    { pattern: /^category$/i, description: 'Category classification for organizational hierarchy and filtered data access' },
    { pattern: /category$/i, description: 'Category field providing taxonomical organization and content grouping' },
    { pattern: /^class$/i, description: 'Class designation for systematic categorization and behavioral inheritance' },
    { pattern: /class$/i, description: 'Class field defining entity behavior and shared characteristic groupings' },
  ];

  // Find matching pattern with enhanced descriptions
  for (const { pattern, description } of enhancedPatterns) {
    if (pattern.test(columnName)) {
      return description;
    }
  }

  // Advanced value-based analysis for unknown patterns
  if (type === 'number') {
    if (value > 1000000000000) {
      return 'Large numerical value, likely representing timestamp, supply amounts, or high-precision financial data';
    } else if (value > 1000000000) {
      return 'Large numerical value, possibly representing monetary amounts, block numbers, or supply quantities';
    } else if (value > 1000000) {
      return 'Medium-scale numerical value for market data, transaction amounts, or statistical measurements';
    } else if (value < 1 && value > 0) {
      return 'Decimal fraction value representing percentage, ratio, or precision measurements below unity';
    } else if (Number.isInteger(value)) {
      return 'Integer value for counting, indexing, or discrete quantity measurements';
    } else {
      return 'Floating-point numerical value for calculations, measurements, or statistical analysis';
    }
  } else if (type === 'string') {
    if (value && value.length > 60 && /^[A-Za-z0-9+/=]+$/.test(value)) {
      return 'Base64-encoded data containing binary information, possibly images, certificates, or encrypted content';
    } else if (/^[0-9a-fA-F]{64}$/.test(value)) {
      return 'SHA-256 hash or 64-character hexadecimal identifier for cryptographic verification';
    } else if (/^[0-9a-fA-F]{40}$/.test(value)) {
      return 'SHA-1 hash or 40-character hexadecimal identifier for content verification';
    } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      return 'Base58-encoded Solana address for accounts, programs, or token mints on the blockchain';
    } else if (/^0x[0-9a-fA-F]+$/.test(value)) {
      return 'Hexadecimal-encoded data with 0x prefix, possibly Ethereum address or transaction hash';
    } else if (value && value.includes('@') && value.includes('.')) {
      return 'Email address format for user communication and account identification';
    } else if (value && value.startsWith('http')) {
      return 'HTTP/HTTPS URL for web resources, API endpoints, or external service references';
    } else if (value && value.length > 200) {
      return 'Extended text content containing descriptions, documentation, or detailed information';
    } else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'ISO date format string for temporal data representation and chronological organization';
    } else if (/^\d+$/.test(value)) {
      return 'Numeric string containing integer values stored as text for precision or display purposes';
    } else {
      return 'Text string containing human-readable content, labels, or descriptive information';
    }
  } else if (type === 'boolean') {
    return 'Boolean flag for binary state control, feature toggles, or conditional logic processing';
  } else if (Array.isArray(value)) {
    return 'Array data structure containing multiple related values for iteration and batch processing';
  } else if (type === 'object' && value !== null) {
    return 'Object containing structured data with key-value pairs for complex information storage';
  } else if (value === null || value === undefined) {
    return 'Null or undefined value indicating missing, unknown, or not applicable data';
  } else {
    return `${columnName} field containing ${type} data for application-specific processing and analysis`;
  }
}

// Enhanced data type detection with more granular classification
function getAdvancedDataType(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  const type = typeof value;
  
  if (type === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? `array<${getAdvancedDataType(value[0])}>` : 'array';
    }
    return 'object';
  }
  
  if (type === 'number') {
    if (Number.isInteger(value)) {
      if (value > 1000000000) return 'bigint';
      if (value >= 0) return 'uint';
      return 'integer';
    }
    return 'decimal';
  }
  
  if (type === 'string') {
    // Enhanced string type detection
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime_iso';
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^\d{2}:\d{2}:\d{2}/.test(value)) return 'time';
    if (/^[0-9a-fA-F]{64}$/.test(value)) return 'hash_sha256';
    if (/^[0-9a-fA-F]{40}$/.test(value)) return 'hash_sha1';
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return 'solana_address';
    if (/^0x[0-9a-fA-F]+$/.test(value)) return 'hex_string';
    if (/^\d+$/.test(value)) return 'numeric_string';
    if (value.includes('@') && value.includes('.')) return 'email';
    if (value.startsWith('http')) return 'url';
    if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 60) return 'base64';
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') return 'boolean_string';
    return 'text';
  }
  
  return type;
}

// Generate comprehensive column definitions from API response data
function generateAdvancedColumnDefinitions(data: any[]): ColumnDefinition[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Analyze multiple samples for better accuracy
  const sampleSize = Math.min(data.length, 10);
  const samples = data.slice(0, sampleSize);
  
  // Collect all possible columns from all samples
  const allColumns = new Set<string>();
  samples.forEach(sample => {
    if (sample && typeof sample === 'object') {
      Object.keys(sample).forEach(key => allColumns.add(key));
    }
  });

  const columns: ColumnDefinition[] = [];

  allColumns.forEach(columnName => {
    // Find the first non-null sample value for this column
    let sampleValue = null;
    let valueType = 'null';
    
    for (const sample of samples) {
      if (sample && sample[columnName] !== null && sample[columnName] !== undefined) {
        sampleValue = sample[columnName];
        valueType = typeof sampleValue;
        break;
      }
    }

    const dataType = getAdvancedDataType(sampleValue);
    const description = generateAIColumnDescription(columnName, sampleValue, valueType);
    
    // Create example value (truncated if too long)
    let example = '';
    if (sampleValue !== null && sampleValue !== undefined) {
      const valueStr = String(sampleValue);
      example = valueStr.length > 100 ? valueStr.substring(0, 97) + '...' : valueStr;
    }

    columns.push({
      name: columnName,
      type: dataType,
      description: description,
      example: example || undefined
    });
  });

  // Sort columns by name for consistent ordering
  return columns.sort((a, b) => a.name.localeCompare(b.name));
}

export async function POST(request: NextRequest) {
  try {
    const { apis } = await request.json();

    if (!apis || !Array.isArray(apis)) {
      return NextResponse.json({
        success: false,
        error: 'APIs array is required'
      }, { status: 400 });
    }

    console.log(`Starting bulk fetch for ${apis.length} APIs`);
    
    const results = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const api of apis) {
      try {
        console.log(`Fetching API ${processed + 1}/${apis.length}: ${api.title}`);
        
        // Construct the full URL with API key
        const fullUrl = api.apiKey 
          ? `${api.endpoint}?api_key=${api.apiKey}`
          : api.endpoint;

        // Fetch with timeout
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Solana-Analytics-Admin/1.0',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract array data from various response formats
        let arrayData: any[] = [];
        let metadataColumns: any[] = [];
        
        if (Array.isArray(data)) {
          arrayData = data;
        } else if (data.query_result && data.query_result.data) {
          // TopLedger API format: query_result.data.rows contains the data
          if (Array.isArray(data.query_result.data.rows)) {
            arrayData = data.query_result.data.rows;
          } else if (Array.isArray(data.query_result.data)) {
            arrayData = data.query_result.data;
          }
          // Extract column metadata if available
          if (data.query_result.data.columns && Array.isArray(data.query_result.data.columns)) {
            metadataColumns = data.query_result.data.columns;
          }
        } else if (data.data && Array.isArray(data.data)) {
          arrayData = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          arrayData = data.results;
        } else if (data.rows && Array.isArray(data.rows)) {
          arrayData = data.rows;
        } else {
          arrayData = [data];
        }

        // Generate enhanced column definitions
        let columns: ColumnDefinition[] = [];
        
        // If we have metadata columns from TopLedger API, use them as the base
        if (metadataColumns.length > 0) {
          columns = metadataColumns.map((col: any) => {
            const sampleValue = arrayData.length > 0 ? arrayData[0][col.name] : null;
            const enhancedType = getAdvancedDataType(sampleValue);
            const description = generateAIColumnDescription(col.name, sampleValue, col.type || enhancedType);
            
            let example = '';
            if (sampleValue !== null && sampleValue !== undefined) {
              const valueStr = String(sampleValue);
              example = valueStr.length > 100 ? valueStr.substring(0, 97) + '...' : valueStr;
            }
            
            return {
              name: col.name,
              type: enhancedType,
              description: description,
              example: example || undefined
            };
          });
        } else {
          // Fallback to analyzing data structure
          columns = generateAdvancedColumnDefinitions(arrayData.slice(0, 10));
        }

        results.push({
          id: api.id,
          success: true,
          columns: columns,
          sampleCount: arrayData.length,
          dataPreview: arrayData.slice(0, 2) // Return first 2 items as preview
        });

        successful++;

      } catch (error) {
        console.error(`Error fetching API ${api.title}:`, error);
        
        results.push({
          id: api.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          columns: []
        });

        failed++;
      }

      processed++;
      
      // Add delay between requests to avoid overwhelming APIs
      if (processed < apis.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Bulk fetch completed: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      totalProcessed: processed,
      successful: successful,
      failed: failed,
      results: results,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk API fetch:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
