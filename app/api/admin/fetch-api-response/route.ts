import { NextRequest, NextResponse } from 'next/server';

interface ColumnDefinition {
  name: string;
  type: string;
  description: string;
  example?: string;
}

// Generate intelligent column definitions based on the data
function generateColumnDefinitions(data: any[]): ColumnDefinition[] {
  if (!data || data.length === 0) {
    return [];
  }

  const sample = data[0];
  const columns: ColumnDefinition[] = [];

  Object.keys(sample).forEach(key => {
    const value = sample[key];
    const type = typeof value;
    
    let description = generateColumnDescription(key, value, type);
    
    columns.push({
      name: key,
      type: getDataType(value),
      description,
      example: String(value).length > 100 ? String(value).substring(0, 100) + '...' : String(value)
    });
  });

  return columns;
}

// Generate smart descriptions for columns based on their names and content
function generateColumnDescription(columnName: string, value: any, type: string): string {
  const lowerName = columnName.toLowerCase();
  
  // Common column patterns and their descriptions
  const patterns = [
    { pattern: /^id$/i, description: 'Unique identifier' },
    { pattern: /id$/i, description: 'Identifier field' },
    { pattern: /^name$/i, description: 'Name or title' },
    { pattern: /name$/i, description: 'Name field' },
    { pattern: /^title$/i, description: 'Title or heading' },
    { pattern: /^description$/i, description: 'Detailed description' },
    { pattern: /desc$/i, description: 'Description field' },
    { pattern: /^date$/i, description: 'Date value' },
    { pattern: /date$/i, description: 'Date/time field' },
    { pattern: /^time$/i, description: 'Time value' },
    { pattern: /time$/i, description: 'Timestamp field' },
    { pattern: /^created$/i, description: 'Creation timestamp' },
    { pattern: /^updated$/i, description: 'Last update timestamp' },
    { pattern: /^modified$/i, description: 'Modification timestamp' },
    { pattern: /^price$/i, description: 'Price value' },
    { pattern: /price$/i, description: 'Price or cost field' },
    { pattern: /^amount$/i, description: 'Amount or quantity' },
    { pattern: /amount$/i, description: 'Monetary amount' },
    { pattern: /^value$/i, description: 'Numeric value' },
    { pattern: /value$/i, description: 'Value field' },
    { pattern: /^count$/i, description: 'Count or number' },
    { pattern: /count$/i, description: 'Count field' },
    { pattern: /^total$/i, description: 'Total sum' },
    { pattern: /total$/i, description: 'Total value' },
    { pattern: /^volume$/i, description: 'Trading volume' },
    { pattern: /volume$/i, description: 'Volume metric' },
    { pattern: /^balance$/i, description: 'Account balance' },
    { pattern: /balance$/i, description: 'Balance amount' },
    { pattern: /^address$/i, description: 'Wallet or contract address' },
    { pattern: /address$/i, description: 'Address field' },
    { pattern: /^hash$/i, description: 'Cryptographic hash' },
    { pattern: /hash$/i, description: 'Hash value' },
    { pattern: /^signature$/i, description: 'Digital signature' },
    { pattern: /signature$/i, description: 'Signature field' },
    { pattern: /^block$/i, description: 'Block number or identifier' },
    { pattern: /block$/i, description: 'Blockchain block reference' },
    { pattern: /^slot$/i, description: 'Solana slot number' },
    { pattern: /slot$/i, description: 'Slot field' },
    { pattern: /^epoch$/i, description: 'Blockchain epoch' },
    { pattern: /epoch$/i, description: 'Epoch number' },
    { pattern: /^fee$/i, description: 'Transaction fee' },
    { pattern: /fee$/i, description: 'Fee amount' },
    { pattern: /^gas$/i, description: 'Gas cost or limit' },
    { pattern: /gas$/i, description: 'Gas field' },
    { pattern: /^nonce$/i, description: 'Transaction nonce' },
    { pattern: /nonce$/i, description: 'Nonce value' },
    { pattern: /^status$/i, description: 'Status or state' },
    { pattern: /status$/i, description: 'Status field' },
    { pattern: /^type$/i, description: 'Type or category' },
    { pattern: /type$/i, description: 'Type field' },
    { pattern: /^category$/i, description: 'Category classification' },
    { pattern: /category$/i, description: 'Category field' },
    { pattern: /^symbol$/i, description: 'Token or currency symbol' },
    { pattern: /symbol$/i, description: 'Symbol field' },
    { pattern: /^decimals$/i, description: 'Number of decimal places' },
    { pattern: /decimals$/i, description: 'Decimal precision' },
    { pattern: /^supply$/i, description: 'Token supply amount' },
    { pattern: /supply$/i, description: 'Supply field' },
    { pattern: /^mint$/i, description: 'Token mint address' },
    { pattern: /mint$/i, description: 'Mint field' },
    { pattern: /^owner$/i, description: 'Owner address' },
    { pattern: /owner$/i, description: 'Owner field' },
    { pattern: /^authority$/i, description: 'Authority address' },
    { pattern: /authority$/i, description: 'Authority field' },
    { pattern: /^program$/i, description: 'Program or smart contract address' },
    { pattern: /program$/i, description: 'Program field' },
    { pattern: /^account$/i, description: 'Account address or identifier' },
    { pattern: /account$/i, description: 'Account field' },
    { pattern: /^pubkey$/i, description: 'Public key' },
    { pattern: /pubkey$/i, description: 'Public key field' },
    { pattern: /^key$/i, description: 'Key or identifier' },
    { pattern: /key$/i, description: 'Key field' },
    { pattern: /^index$/i, description: 'Array or list index' },
    { pattern: /index$/i, description: 'Index field' },
    { pattern: /^size$/i, description: 'Size in bytes or length' },
    { pattern: /size$/i, description: 'Size field' },
    { pattern: /^length$/i, description: 'Length measurement' },
    { pattern: /length$/i, description: 'Length field' },
    { pattern: /^rank$/i, description: 'Ranking or position' },
    { pattern: /rank$/i, description: 'Rank field' },
    { pattern: /^score$/i, description: 'Score or rating' },
    { pattern: /score$/i, description: 'Score field' },
    { pattern: /^percentage$/i, description: 'Percentage value' },
    { pattern: /percentage$/i, description: 'Percentage field' },
    { pattern: /^percent$/i, description: 'Percentage value' },
    { pattern: /percent$/i, description: 'Percentage field' },
    { pattern: /^ratio$/i, description: 'Ratio value' },
    { pattern: /ratio$/i, description: 'Ratio field' },
    { pattern: /^rate$/i, description: 'Rate or frequency' },
    { pattern: /rate$/i, description: 'Rate field' },
    { pattern: /^url$/i, description: 'URL or web link' },
    { pattern: /url$/i, description: 'URL field' },
    { pattern: /^uri$/i, description: 'URI resource identifier' },
    { pattern: /uri$/i, description: 'URI field' },
    { pattern: /^email$/i, description: 'Email address' },
    { pattern: /email$/i, description: 'Email field' },
    { pattern: /^phone$/i, description: 'Phone number' },
    { pattern: /phone$/i, description: 'Phone field' },
  ];

  // Find matching pattern
  for (const { pattern, description } of patterns) {
    if (pattern.test(columnName)) {
      return description;
    }
  }

  // If no pattern matches, generate description based on type and content
  if (type === 'number') {
    if (value > 1000000000) {
      return 'Large numeric value, possibly timestamp or amount';
    } else if (value > 1000000) {
      return 'Large numeric value';
    } else if (value < 1 && value > 0) {
      return 'Decimal value, possibly percentage or ratio';
    } else {
      return 'Numeric value';
    }
  } else if (type === 'string') {
    if (value.length > 40 && /^[A-Za-z0-9+/=]+$/.test(value)) {
      return 'Base64 encoded data or hash';
    } else if (/^[0-9a-fA-F]{40,}$/.test(value)) {
      return 'Hexadecimal hash or address';
    } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      return 'Base58 encoded address (likely Solana)';
    } else if (value.includes('@')) {
      return 'Email address';
    } else if (value.startsWith('http')) {
      return 'URL or web link';
    } else if (value.length > 100) {
      return 'Long text content';
    } else {
      return 'Text field';
    }
  } else if (type === 'boolean') {
    return 'Boolean flag or status';
  } else if (type === 'object') {
    return 'Object or structured data';
  } else {
    return 'Data field';
  }
}

