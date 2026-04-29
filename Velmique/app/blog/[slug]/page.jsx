'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, User, Calendar, ArrowUpRight, ChevronRight } from 'lucide-react';
import { getPost, getPosts } from '@/lib/api/blog';

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    window.scrollTo(0, 0);
    Promise.all([
      getPost(slug).catch(() => null),
      getPosts().catch(() => []),
    ]).then(([p, all]) => {
      setPost(p);
      setRelated(all.filter(r => r.slug !== slug).slice(0, 4));
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-[var(--bg)] min-h-screen">
        <div className="relative h-[70vh] min-h-[480px] bg-[var(--surface-2)] animate-pulse" />
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-3 rounded bg-[var(--surface-2)] animate-pulse ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-32 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
            <div className="h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[var(--bg)] min-h-screen pt-32 pb-20 text-center">
        <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">Post not found</p>
        <Link href="/blog" className="pill-cta mt-8 inline-flex"><ArrowLeft size={12} /> Back to Journal</Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] min-h-screen">

      {/* ═══════════════ FULL-WIDTH HERO ═══════════════ */}
      <section className="relative w-full">
        <div className="relative w-full h-[75vh] min-h-[520px] max-h-[820px] overflow-hidden bg-[var(--ink)]">
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--ink)] to-[var(--surface-2)]" />
          )}
          {/* Tonal scrim — top fade for breadcrumb, deeper bottom for headline */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/60 via-[var(--ink)]/15 to-[var(--ink)]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/70 via-transparent to-transparent" />

          {/* Top — breadcrumb */}
          <div className="absolute top-0 left-0 right-0">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pt-8 flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-body text-white/70">
              <Link href="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
              <ChevronRight size={10} />
              <Link href="/blog" className="hover:text-[var(--gold)] transition-colors">Journal</Link>
              <ChevronRight size={10} />
              <span className="text-white truncate max-w-[40ch] normal-case tracking-normal text-xs">{post.title}</span>
            </div>
          </div>

          {/* Bottom — title block */}
          <div className="absolute bottom-0 left-0 right-0 pb-12 md:pb-20">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
              <div className="max-w-4xl">
                {post.category && (
                  <span className="inline-block bg-[var(--gold)] text-[var(--ink)] text-[10px] tracking-[0.4em] uppercase px-4 py-2 font-body rounded-full mb-6">
                    {post.category}
                  </span>
                )}
                <h1 className="font-display text-white uppercase leading-[0.95] tracking-tight mb-6"
                  style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5.5rem)' }}>
                  {post.title}
                </h1>
                <div className="flex items-center gap-5 text-white/75 text-xs font-body flex-wrap">
                  {post.author?.name && (
                    <span className="flex items-center gap-1.5"><User size={12} className="text-[var(--gold)]" /> {post.author.name}</span>
                  )}
                  <span className="w-px h-3 bg-white/30 hidden sm:block" />
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(post.publishedAt)}</span>
                  <span className="w-px h-3 bg-white/30 hidden sm:block" />
                  <span className="flex items-center gap-1.5"><Clock size={12} /> {post.readTime} min read</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ ARTICLE BODY ═══════════════ */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24">

        {/* Back link */}
        <Link href="/blog"
          className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--gold-deep)] transition-colors text-[10px] tracking-[0.3em] uppercase font-body mb-12">
          <ArrowLeft size={12} /> Back to Journal
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

          {/* LEFT — article */}
          <article className="lg:col-span-8">

            {/* Lead / excerpt */}
            {post.excerpt && (
              <p className="border-l-2 border-[var(--gold)] pl-6 md:pl-8 text-[var(--ink)] font-serif italic text-xl md:text-2xl leading-[1.55] mb-12">
                {post.excerpt}
              </p>
            )}

            {/* Body */}
            <div
              className="prose-velmique text-[var(--ink-soft)] font-body text-lg leading-[1.9] space-y-6 text-justify hyphens-auto"
              style={{ ['--prose-h2-color']: 'var(--ink)' }}
              dangerouslySetInnerHTML={{ __html: post.body || `<p>${post.excerpt || ''}</p>` }}
            />

          </article>

          {/* RIGHT — sticky sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 flex flex-col gap-5">

              {/* Author card */}
              {post.author?.name && (
                <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
                  <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-4">The Author</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center font-serif italic text-[var(--gold-deep)] text-xl shrink-0">
                      {post.author.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif italic text-[var(--ink)] text-lg leading-tight truncate">{post.author.name}</p>
                      <p className="text-[var(--ink-muted)] text-[10px] font-body tracking-[0.15em] uppercase mt-0.5">Velmique Editorial</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta card */}
              <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-4">Article Notes</p>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 text-[var(--ink-soft)] text-sm font-body">
                    <Calendar size={14} className="text-[var(--gold-deep)] shrink-0" />
                    <span>{formatDate(post.publishedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--ink-soft)] text-sm font-body">
                    <Clock size={14} className="text-[var(--gold-deep)] shrink-0" />
                    <span>{post.readTime} min read</span>
                  </div>
                  {post.category && (
                    <div className="flex items-center gap-3 text-[var(--ink-soft)] text-sm font-body">
                      <span className="w-3.5 h-3.5 rounded-full bg-[var(--gold)] shrink-0" />
                      <span>{post.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags (sidebar) */}
              {post.tags?.length > 0 && (
                <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
                  <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.4em] uppercase font-body mb-4">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--ink-soft)] text-[10px] tracking-[0.2em] uppercase font-body">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ═══════════════ RELATED POSTS — full width ═══════════════ */}
      {related.length > 0 && (
        <section className="bg-[var(--surface)] border-t border-[var(--border)] py-20 md:py-28">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
            <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
              <div>
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Continue Reading</p>
                <h2 className="font-display text-[var(--ink)] uppercase leading-tight tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)' }}>
                  MORE FROM THE <em className="not-italic gold-text">JOURNAL</em>
                </h2>
              </div>
              <Link href="/blog" className="pill-cta pill-cta-light">
                View All <ArrowUpRight size={14} strokeWidth={1.6} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`}
                  className="group bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--gold)] transition-colors flex flex-col">
                  <div className="aspect-[4/5] overflow-hidden bg-[var(--surface-2)] relative">
                    {r.coverImage && (
                      <img src={r.coverImage} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                    {r.category && (
                      <span className="absolute top-4 left-4 inline-block bg-white text-[var(--ink)] text-[9px] tracking-[0.3em] uppercase px-3 py-1 font-body rounded-full">
                        {r.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-serif italic text-[var(--ink)] text-xl group-hover:text-[var(--gold-deep)] transition-colors leading-snug line-clamp-2">{r.title}</h3>
                    <p className="text-[var(--ink-soft)] text-xs font-body mt-2 line-clamp-2 leading-relaxed flex-1">{r.excerpt}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body">{formatDate(r.publishedAt)}</p>
                      <ArrowUpRight size={14} className="text-[var(--ink-muted)] group-hover:text-[var(--gold-deep)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
