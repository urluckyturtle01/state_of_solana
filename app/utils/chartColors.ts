/**
 * Centralized color definitions for all charts in the application
 * Simple ordered color system - always use colors in sequence from this list
 */

// Define a sequential list of 25 colors that all charts will use in order
export const colors = [
  '#00BFFF', // Sky Depth
  '#1E90FF', // Dazzling Blue
  '#40E0D0', // Tropical Turquoise
  '#4169E1', // Royal Azure
  '#32CD32', // Vivid Green
  '#7FFF00', // Electric Chartreuse
  '#ADFF2F', // Lime Zest
  '#FFD700', // Golden Yellow
  '#FF9F68', // Sunset Peach
  '#FF6B6B', // Warm Coral
  '#FF1493', // Punchy Pink
  '#FF69B4', // Bubblegum
  '#FF00FF', // Neon Magenta
  '#BA55D3', // Orchid Bloom
  '#9370DB', // Lavender Mist
  '#6A5ACD', // Deep Periwinkle
  '#DA70D6', // Dusty Orchid
  '#AFEEEE', // Soft Cyan
  '#87CEEB', // Airy Blue
  '#98FB98', // Pastel Mint
  '#00FA9A', // Mint Spring
  '#EEE8AA', // Pale Gold
  '#FFDAB9', // Peach Cream
  '#FFA07A', // Salmon Glow
  '#9ACD32', // Olive Bright
];

// Named exports for the first 10 colors for semantic use
export const blue = colors[0];
export const purple = colors[1];
export const green = colors[2];
export const orange = colors[3];
export const red = colors[4];
export const yellow = colors[5];
export const teal = colors[6];
export const darkPurple = colors[7];
export const pink = colors[8];
export const gray = colors[9];

// Data type specific colors
export const volumeColor = colors[0];    // Always use for volume metrics
export const velocityColor = colors[1];  // Always use for velocity metrics
export const tvlColor = colors[2];       // Always use for TVL metrics
export const countColor = colors[3];     // Always use for count/number metrics

// Chart structural elements
export const grid = '#1f2937';
export const axisLines = '#374151';
export const tickLabels = '#6b7280';
export const background = 'rgba(255, 255, 255, 0.05)';

// Function to get a color by index (with wrapping)
export const getColorByIndex = (index: number): string => {
  return colors[index % colors.length];
};

const CURRENCY_SUFFIXES = ['_usd', '_sol', '_btc', '_eth', '_usdc', '_usdt'];
const SEMANTIC_ORDER: Record<string, number> = { avg: 0, median: 1, stddev: 2, max: 3 };

function getBaseFieldName(fieldName: string): string {
  let base = fieldName.toLowerCase();
  for (const suffix of CURRENCY_SUFFIXES) {
    if (base.endsWith(suffix)) {
      return base.slice(0, -suffix.length);
    }
  }
  return base;
}

function getSemanticOrderIndex(fieldName: string): number | null {
  const lower = fieldName.toLowerCase();
  for (const [key, order] of Object.entries(SEMANTIC_ORDER)) {
    if (lower.startsWith(`${key}_`) || lower === key) return order;
  }
  return null;
}

/** Sort key for semantic ordering (avg=0, median=1, stddev=2, max=3). */
export function getSemanticSortKey(fieldName: string): number {
  return getSemanticOrderIndex(fieldName) ?? 999;
}

/**
 * Create a color map. When fields have currency suffixes (_usd, _sol, etc.),
 * assigns colors by BASE field so avg_sol and avg_usd share the same color
 * (only 3 colors for 3 concepts, not 6 for 6 series).
 */
export function getValueOrderedColorMap(
  fields: string[],
  getTotal: (field: string) => number,
  preferredMap: Record<string, string> = {}
): Record<string, string> {
  const hasCurrencySuffixes = fields.some(f => getBaseFieldName(f) !== f.toLowerCase());

  if (hasCurrencySuffixes) {
    const baseToColorIndex: Record<string, number> = {};
    const uniqueBases = [...new Set(fields.map(getBaseFieldName))].sort((a, b) => {
      const orderA = getSemanticOrderIndex(a);
      const orderB = getSemanticOrderIndex(b);
      if (orderA !== null && orderB !== null) return orderA - orderB;
      if (orderA !== null) return -1;
      if (orderB !== null) return 1;
      return a.localeCompare(b);
    });
    uniqueBases.forEach((base, i) => { baseToColorIndex[base] = i; });

    const result: Record<string, string> = {};
    fields.forEach(field => {
      const base = getBaseFieldName(field);
      const colorIndex = baseToColorIndex[base] ?? 0;
      result[field] = preferredMap[field] ?? getColorByIndex(colorIndex);
    });
    return result;
  }

  const sorted = [...fields].sort((a, b) => {
    const va = getTotal(a);
    const vb = getTotal(b);
    if (vb !== va) return vb - va;
    return a.localeCompare(b);
  });
  const result: Record<string, string> = {};
  sorted.forEach((field, index) => {
    result[field] = preferredMap[field] ?? getColorByIndex(index);
  });
  return result;
}

// Utility function to get the first N colors from the palette
export const getFirstNColors = (n: number): string[] => {
  return colors.slice(0, Math.min(n, colors.length));
};

// Legacy for backward compatibility
export const allColors = colors;

// DEX-specific category colors - consistent mapping for DEX platforms
export const dexCategoryColors = {
  'Raydium': purple,
  'Orca': blue,
  'Meteora': green,
  'Phoenix': orange,
  'Ellipsis Labs': red,
  'OpenBook': yellow,
  'Crema Finance': teal,
  'Saros Finance': darkPurple,
  'Cropper Finance': pink,
  'Other': gray
};

// Transaction frequency category colors - consistent across all charts
export const transactionCategoryColors = {
  "1-3 transactions": blue,
  "4-5 transactions": green,
  "6-10 transactions": purple,
  "11-100 transactions": orange,
  "101-1000 transactions": red,
  ">1000 transactions": yellow
};

// Function to get a color for a specific entity with fallback
export const getEntityColor = (entity: string, entityMap: Record<string, string>): string => {
  return entityMap[entity] || gray;
};

// Export an array of all colors for convenience
export const allColorsArray = [
  blue, purple, green, orange, red, yellow, pink, darkPurple, teal, gray,
  colors[10], colors[11], colors[12], colors[13], colors[14], colors[15],
  colors[16], colors[17], colors[18], colors[19], colors[20],
  colors[21], colors[22], colors[23], colors[24]
]; 