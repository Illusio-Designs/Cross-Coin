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
            <div className="h-[60vh] min-h-[420px] rounded-2xl bg-[var(--surface-2)] animate-pulse mb-14" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
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
            {/* Featured */}
            <Link href={`/blog/${featured.slug}`} className="group block mb-14">
              <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl">
                <img src={featured.coverImage} alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/30 to-transparent" />
                {featured.category && (
                  <div className="absolute top-6 left-6">
                    <span className="inline-block bg-white text-[var(--ink)] text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 font-body rounded-full">
                      {featured.category}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <h2 className="font-display text-white uppercase leading-[0.95] tracking-tight max-w-3xl"
                    style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                    {featured.title}
                  </h2>
                  <p className="text-white/80 font-body text-base mt-4 max-w-2xl">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 text-white/60 text-xs font-body mt-5">
                    <span className="flex items-center gap-1.5"><User size={11} /> {featured.author?.name}</span>
                    <span>{formatDate(featured.publishedAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock size={11} /> {featured.readTime} min read</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Rest of posts */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rest.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`}
                    className="group bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--gold)] transition-colors">
                    <div className="aspect-[16/9] overflow-hidden bg-[var(--surface-2)]">
                      <img src={blogCardImg(post.coverImage)} alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="p-6">
                      {post.category && (
                        <span className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body">{post.category}</span>
                      )}
                      <h3 className="font-serif italic text-[var(--ink)] text-2xl mt-2 mb-3 group-hover:text-[var(--gold-deep)] transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-[var(--ink-soft)] text-sm font-body leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--ink-muted)] text-xs font-body">
                          <span>{post.author?.name}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} min</span>
                        </div>
                        <ArrowUpRight size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--gold-deep)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                      </div>
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
