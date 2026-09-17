import { notFound } from 'next/navigation';
import HeliumQueryApiCard from '@/app/components/apis/HeliumQueryApiCard';
import { listHeliumQueriesByGroup } from '@/lib/helium-queries/catalog';
import { HELIUM_API_GROUPS, type HeliumApiGroup } from '@/lib/helium-queries/types';

type PageProps = { params: { group: string } };

function baseUrlFromEnv(): string {
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  if (site) return site.replace(/\/$/, '');
  return '';
}

export function generateStaticParams() {
  return HELIUM_API_GROUPS.map((group) => ({ group }));
}

export default function HeliumApiGroupPage({ params }: PageProps) {
  const group = params.group as HeliumApiGroup;
  if (!HELIUM_API_GROUPS.includes(group)) {
    notFound();
  }

  const queries = listHeliumQueriesByGroup(group);
  const baseUrl = baseUrlFromEnv();

  return (
    <div className="w-full max-w-[1400px]">
      {queries.map((doc) => (
        <HeliumQueryApiCard key={doc.name} doc={doc} baseUrl={baseUrl} />
      ))}

      {queries.length === 0 && (
        <p className="text-sm text-gray-500">No queries in this group.</p>
      )}
    </div>
  );
}
