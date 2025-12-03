# Validators Components

This directory contains reusable components and utilities specific to the validators section of the application.

## useChartDownload Hook

A custom React hook that provides CSV download functionality for chart data.

### Usage

```typescript
import { useChartDownload } from '@/app/validators/components/useChartDownload';

function MyComponent() {
  const { downloadCSV, isDownloading } = useChartDownload();

  const handleDownload = () => {
    downloadCSV({
      filename: 'my_chart_data',
      data: chartData,
      chartTitle: 'My Chart',
      columns: ['epoch', 'value', 'category'] // Optional: only include these columns
    });
  };

  return (
    <ChartCard
      onDownloadClick={handleDownload}
      isDownloading={isDownloading}
      // ... other props
    />
  );
}
```

### Features

- **Automatic CSV formatting**: Converts any array of objects to CSV format
- **Column filtering**: Optionally specify which columns to include in the export
- **Timestamp-based filenames**: Automatically adds current date to filenames
- **Special character handling**: Properly escapes commas and quotes in data
- **Loading state management**: Tracks download progress
- **Error handling**: Gracefully handles download failures

### API

#### `downloadCSV(options)`

Downloads chart data as a CSV file.

**Parameters:**
- `filename` (string): Base name for the file (without extension)
- `data` (array): Array of objects to export
- `chartTitle` (string, optional): Title of the chart for metadata
- `columns` (string[], optional): Array of column names to include in export. If not provided, all columns are exported.

**Returns:** void

**Side effects:** 
- Creates and downloads a CSV file
- Updates `isDownloading` state during the operation

**Example with column filtering:**
```typescript
downloadCSV({
  filename: 'stake_data',
  data: chartData,
  chartTitle: 'Stake by Epoch',
  columns: ['epoch', 'total_stake', 'vote_account'] // Only these columns will be exported
});
```

#### `isDownloading`

Boolean state indicating whether a download is currently in progress.

