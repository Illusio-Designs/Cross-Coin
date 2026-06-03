'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, Link2, Twitter } from 'lucide-react'
import { getPost, getPosts } from '@/lib/api/blog'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'
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

export default function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
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
      <main className="min-h-screen bg-ivory px-6 pt-32 pb-20">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-3 w-20 animate-pulse bg-cream" />
          <div className="h-12 w-3/4 animate-pulse bg-cream" />
          <div className="h-3 w-1/2 animate-pulse bg-cream" />
          <div className="mt-10 aspect-[16/9] w-full animate-pulse bg-cream" />
          <div className="space-y-3 pt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 animate-pulse bg-cream/70 ${
                  i % 4 === 3 ? 'w-2/3' : 'w-full'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-ivory">
        <section className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-32 text-center">
          <span className="h-px w-12 bg-gold/60" aria-hidden />
          <p className="font-display text-2xl italic text-brand-black">
            That entry is not in the journal.
          </p>
          <Link
            href="/journal"
            className="mt-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold underline-offset-4 hover:text-gold-deep"
          >
            <ArrowLeft size={13} strokeWidth={1.6} /> Lustre
          </Link>
        </section>
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
  const authorName = post.author?.name || 'The Velquira Atelier'

  return (
    <SeoWrapper pageName={slug || 'blog-details'} seoData={post?.seo || null}>
      <main className="relative bg-ivory">
        {/* Back link */}
        <section className="px-6 pt-24 md:pt-32">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <Link
                href="/journal"
                className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:text-gold-deep"
              >
                <ArrowLeft size={13} strokeWidth={1.6} /> Lustre
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Article opening */}
        <section className="px-6 pt-8 pb-12 text-center md:pb-14">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                {post.category || 'Journal Entry'}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="mt-5 font-display text-4xl font-normal leading-[1.08] text-brand-black md:text-6xl">
                {post.title}
              </h1>
            </Reveal>

            <Reveal delay={0.18}>
              <p className="mt-6 font-display text-sm italic text-brand-black/55">
                By {authorName}
                {date && <> · {date}</>}
                {post.readTime && <> · {post.readTime} min read</>}
              </p>
            </Reveal>

            <Reveal delay={0.26}>
              <div className="mx-auto mt-7 h-px w-12 bg-gold/60" aria-hidden />
            </Reveal>
          </div>
        </section>

        {/* Cover image — clean, no frame, no overlay */}
        {post.coverImage && (
          <section className="px-6 pb-12 md:px-12 md:pb-16">
            <Reveal y={20}>
              <div className="mx-auto max-w-4xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Reveal>
          </section>
        )}

        {/* Article body */}
        <section className="px-6 md:px-12">
          <div className="mx-auto max-w-2xl py-10 md:py-14">
            <Reveal delay={0.05}>
              <div
                className="font-sans text-[15px] leading-[1.85] text-brand-black/80
                  first-letter:font-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:text-gold first-letter:leading-[0.85]
                  [&_p]:mb-5
                  [&_h2]:font-display [&_h2]:text-3xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-brand-black [&_h2]:leading-snug
                  [&_h3]:font-display [&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-brand-black [&_h3]:leading-snug
                  [&_h4]:font-display [&_h4]:text-xl [&_h4]:mt-8 [&_h4]:mb-3 [&_h4]:text-brand-black
                  [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-gold-deep
                  [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-gold/50 [&_blockquote]:pl-6 [&_blockquote]:font-display [&_blockquote]:text-xl [&_blockquote]:italic [&_blockquote]:text-brand-black/75
                  [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
                  [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
                  [&_li]:text-brand-black/80
                  [&_img]:my-8 [&_img]:rounded-md
                  [&_strong]:text-brand-black [&_strong]:font-medium
                  [&_em]:italic"
                dangerouslySetInnerHTML={{
                  __html: post.body || `<p>${post.excerpt || ''}</p>`,
                }}
              />
            </Reveal>

            {/* Footer rule + share */}
            <Reveal delay={0.1}>
              <div className="mx-auto mt-14 h-px w-12 bg-gold/40" aria-hidden />

              <div className="mt-10 flex flex-col items-center gap-5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                  Share this entry
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-brand-black transition-colors hover:border-gold hover:text-gold"
                  >
                    <Share2 size={12} strokeWidth={1.6} />
                    Share
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-brand-black transition-colors hover:border-gold hover:text-gold"
                  >
                    <Link2 size={12} strokeWidth={1.6} />
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={tweetHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-brand-black transition-colors hover:border-gold hover:text-gold"
                  >
                    <Twitter size={12} strokeWidth={1.6} />
                    Tweet
                  </a>
                </div>

                {post.tags?.length > 0 && (
                  <p className="mt-2 font-display text-xs italic text-brand-black/55">
                    {post.tags.slice(0, 4).join(' · ')}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* More from Lustre */}
        {related.length > 0 && (
          <section className="border-t border-gold/15 px-6 py-20 md:px-12 md:py-24">
            <Reveal>
              <div className="mb-12 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                  Lustre
                </p>
                <h2 className="mt-4 font-display text-3xl font-normal text-brand-black md:text-4xl">
                  More from Lustre
                </h2>
                <div className="mx-auto mt-6 h-px w-12 bg-gold/60" aria-hidden />
              </div>
            </Reveal>
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id || p.slug} delay={i * 0.08}>
                  <BlogCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </main>
    </SeoWrapper>
  )
}