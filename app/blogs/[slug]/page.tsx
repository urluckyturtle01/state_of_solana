import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ArticleHeader from '../components/ArticleHeader';
import ArticleContent from '../components/ArticleContent';
import ReadingProgress from '../components/ReadingProgress';
import SocialSharing from '../components/SocialSharing';
import AuthorBio from '../components/AuthorBio';
import RelatedArticles from '../components/RelatedArticles';
import BackToBlogsButton from '../components/BackToBlogsButton';
import { sampleBlogPosts, BlogPost } from '../data/sampleData';
import { getArticleContent } from '../data/articleContent';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const post = sampleBlogPosts.find(p => p.slug === params.slug);
  
  if (!post) {
    return {
      title: 'Article Not Found | State of Solana',
    };
  }

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
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const post = sampleBlogPosts.find(p => p.slug === params.slug);
  
  if (!post) {
    notFound();
  }

  const articleContent = getArticleContent(post.slug);
  const relatedPosts = sampleBlogPosts
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <>
      <ReadingProgress />
      
      <div className="min-h-screen relative">
        {/* Floating Social Sharing - Top Right Corner */}
        <div className="fixed top-20 right-6 z-50 hidden md:block">
          <SocialSharing 
            post={post} 
            position="floating"
            url={`https://research.topledger.xyz/blogs/${post.slug}`}
          />
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
export function generateStaticParams() {
  return sampleBlogPosts.map((post) => ({
    slug: post.slug,
  }));
} 