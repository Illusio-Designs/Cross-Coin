import SearchClient from './SearchClient';
import '@/app/styles/catalog.css';

export const metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = (sp.q || '').trim();
  return <SearchClient initialQuery={q} />;
}
