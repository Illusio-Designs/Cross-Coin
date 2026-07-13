'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'

/* ─────────────────────────────────────────────────────────────────────────
   Journal strip — standard section header + posts fetch + BlogCard grid.
   ──────────────────────────────────────────────────────────────────────── */
export function BlogStrip() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts().then((all) => setPosts(all.slice(0, 4))).catch(() => {})
  }, [])

  return (
    <section className="bg-cream vq-section">
      <div className="vq-container">
        {/* Section heading */}
        <div className="mb-12 md:mb-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Journal</p>
          <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
            From the Journal <span className="text-gold">✦</span>
          </h2>
          <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
        </div>

        {/* View All — top-right of the cards area */}
        <div className="mb-10 flex justify-end">
          <Link
            href="/journal"
            className="group/all inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-gold"
          >
            View All
            <span
              aria-hidden
              className="inline-block transition-transform duration-500 ease-out group-hover/all:translate-x-1"
            >
              →
            </span>
            <span
              aria-hidden
              className="ml-1 inline-block h-px w-0 origin-left bg-gold transition-all duration-500 ease-out group-hover/all:w-10"
            />
          </Link>
        </div>

        {/* 4 cards — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 gap-5 md:gap-6 lg:grid-cols-4">
          {posts.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col bg-cream">
                  <div className="aspect-[3/4] animate-pulse border border-line bg-paper" />
                  <div className="flex flex-col gap-2 pt-4">
                    <div className="h-3 w-1/2 animate-pulse bg-paper" />
                    <div className="h-4 w-3/4 animate-pulse bg-paper" />
                    <div className="h-3 w-full animate-pulse bg-paper" />
                  </div>
                </div>
              ))
            : posts.map((post) => <BlogCard key={post.slug} post={post} />)}
        </div>
      </div>
    </section>
  )
}