// Determine data type from value
function getDataType(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  const type = typeof value;
  
  if (type === 'object') {
    if (Array.isArray(value)) {
      return 'array';
    }
    return 'object';
  }
  
  if (type === 'number') {
    if (Number.isInteger(value)) {
      return 'integer';
    }
    return 'float';
  }
  
  if (type === 'string') {
    // Check for special string formats
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'datetime';
    }
    if (/^\d+$/.test(value)) {
      return 'string_numeric';
    }
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return 'string_boolean';
    }
  }
  
  return type;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    console.log(`Fetching API response from: ${url}`);

    // Fetch the API response
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Solana-Analytics-Admin/1.0',
      },
      // Add timeout
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched API response, data type:`, typeof data);

    // Extract array data from common response formats
    let arrayData: any[] = [];
    
    if (Array.isArray(data)) {
      arrayData = data;
    } else if (data.query_result && Array.isArray(data.query_result.data)) {
      // Common API format with query_result wrapper
      arrayData = data.query_result.data;
    } else if (data.data && Array.isArray(data.data)) {
      // Common API format with data wrapper
      arrayData = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      // Common API format with results wrapper
      arrayData = data.results;
    } else if (data.rows && Array.isArray(data.rows)) {
      // Common API format with rows wrapper
      arrayData = data.rows;
    } else {
      // If it's an object, treat it as a single-item array
      arrayData = [data];
    }

    console.log(`Extracted ${arrayData.length} data items for analysis`);

    // Generate column definitions
    const columns = generateColumnDefinitions(arrayData.slice(0, 5)); // Use first 5 items for analysis

    return NextResponse.json({
      success: true,
      columns: columns,
      sampleCount: arrayData.length,
      dataPreview: arrayData.slice(0, 3) // Return first 3 items as preview
    });

  } catch (error) {
    console.error('Error fetching API response:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
