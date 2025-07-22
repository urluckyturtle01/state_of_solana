import { Metadata } from 'next';
import Layout from '@/app/components/Layout';

export const metadata: Metadata = {
  title: 'Blogs | State of Solana',
  description: 'Explore insights, development updates, research, and cultural content from the Solana ecosystem',
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </Layout>
  );
} 