'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPosts } from '@/lib/api/blog'
import { BlogCard } from './BlogCard'

/* ─────────────────────────────────────────────────────────────────────────
   Chapter VII — Lustre.
   Editorial chapter header + the existing posts fetch + BlogCard grid.
   Header re-skinned to the monograph style; cards left intact.
   ──────────────────────────────────────────────────────────────────────── */
export function BlogStrip() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts().then((all) => setPosts(all.slice(0, 4))).catch(() => {})
  }, [])

  return (
    <section className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-site">
        {/* Section heading — centred */}
        <div className="mb-14 flex flex-col items-center text-center md:mb-20">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
            Lustre
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-normal leading-tight tracking-tight text-brand-black md:text-5xl">
            From Lustre
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-brand-black/60">
            Notes from the atelier — craft, character, and the stories behind our pieces.
          </p>
          <span className="mt-6 inline-block h-px w-12 bg-gold/60" aria-hidden />
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
                <div key={i} className="flex flex-col bg-white">
                  <div className="aspect-[3/4] animate-pulse border border-gold/15 bg-cream" />
                  <div className="flex flex-col gap-2 pt-4">
                    <div className="h-3 w-1/2 animate-pulse bg-cream" />
                    <div className="h-4 w-3/4 animate-pulse bg-cream" />
                    <div className="h-3 w-full animate-pulse bg-cream" />
                  </div>
                </div>
              ))
            : posts.map((post) => <BlogCard key={post.slug} post={post} />)}
        </div>
      </div>
    </section>
  )
}