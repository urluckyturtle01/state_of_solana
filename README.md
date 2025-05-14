# State of Solana Dashboard

An interactive dashboard displaying key metrics and visualizations for the Solana blockchain ecosystem, focusing on DeFi and DEX activity.

## Features

- Real-time metrics for TVL, volume, and trader activity
- Interactive time-series charts with customizable time filters
- DEX program category breakdown
- CSV data exports for further analysis
- Responsive design for desktop and mobile viewing
- Admin panel to dynamically add and configure charts

## Chart Capabilities

The dashboard supports multiple chart types:

- **Bar Charts**: Visualize categorical data with support for stacked variants
- **Line Charts**: Display time series data with interactive tooltips
- **Area Charts**: Show trends with filled areas below the line
- **Stacked Area Charts**: Visualize part-to-whole relationships over time

All charts feature:
- Consistent color schemes based on categories
- Interactive tooltips showing precise values
- Automatic data normalization and field matching
- CSV export functionality

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Visx (for data visualization)

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Panel

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) to:

- Create new charts with a simple form interface
- Add charts to any page in the dashboard
- Configure data sources for each chart
- Preview charts during creation

## Data Sources

This dashboard uses data from TopLedger's analytics API to provide accurate and up-to-date metrics on Solana's DeFi ecosystem.

## License

MIT
