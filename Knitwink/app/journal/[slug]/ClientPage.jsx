'use client'

// Client subtree of /journal/[slug]. The route file (page.jsx) is a
// server component that owns generateMetadata + JSON-LD; this file
// owns the interactive state (related posts, share, sidebar).

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Share2 } from 'lucide-react'
import { getPost, getPosts } from '@/lib/api/blog'
import { BlogCard } from '@/components/home/BlogCard'
import SeoWrapper from '@/components/SeoWrapper'
import { richHtml } from '@/lib/sanitizeHtml'

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}

export default function JournalDetailClient() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    window.scrollTo(0, 0)
    Promise.all([
      getPost(slug).catch(() => null),
      getPosts().catch(() => []),
    ]).then(([p, all]) => {
      setPost(p)
      setRelated(all.filter((r) => r.slug !== slug).slice(0, 4))
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-site grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-8 w-4/5 animate-pulse rounded bg-gray-100" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-3 animate-pulse rounded bg-gray-100 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="h-60 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  )

  if (!post) return (
    <div className="px-6 py-20 text-center">
      <p className="text-gray-400">Post not found.</p>
      <Link href="/journal" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-black underline underline-offset-4">
        <ArrowLeft size={14} /> Back to Journal
      </Link>
    </div>
  )

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post.title, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // JSON-LD: BlogPosting + BreadcrumbList. Google reads JSON-LD even
  // when emitted by client components (the modern crawler runs JS).
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com'
  const postingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: post.author?.name
      ? { '@type': 'Person', name: post.author.name }
      : { '@type': 'Organization', name: 'Knitwink' },
    publisher: {
      '@type': 'Organization',
      name: 'Knitwink',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/knitwinklogo.webp` },
    },
    description: post.excerpt || '',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/journal/${slug}` },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: `${siteUrl}/journal` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}/journal/${slug}` },
    ],
  }

  return (
    <SeoWrapper pageName={slug || 'blog-details'} seoData={post?.seo || null}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postingLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Cover image — full width, tall */}
      {post.coverImage && (
        <section className="bg-gray-50">
          <img src={post.coverImage} alt={post.title} className="h-auto w-full object-cover" />
        </section>
      )}

      {/* Main content — article left, sidebar right (sticky) */}
      <div className="px-4 py-8 sm:px-5 sm:py-10 md:px-8 lg:px-10">
        <div className="mx-auto max-w-site grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">

          {/* LEFT — article */}
          <div>
            {/* Back link */}
            <Link href="/journal" className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-brand-black">
              <ArrowLeft size={13} /> Back to Journal
            </Link>

            {/* Title */}
            <h1 className="text-xl font-bold leading-snug text-brand-black sm:text-2xl md:text-3xl">
              {post.title}
            </h1>

            {/* Mobile meta — visible only on small screens */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400 lg:hidden">
              <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(post.publishedAt)}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {post.readTime} min read</span>
              {post.author?.name && <span className="flex items-center gap-1"><User size={11} /> {post.author.name}</span>}
            </div>

            {/* Excerpt as lead */}
            {post.excerpt && (
              <p className="mt-6 border-l-3 border-brand-black pl-4 text-base leading-relaxed text-gray-500 italic text-justify sm:pl-5 sm:text-lg">
                {post.excerpt}
              </p>
            )}

            {/* Body */}
            <div
              className="mt-8 blog-content"
              {...richHtml(post.body || `<p>${post.excerpt || ''}</p>`)}
            />
          </div>

          {/* RIGHT — sidebar (sticky) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[120px] flex flex-col gap-6">

              {/* Author card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-black text-sm font-bold text-white">
                    {post.author?.name?.charAt(0)?.toUpperCase() || 'K'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-black">{post.author?.name || 'Knitwink'}</p>
                    <p className="text-[10px] text-gray-400">Author</p>
                  </div>
                </div>
              </div>

              {/* Date + Read time */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-gray-500">
                    <Calendar size={13} className="text-gray-400" />
                    {formatDate(post.publishedAt)}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-500">
                    <Clock size={13} className="text-gray-400" />
                    {post.readTime} min read
                  </div>
                </div>
              </div>

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-medium text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-xs font-semibold uppercase tracking-wider text-brand-black transition-colors hover:bg-brand-black hover:text-white"
              >
                <Share2 size={13} />
                Share Article
              </button>

              {/* Category */}
              {post.category && (
                <div className="rounded-2xl bg-brand-black p-5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40">Category</p>
                  <p className="mt-1 text-sm font-semibold text-white">{post.category}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Related posts — 4 columns using BlogCard */}
      {related.length > 0 && (
        <div className="bg-off-white px-4 py-10 sm:px-5 md:px-8">
          <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
            More from the Journal
          </p>
          <div className="mx-auto max-w-site grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <BlogCard key={p.id} post={p} />)}
          </div>
        </div>
      )}
    </SeoWrapper>
  )
}
