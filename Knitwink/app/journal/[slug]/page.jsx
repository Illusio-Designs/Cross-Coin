'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, User } from 'lucide-react'
import { getPost, getPosts } from '@/lib/api/blog'

function formatDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}

export default function BlogPostPage() {
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
      setRelated(all.filter((r) => r.slug !== slug).slice(0, 3))
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <section className="bg-white px-6 py-12">
      <div className="space-y-4">
        <div className="h-3 w-20 animate-pulse rounded-full bg-gray-100" />
        <div className="h-8 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-100" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-3 animate-pulse rounded bg-gray-100 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </section>
  )

  if (!post) return (
    <section className="bg-white px-6 py-20 text-center">
      <p className="text-gray-400">Post not found.</p>
      <Link href="/journal" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-black underline underline-offset-4">
        <ArrowLeft size={14} /> Back to Journal
      </Link>
    </section>
  )

  return (
    <>
      {/* Hero cover — full width */}
      {post.coverImage && (
        <section className="">
          <img src={post.coverImage} alt={post.title} className="h-auto w-full object-cover" />
        </section>
      )}

      {/* Article body — full width with padding only */}
      <section className="bg-white px-6 py-10 md:px-10 lg:px-16">

        {/* Back */}
        <Link href="/journal" className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-brand-black">
          <ArrowLeft size={13} /> Back to Journal
        </Link>

        {/* Category + Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {post.category && (
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {post.category}
            </span>
          )}
          {post.tags?.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-lg border border-gray-200 px-3 py-1 text-[10px] font-medium text-gray-500">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl font-normal leading-tight text-brand-black md:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><User size={12} />{post.author.name}</span>
          <span className="flex items-center gap-1.5"><Calendar size={12} />{formatDate(post.publishedAt)}</span>
          <span className="flex items-center gap-1.5"><Clock size={12} />{post.readTime} min read</span>
        </div>

        {/* Excerpt lead */}
        {post.excerpt && (
          <p className="my-8 border-l-4 border-brand-black pl-5 text-lg font-light leading-relaxed text-gray-500">
            {post.excerpt}
          </p>
        )}

        {/* Body — full width */}
        <div
          className="[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-brand-black [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-brand-black [&_p]:mb-5 [&_p]:text-base [&_p]:leading-[1.85] [&_p]:text-gray-700 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_li]:text-gray-700 [&_strong]:font-semibold [&_strong]:text-brand-black"
          dangerouslySetInnerHTML={{ __html: post.body || `<p>${post.excerpt}</p>` }}
        />

        {/* Author card */}
        <div className="mt-10 flex items-center gap-4 rounded-2xl bg-gray-50 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-black text-sm font-semibold text-white">
            {post.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-black">{post.author.name}</p>
            <p className="text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
          </div>
        </div>
      </section>

      {/* Related — full width with padding */}
      {related.length > 0 && (
        <section className="bg-off-white px-6 py-10 md:px-10 lg:px-16">
          <h2 className="mb-6 font-display text-2xl font-normal text-brand-black">More from the Journal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <Link key={p.id} href={`/journal/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative overflow-hidden rounded-t-2xl">
                  {p.coverImage
                    ? <img src={p.coverImage} alt={p.title} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="h-40 w-full bg-gray-100" />
                  }
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-brand-black backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Blog
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h3 className="text-sm font-bold leading-snug text-brand-black line-clamp-2 group-hover:text-gray-500">{p.title}</h3>
                  <p className="text-xs text-gray-400">{formatDate(p.publishedAt)} · {p.readTime} min read</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
