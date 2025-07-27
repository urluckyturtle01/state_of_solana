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
    authors: [{ name: 'TopLedger Research' }],
    creator: 'TopLedger Research',
    publisher: 'TopLedger Research',
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
      url: `https://research.topledger.xyz/share/chart/${chartId}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: chartMeta.ogTitle,
      description: chartMeta.ogDescription,
      images: chartMeta.ogImage ? [chartMeta.ogImage] : undefined,
      creator: '@topledger',
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
      canonical: `https://research.topledger.xyz/share/chart/${chartId}`,
    },
    other: {
      // Additional meta tags for better indexing
      'theme-color': '#000000',
      'msapplication-TileColor': '#000000',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
    },
  };
}

// Server component that renders the client component with structured data
export default async function SharedChartPage({ 
  params 
}: { 
  params: Promise<{ chartId: string }> 
}) {
  const { chartId } = await params;
  const chartMeta = getChartMetadata(chartId) || defaultChartMetadata;
  
  // Generate JSON-LD structured data for better Google understanding
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": chartMeta.title,
    "description": chartMeta.description,
    "url": `https://research.topledger.xyz/share/chart/${chartId}`,
    "isPartOf": {
      "@type": "WebSite",
      "name": "State of Solana",
      "url": "https://research.topledger.xyz"
    },
    "about": {
      "@type": "Dataset",
      "name": chartMeta.ogTitle,
      "description": chartMeta.ogDescription,
      "keywords": chartMeta.keywords,
      "provider": {
        "@type": "Organization",
        "name": "TopLedger Research",
        "url": "https://research.topledger.xyz"
      }
    },
    "mainEntity": {
      "@type": "Chart",
      "name": chartMeta.ogTitle,
      "description": chartMeta.ogDescription,
      "image": chartMeta.ogImage,
      "creator": {
        "@type": "Organization",
        "name": "TopLedger Research"
      }
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://research.topledger.xyz"
        },
        {
          "@type": "ListItem", 
          "position": 2,
          "name": "Charts",
          "item": "https://research.topledger.xyz/share"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": chartMeta.ogTitle,
          "item": `https://research.topledger.xyz/share/chart/${chartId}`
        }
      ]
    }
  };
  
  return (
    <>
      {/* Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2)
        }}
      />
      
      {/* Additional meta tags in head */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-title" content="State of Solana" />
      <meta name="application-name" content="State of Solana" />
      
      {/* Chart page content */}
      <ClientChartPage />
    </>
  );
} 