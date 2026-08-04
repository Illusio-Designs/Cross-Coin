'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { getBlogPage } from '@/lib/api';

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

  return (
    <>
      <div className="blog-grid" style={{ marginTop: 26 }}>
        {posts.map((p) => (
          <Link href={`/journal/${p.slug}`} className="blog-card" key={p.slug}>
            <div className="blog-media">
              {p.image
                ? <img src={p.image} alt={p.title} loading="lazy" />
                : <span aria-hidden><Icon name="Sparkles" size={40} /></span>}
            </div>
            <div className="blog-body">
              <div className="blog-meta"><span className="blog-cat">{p.category}</span>{p.date && <><span>·</span><span>{p.date}</span></>}</div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="blog-read">Read article <Icon name="ArrowRight" size={13} /></span>
            </div>
          </Link>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
    </>
  );
}
