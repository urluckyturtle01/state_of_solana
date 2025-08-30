import { Metadata } from 'next';

// Enable ISR for shared chart metadata with 5-minute revalidation
export const revalidate = 300;

interface GenerateMetadataProps {
  params: {
    chartId: string;
  };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  // For development, skip the fetch to avoid port conflicts and just return basic metadata
  return {
    title: 'Shared Chart | Top Ledger Research',
    description: 'View and interact with this shared chart from Top Ledger Research.',
    openGraph: {
      title: 'Shared Chart | Top Ledger Research',
      description: 'View and interact with this shared chart from Top Ledger Research.',
      type: 'website',
      siteName: 'Top Ledger',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shared Chart | Top Ledger Research',
      description: 'View and interact with this shared chart from Top Ledger Research.',
    },
  };
}

export default function SharedChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 