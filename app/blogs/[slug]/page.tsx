import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ArticleHeader from '../components/ArticleHeader';
import ArticleContent from '../components/ArticleContent';
import ReadingProgress from '../components/ReadingProgress';
import SocialSharing from '../components/SocialSharing';
import BlogAnalytics from '../components/BlogAnalytics';
import BlogAnalyticsMobile from '../components/BlogAnalyticsMobile';
import BlogAnalyticsTracker from '../components/BlogAnalyticsTracker';
import AuthorBio from '../components/AuthorBio';
import RelatedArticles from '../components/RelatedArticles';
import BackToBlogsButton from '../components/BackToBlogsButton';
import TwitterCardMeta from '../components/TwitterCardMeta';
import { generateNextMetadata, generateStructuredData } from '../../seo-metadata';
export const dynamic = "force-dynamic"; // 👈 add this here

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  slug: string;
  readTime?: string;
  company?: {
    name: string;
    handle: string;
  };
}

// Fetch article from S3 directly
async function getArticleFromS3(slug: string) {
  try {
    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      console.error('S3 credentials not configured');
      return null;
    }

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    const key = `blog-articles/${slug}.json`;

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const result = await s3Client.send(command);
    const body = await result.Body?.transformToString();
    
    if (!body) {
      return null;
    }

    const articleData = JSON.parse(body);
    return articleData;
  } catch (error: any) {
    // Check if it's a NoSuchKey error
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      return null;
    }
    console.error('Error fetching article from S3:', error);
    return null;
  }
}

// Fetch all articles for related posts
async function getAllArticlesFromS3() {
  try {
    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      return [];
    }

    const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    // List all objects in the blog-articles folder
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: 'blog-articles/',
      MaxKeys: 100
    });

    const listResult = await s3Client.send(listCommand);
    const objects = listResult.Contents || [];

    // Fetch each blog post metadata
    const articles = [];
    
    for (const object of objects) {
      if (object.Key && object.Key.endsWith('.json')) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: object.Key,
          });

          const getResult = await s3Client.send(getCommand);
          const body = await getResult.Body?.transformToString();
          
          if (body) {
            const articleData = JSON.parse(body);
            articles.push(articleData.blogPost);
          }
        } catch (fileError) {
          console.error(`Error reading ${object.Key}:`, fileError);
          // Continue with other files
        }
      }
    }

    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return articles;
  } catch (error) {
    console.error('Error fetching articles from S3:', error);
    return [];
  }
}

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

// Helper function to get author Twitter handle
function getAuthorTwitterHandle(authorName: string): string {
  const authorHandles: Record<string, string> = {
    'Soham': '@sohamska',
    'Decal': '@decal_dev',
    'Helius Team': '@helius_labs',
  };
  return authorHandles[authorName] || '@ledger_top';
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const articleData = await getArticleFromS3(params.slug);
  
  if (!articleData || !articleData.blogPost) {
    return {
      title: 'Article Not Found | State of Solana',
    };
  }

  const post = articleData.blogPost;
  const authorTwitterHandle = getAuthorTwitterHandle(post.author);

  return {
    title: `${post.title} | State of Solana`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://research.topledger.xyz/blogs/${post.slug}`,
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      siteName: 'State of Solana',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: {
        url: post.image,
        alt: post.title,
      },
      creator: authorTwitterHandle,
      site: '@ledger_top',
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const articleData = await getArticleFromS3(params.slug);

  if (!articleData || !articleData.blogPost) {
    notFound();
  }

  const post = articleData.blogPost;
  const articleContent = articleData.content || [];

  // Get related posts
  const allPosts = await getAllArticlesFromS3();
  const relatedPosts = allPosts
    .filter((p: BlogPost) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <>
      <TwitterCardMeta post={post} />
      <ReadingProgress />
      <BlogAnalyticsTracker slug={post.slug} />
      
      <div className="min-h-screen relative">
        {/* Floating Social Sharing - Top Right Corner */}
        <div className="fixed top-20 right-6 z-50 hidden md:block">
          <SocialSharing 
            post={post} 
            position="floating"
            url={`https://research.topledger.xyz/blogs/${post.slug}`}
          />
        </div>

        {/* Blog Analytics - Below Social Sharing (Desktop) */}
        <div className="fixed top-60 right-6 z-50 hidden md:block">
          <BlogAnalytics slug={post.slug} />
        </div>

        <div className="max-w-4xl mx-auto py-8">
          
          {/* Back to Blogs Button */}
          <BackToBlogsButton />
          
          {/* Article Header */}
          <ArticleHeader post={post} />
          
          {/* Mobile Social Sharing - Inline */}
          <div className="mb-8 md:hidden">
            <SocialSharing 
              post={post} 
              position="mobile"
              url={`https://research.topledger.xyz/blogs/${post.slug}`}
              analyticsButton={<BlogAnalyticsMobile slug={post.slug} />}
            />
          </div>
          
          {/* Article Content */}
          <ArticleContent content={articleContent} />
          
          {/* Author Bio */}
          <AuthorBio author={post.author} />
          
          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <RelatedArticles posts={relatedPosts} />
          )}
          
        </div>
      </div>
    </>
  );
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  try {
    const allPosts = await getAllArticlesFromS3();
    return allPosts.map((post: BlogPost) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
} 
