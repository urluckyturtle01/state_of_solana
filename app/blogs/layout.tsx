import { Metadata } from 'next';
import { generateNextMetadata } from '../seo-metadata';
import Layout from '@/app/components/Layout';

export const metadata: Metadata = generateNextMetadata('/blogs');

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