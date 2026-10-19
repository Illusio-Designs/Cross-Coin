import { Suspense } from 'react';
import { pageMeta } from '@/lib/site';
import SearchClient from './SearchClient';

// Result pages are thin, query-driven views — keep them out of the index.
export const metadata = pageMeta({
  title: 'Search — Velmique Maison de Parfum',
  description: 'Search VELMIQUE fragrances by name, note or collection.',
  path: '/search',
  noindex: true,
});

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="m-wrap m-ph"><span className="m-eyebrow">Search</span><h1>Find Your Scent.</h1></div>}>
      <SearchClient />
    </Suspense>
  );
}
