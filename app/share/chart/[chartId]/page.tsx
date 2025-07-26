import { Metadata } from 'next';
import { getChartMetadata, defaultChartMetadata } from '../seo-meta';
import ClientChartPage from './ClientChartPage';

// Server component to handle metadata generation
export async function generateMetadata(
  { params }: { params: Promise<{ chartId: string }> }
): Promise<Metadata> {
  const { chartId } = await params;
  
  // Get SEO metadata for this chart
  const chartMeta = getChartMetadata(chartId) || defaultChartMetadata;
  
  return {
    title: chartMeta.title,
    description: chartMeta.description,
    keywords: chartMeta.keywords,
    openGraph: {
      title: chartMeta.ogTitle,
      description: chartMeta.ogDescription,
      images: chartMeta.ogImage ? [
        {
          url: chartMeta.ogImage,
          width: 1200,
          height: 630,
          alt: chartMeta.ogTitle,
        }
      ] : undefined,
      type: 'website',
      siteName: 'State of Solana',
    },
    twitter: {
      card: 'summary_large_image',
      title: chartMeta.ogTitle,
      description: chartMeta.ogDescription,
      images: chartMeta.ogImage ? [chartMeta.ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `/share/chart/${chartId}`,
    },
  };
}

// Server component that renders the client component
export default function SharedChartPage() {
  return <ClientChartPage />;
} 