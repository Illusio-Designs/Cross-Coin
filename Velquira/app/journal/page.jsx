'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPosts } from '@/lib/api/blog'
import { PageHero } from '@/components/layout/PageHero'
import SeoWrapper from '@/components/SeoWrapper'
import { BlogCard } from '@/components/home/BlogCard'

function formatDate(str) {
  try {
    return new Date(str)
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase()
  } catch {
    return ''
  }
}

export default function JournalPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  const featured = posts[0] || null
  const rest = posts.slice(1)

  return (
    <SeoWrapper pageName="blog">
      <main className="relative bg-beige">
        <PageHero
          variant="editorial"
          eyebrow="Journal"
          title="From the"
          titleAccent="Journal"
          description="Stories about our jewellery and how it's made."
        />

        {loading ? (
          <section className="vq-section">
            <div className="vq-container">
              {/* Featured skeleton */}
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-cream" />
                <div className="space-y-4">
                  <div className="h-2.5 w-28 animate-pulse rounded-full bg-cream" />
                  <div className="h-8 w-5/6 animate-pulse rounded-lg bg-cream" />
                  <div className="h-8 w-2/3 animate-pulse rounded-lg bg-cream" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-cream/70" />
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-cream/70" />
                </div>
              </div>

              {/* Grid skeleton */}
              <div className="mt-24 grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-cream" />
                    <div className="space-y-3 pt-5">
                      <div className="h-2.5 w-24 animate-pulse rounded-full bg-cream" />
                      <div className="h-5 w-5/6 animate-pulse rounded-md bg-cream" />
                      <div className="h-3 w-full animate-pulse rounded-full bg-cream/70" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-cream/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : posts.length === 0 ? (
          <section className="vq-section">
            <div className="vq-container">
              <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
                <span className="vq-diamond" aria-hidden />
                <h2 className="vq-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight text-ink">
                  No stories yet
                </h2>
                <p className="text-[14px] leading-relaxed text-text-muted">
                  We are writing the first ones now. Check back soon.
                </p>
                <Link
                  href="/products"
                  className="mt-2 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black"
                >
                  Shop Products
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ── Featured story ─────────────────────────────────────────── */}
            {featured && (
              <section className="vq-section pb-0">
                <div className="vq-container">
                  <div className="mb-12 md:mb-16">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
                      Latest Story
                    </p>
                    <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
                      Fresh from the Studio <span className="text-gold">✦</span>
                    </h2>
                    <span
                      className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent"
                      aria-hidden
                    />
                  </div>

                  <Link
                    href={`/journal/${featured.slug}`}
                    className="group grid grid-cols-1 items-center gap-10 focus-visible:outline-none lg:grid-cols-2 lg:gap-16"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream">
                      {featured.coverImage ? (
                        <Image
                          src={featured.coverImage}
                          alt={featured.title}
                          fill
                          priority
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="h-full w-full bg-cream" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
                        {featured.category && <span>{featured.category}</span>}
                        {featured.category &&
                          (featured.publishedAt || featured.createdAt) && (
                            <span className="h-px w-4 bg-gold/40" aria-hidden />
                          )}
                        {(featured.publishedAt || featured.createdAt) && (
                          <span>
                            {formatDate(
                              featured.publishedAt || featured.createdAt
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="vq-display mt-5 text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] tracking-[-0.02em] text-ink transition-colors duration-300 group-hover:text-gold-deep">
                        {featured.title}
                      </h3>

                      {featured.excerpt && (
                        <p className="mt-6 max-w-xl text-[15px] leading-[1.85] text-text-muted">
                          {featured.excerpt}
                        </p>
                      )}

                      <span className="mt-8 inline-flex items-center gap-2 border-b border-ink/25 pb-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-ink transition-colors duration-300 group-hover:border-gold">
                        Read Story
                        <ArrowRight
                          size={12}
                          strokeWidth={1.8}
                          className="text-gold transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* ── All other stories ──────────────────────────────────────── */}
            {rest.length > 0 && (
              <section className="vq-section">
                <div className="vq-container">
                  <div className="mb-12 md:mb-16">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">
                      All Stories
                    </p>
                    <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
                      More to Read <span className="text-gold">✦</span>
                    </h2>
                    <span
                      className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent"
                      aria-hidden
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((post) => (
                      <BlogCard key={post.id || post.slug} post={post} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </SeoWrapper>
  )
}
