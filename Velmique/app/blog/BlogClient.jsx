'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, User } from 'lucide-react';
import { getBlogPage } from '@/lib/api/blog';
import PageHeader from '@/components/layout/PageHeader';
import SeoWrapper from '@/components/SeoWrapper';
import Pagination from '@/components/common/Pagination';

const LIMIT = 12;

// Blog card images: request a pre-cropped 16:9 (800x450) frame from ImageKit for
// uniform, sharp, lightweight cards. Non-ImageKit sources pass through unchanged.
const blogCardImg = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('ik.imagekit.io')) return url;
  return `${url.split('?')[0]}?tr=w-800,h-450,q-70,f-auto`;
};

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}

export default function BlogClient() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (nextPage) => {
    setLoading(true);
    try {
      const res = await getBlogPage({ page: nextPage, limit: LIMIT });
      setPosts(res.posts);
      setTotalPages(res.totalPages);
      setPage(nextPage);
    } catch {
      if (nextPage === 1) setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (n) => {
    if (n < 1 || n > totalPages || n === page || loading) return;
    load(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [featured, ...rest] = posts;

  return (
    <SeoWrapper pageName="blog">
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Stories & Notes"
        title="THE VELMIQUE"
        accent="JOURNAL"
        intro="Dispatches from the world of perfumery — note essays, maison stories and editorial features."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {loading ? (
          <>
            <div className="h-[60vh] min-h-[420px] bg-[var(--surface-2)] animate-pulse mb-14" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-[var(--border)] overflow-hidden">
                  <div className="aspect-[16/9] bg-[var(--surface-2)] animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
                    <div className="h-6 w-3/4 rounded bg-[var(--surface-2)] animate-pulse" />
                    <div className="h-3 w-full rounded bg-[var(--surface-2)] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : posts.length === 0 ? (
          <p className="py-20 text-center text-sm font-body text-[var(--ink-muted)]">
            No journal entries yet. Check back soon.
          </p>
        ) : (
          <>
            {/* All posts — one uniform overlay grid, every card identical */}
            {posts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`}
                    className="group relative block overflow-hidden" style={{ aspectRatio: '4/5' }}>
                    <div className="absolute inset-0 bg-[var(--surface-2)]">
                      <img src={blogCardImg(post.coverImage)} alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    {post.category && (
                      <span className="absolute top-4 left-4 z-20 bg-white text-[var(--ink)] px-3 py-2 text-[8px] tracking-[0.2em] uppercase font-body">{post.category}</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(17,16,14,0.82)] via-[rgba(17,16,14,0.12)] to-transparent z-10" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                      <div className="flex items-center gap-2 text-white/70 text-[11px] font-body">
                        <span>{post.author?.name}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} min</span>
                      </div>
                      <h3 className="font-serif text-white leading-[1.12] mt-2 mb-4" style={{ fontSize: 'clamp(1.3rem, 2vw, 1.6rem)' }}>
                        {post.title}
                      </h3>
                      <span className="inline-flex items-center gap-2 text-white text-[9px] tracking-[0.2em] uppercase font-body border-b border-white/60 pb-1 transition-colors group-hover:border-[var(--gold-light)] group-hover:text-[var(--gold-light)]">
                        Read article <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
      </div>
    </div>
    </SeoWrapper>
  );
}
