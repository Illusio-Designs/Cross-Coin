'use client';

import { useEffect, useState } from 'react';
import BlogCard from '@/components/BlogCard';
import Pagination from '@/components/Pagination';
import { getBlogPage } from '@/lib/api';
import { BlogGridSkeleton } from '@/components/ui/Skeleton';

const LIMIT = 12;

export default function JournalClient() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBlogPage({ page, limit: LIMIT })
      .then((res) => {
        if (!active) return;
        setPosts(res.posts || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => { if (active) setPosts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const goToPage = (n) => {
    if (n < 1 || n > totalPages || n === page || loading) return;
    setPage(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!loading && posts.length === 0) {
    return <div className="empty" style={{ marginTop: 20 }}>No articles yet — check back soon.</div>;
  }

  // First load: card-shaped placeholders. Changing page keeps the current cards
  // (dimmed) until the next page arrives.
  if (loading && posts.length === 0) {
    return <BlogGridSkeleton count={6} style={{ marginTop: 26 }} />;
  }

  return (
    <>
      <div className={`sx-jr-grid${loading ? ' sk-dim' : ''}`} style={{ marginTop: 26 }} aria-busy={loading || undefined}>
        {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
    </>
  );
}
