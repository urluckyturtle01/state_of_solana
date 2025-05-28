import { Metadata } from 'next';

interface GenerateMetadataProps {
  params: {
    chartId: string;
  };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  // Fetch chart data
  try {
    const response = await fetch(`/api/charts/${params.chartId}`);
    if (!response.ok) {
      return {
        title: 'Chart Not Found | Top Ledger Research',
        description: 'The requested chart could not be found.',
      };
    }

    const chart = await response.json();
    return {
      title: `${chart.title} | Top Ledger Research`,
      description: chart.subtitle || chart.title,
      openGraph: {
        title: chart.title,
        description: chart.subtitle || chart.title,
        type: 'website',
      },
    };
  } catch (error) {
    return {
      title: 'Error Loading Chart | Top Ledger Research',
      description: 'There was an error loading the chart.',
    };
  }
}

export default function SharedChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 