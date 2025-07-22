import Head from 'next/head';
import { BlogPost } from '../data/sampleData';

interface TwitterCardMetaProps {
  post: BlogPost;
}

export default function TwitterCardMeta({ post }: TwitterCardMetaProps) {
  const authorHandles: Record<string, string> = {
    'Soham': '@sohamska',
    'Decal': '@decal_dev',
    'Helius Team': '@helius_labs',
  };
  
  const authorTwitterHandle = authorHandles[post.author] || '@ledger_top';
  const articleUrl = `https://research.topledger.xyz/blogs/${post.slug}`;

  return (
    <Head>
      {/* Twitter Card specific meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ledger_top" />
      <meta name="twitter:creator" content={authorTwitterHandle} />
      <meta name="twitter:title" content={post.title} />
      <meta name="twitter:description" content={post.excerpt} />
      <meta name="twitter:image" content={post.image} />
      <meta name="twitter:image:alt" content={post.title} />
      
      {/* Additional Open Graph meta tags */}
      <meta property="og:url" content={articleUrl} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.excerpt} />
      <meta property="og:image" content={post.image} />
      <meta property="og:image:width" content="1600" />
      <meta property="og:image:height" content="824" />
      <meta property="og:image:alt" content={post.title} />
      <meta property="og:site_name" content="State of Solana" />
    </Head>
  );
} 