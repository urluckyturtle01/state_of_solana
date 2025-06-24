import fs from 'fs';
import path from 'path';

// Read the full JSON data at build time
const cacheFilePath = path.join(process.cwd(), 'public', 'api-cache.json');
let fullApiCacheData: any[] = [];

try {
  const content = fs.readFileSync(cacheFilePath, 'utf-8');
  fullApiCacheData = JSON.parse(content);
} catch (error) {
  console.warn('Failed to read full API cache, using fallback data');
  fullApiCacheData = [
    {
      "id": "fallback_api_1",
      "name": "Fallback API 1",
      "endpoint": "https://example.com/api/fallback1",
    "method": "GET",
      "columns": ["date", "value"],
      "chartTitle": "Fallback Chart 1",
      "page": "fallback"
    }
  ];
}

export const apiCacheData = fullApiCacheData;