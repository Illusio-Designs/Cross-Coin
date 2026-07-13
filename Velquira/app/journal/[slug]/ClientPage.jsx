'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Share2, Link2, Twitter } from 'lucide-react'
import { getPost, getPosts } from '@/lib/api/blog'
import { richHtml } from '@/lib/sanitizeHtml'
import SeoWrapper from '@/components/SeoWrapper'
import { BlogCard } from '@/components/home/BlogCard'

function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function BlogPostPage({ initialPost = null }) {
  const { slug } = useParams()
  const [post, setPost] = useState(initialPost)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(!initialPost)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    window.scrollTo(0, 0)
    Promise.all([
      getPost(slug).catch(() => null),
      getPosts().catch(() => []),
    ])
      .then(([p, all]) => {
        setPost(p)
        setRelated((all || []).filter((r) => r.slug !== slug).slice(0, 3))
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-beige pt-28 pb-24 md:pt-32">
        <div className="vq-container">
          <div className="aspect-[16/7] w-full animate-pulse rounded-3xl bg-cream" />
          <div className="mx-auto mt-14 max-w-[70ch] space-y-5">
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-cream" />
            <div className="h-10 w-4/5 animate-pulse rounded-lg bg-cream" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-cream" />
            <div className="space-y-3 pt-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 animate-pulse rounded-full bg-cream/70 ${
                    i % 4 === 3 ? 'w-2/3' : 'w-full'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-beige">
        <div className="vq-container">
          <section className="mx-auto flex max-w-md flex-col items-center gap-6 py-40 text-center">
            <span className="vq-diamond" aria-hidden />
            <h1 className="vq-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-tight text-ink">
              We could not find that story
            </h1>
            <p className="text-[14px] leading-relaxed text-text-muted">
              The link may be old, or the story may have been moved.
            </p>
            <Link
              href="/journal"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
            >
              <ArrowLeft size={13} strokeWidth={1.8} /> Back to Journal
            </Link>
          </section>
        </div>
      </main>
    )
  }

  const handleNativeShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: post.title, url: window.location.href })
        .catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const tweetHref =
    typeof window !== 'undefined'
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          post.title
        )}&url=${encodeURIComponent(window.location.href)}`
      : '#'

  const date = formatDate(post.publishedAt || post.createdAt)
  const authorName = post.author?.name || 'The Velquira Studio'

  return (
    <SeoWrapper pageName={slug || 'blog-details'} seoData={post?.seo || null}>
      <main className="relative bg-beige pb-4">
        {/* ── Hero image ───────────────────────────────────────────────── */}
        {post.coverImage && (
          <section className="pt-24 md:pt-28">
            <div className="vq-container">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-cream md:aspect-[21/9]">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Article ──────────────────────────────────────────────────── */}
        <section className={post.coverImage ? 'pt-14 md:pt-20' : 'pt-28 md:pt-32'}>
          <div className="vq-container">
            <article className="mx-auto max-w-[70ch]">
              <Link
                href="/journal"
                className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted transition-colors hover:text-gold"
              >
                <ArrowLeft size={12} strokeWidth={1.8} /> Back to Journal
              </Link>

              {post.category && (
                <p className="mt-10 text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
                  {post.category}
                </p>
              )}

              <h1 className="vq-display mt-4 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-ink">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted">
                {date && <span>{date}</span>}
                {date && authorName && (
                  <span className="vq-diamond" aria-hidden />
                )}
                {authorName && <span>{authorName}</span>}
                {post.readTime && (
                  <>
                    <span className="vq-diamond" aria-hidden />
                    <span>{post.readTime} min read</span>
                  </>
                )}
              </div>
              <span className="mt-6 block h-px w-full bg-line" aria-hidden />

              {/* Body */}
              <div
                className="blog-content mt-12"
                {...richHtml(post.body || `<p>${post.excerpt || ''}</p>`)}
              />

              {/* Share */}
              <span className="mt-16 block h-px w-full bg-line" aria-hidden />

              <div className="mt-10 flex flex-col gap-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
                  Share this story
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    <Share2 size={12} strokeWidth={1.8} />
                    Share
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    <Link2 size={12} strokeWidth={1.8} />
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={tweetHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-ink transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    <Twitter size={12} strokeWidth={1.8} />
                    Tweet
                  </a>
                </div>

                {post.tags?.length > 0 && (
                  <p className="text-[12px] text-text-faint">
                    {post.tags.slice(0, 4).join(' · ')}
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>

        {/* ── More from the Journal ────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="vq-section">
            <div className="vq-container">
              <div className="mb-12 md:mb-16">
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
                  Keep Reading
                </p>
                <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
                  More from the Journal <span className="text-gold">✦</span>
                </h2>
                <span
                  className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent"
                  aria-hidden
                />
              </div>

              <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <BlogCard key={p.id || p.slug} post={p} />
                ))}
              </div>

              <div className="mt-16">
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
                >
                  <ArrowLeft size={12} strokeWidth={1.8} /> Back to Journal
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </SeoWrapper>
  )
}
