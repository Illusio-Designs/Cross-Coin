import { BlogGridSkeleton } from '@/components/ui/Skeleton';

export default function JournalLoading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Journal</span>
        <h1>Notes &amp; know-how</h1>
        <p>Guides on sizing, care and life in motion — everything to get the most from your socks.</p>
      </div>
      <BlogGridSkeleton count={6} style={{ marginTop: 26 }} />
    </div>
  );
}
