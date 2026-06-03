'use client'

import { useEffect, useState } from 'react'
import { getPosts } from '@/lib/api/blog'
import SeoWrapper from '@/components/SeoWrapper'
import { Reveal } from '@/components/ui/Reveal'
import { BlogCard } from '@/components/home/BlogCard'

export default function JournalPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SeoWrapper pageName="blog">
      <main className="relative bg-ivory">
        {/* Editorial page header */}
        <section className="px-6 pt-24 pb-14 text-center md:pt-32 md:pb-16">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Lustre
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-4 font-display text-4xl font-normal leading-[1.05] text-brand-black md:text-5xl">
                From the Journal
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-brand-black/60">
                Studies on craft, character and the stories behind our pieces.
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="mx-auto mt-7 h-px w-12 bg-gold/60" aria-hidden />
            </Reveal>
          </div>
        </section>

        {/* Entries grid */}
        <section className="px-6 pb-28 md:px-12 lg:px-20">
          {loading ? (
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gold/15 bg-white p-3"
                >
                  <div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-cream" />
                  <div className="mt-4 space-y-2 px-1 pb-1">
                    <div className="h-2.5 w-24 animate-pulse bg-cream" />
                    <div className="h-4 w-5/6 animate-pulse bg-cream" />
                    <div className="h-3 w-full animate-pulse bg-cream/70" />
                    <div className="h-3 w-2/3 animate-pulse bg-cream/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Reveal>
              <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-24 text-center">
                <span className="h-px w-12 bg-gold/60" aria-hidden />
                <p className="font-display text-2xl italic text-brand-black">
                  Studies forthcoming. Watch this space.
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.id || post.slug} delay={i * 0.06}>
                  <BlogCard post={post} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>
    </SeoWrapper>
  )
}