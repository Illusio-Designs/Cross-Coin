import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import SearchClient from './SearchClient';
import { PageHeadSkeleton, SearchFormSkeleton, Sk } from '../_components/Skeleton';

// Result pages are thin, query-driven views — keep them out of the index.
export const metadata = pageMeta({
  title: 'Search — Velmique Maison de Parfum',
  description: 'Search VELMIQUE fragrances by name, note or collection.',
  path: '/search',
  noindex: true,
});

export default function SearchPage() {
  return (
    <Suspense fallback={(
      <PageHeadSkeleton eyebrow="Search" title="Find Your Scent." lede={false}>
        <SearchFormSkeleton />
        <Sk w={300} h={14} style={{ marginTop: 18 }} />
      </PageHeadSkeleton>
    )}>
      <SearchClient />
    </Suspense>
  );
}
