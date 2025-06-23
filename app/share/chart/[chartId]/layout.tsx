import { Metadata } from 'next';

// Enable ISR for shared chart metadata with 5-minute revalidation
export const revalidate = 300;

interface GenerateMetadataProps {
  params: {
    chartId: string;
  };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  // Fetch chart data
  try {
    // Use the correct base URL for the API call
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/charts/${params.chartId}`, {
      next: { revalidate: 300 } // Use ISR with 5-minute revalidation
    });
    
    if (!response.ok) {
      return {
        title: 'Shared Chart | Top Ledger Research',
        description: 'View and interact with this shared chart from Top Ledger Research.',
        openGraph: {
          title: 'Shared Chart | Top Ledger Research',
          description: 'View and interact with this shared chart from Top Ledger Research.',
          type: 'website',
        },
      };
    }

    const chart = await response.json();
    return {
      title: `${chart.title} | Top Ledger`,
      description: chart.subtitle || chart.title || 'Interactive chart from Top Ledger analytics',
      openGraph: {
        title: chart.title || 'Shared Chart',
        description: chart.subtitle || chart.title || 'Interactive chart from Top Ledger analytics',
        type: 'website',
        siteName: 'Top Ledger',
      },
      twitter: {
        card: 'summary_large_image',
        title: chart.title || 'Shared Chart',
        description: chart.subtitle || chart.title || 'Interactive chart from Top Ledger analytics',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Shared Chart | Top Ledger',
      description: 'View and interact with this shared chart from Top Ledger analytics.',
      openGraph: {
        title: 'Shared Chart | Top Ledger',
        description: 'View and interact with this shared chart from Top Ledger analytics.',
        type: 'website',
        siteName: 'Top Ledger',
      },
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