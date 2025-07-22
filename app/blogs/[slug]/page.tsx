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
      
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto py-8">
          
          {/* Back to Blogs Button */}
          <BackToBlogsButton />
          
          {/* Article Header */}
          <ArticleHeader post={post} />
          
          {/* Social Sharing - Top */}
          <div className="mb-8">
            <SocialSharing 
              post={post} 
              position="top"
              url={`${process.env.NEXT_PUBLIC_BASE_URL || ''}/blogs/${post.slug}`}
            />
          </div>
          
          {/* Article Content */}
          <ArticleContent content={articleContent} />
          
          {/* Social Sharing - Bottom */}
          <div className="mt-12 mb-8">
            <SocialSharing 
              post={post} 
              position="bottom"
              url={`${process.env.NEXT_PUBLIC_BASE_URL || ''}/blogs/${post.slug}`}
            />
          </div>
          
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